import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createServer } from "vite";

// Render the real screens with deterministic session/API state. These overrides
// exist only in this SSR check; the application and production build are unchanged.
const fixtureKey = "__uniplaceRenderCheck";
const originals = new Map(
  ["window", "localStorage", "fetch", fixtureKey].map((key) => [
    key,
    Object.getOwnPropertyDescriptor(globalThis, key),
  ]),
);
const server = await createServer({
  server: { middlewareMode: true, hmr: false, ws: false },
  plugins: [{
    name: "uniplace-render-check-fixtures",
    enforce: "pre",
    transform(source, id, options) {
      if (!options?.ssr) return;
      if (id.endsWith("/src/data/session.ts")) {
        assert.ok(source.includes("getSession, () => null"));
        return source.replace(
          "getSession, () => null",
          `getSession, () => globalThis.${fixtureKey}.session`,
        );
      }
      if (id.endsWith("/src/data/marketplace.ts")) {
        const declaration = "export function useMarketplace(userId: number | null) {";
        assert.ok(source.includes(declaration));
        return source.replace(
          declaration,
          `${declaration}\nreturn globalThis.${fixtureKey}.market;`,
        );
      }
    },
  }],
});

try {
  const { default: App } = await server.ssrLoadModule("/src/App.tsx");
  const { products } = await server.ssrLoadModule("/src/data/catalog.ts");
  const { getProductSeller } = await server.ssrLoadModule("/src/data/productDetails.ts");
  const { CHAT_STORAGE_KEY, initialConversations } =
    await server.ssrLoadModule("/src/data/chat.ts");
  const session = {
    access: "check-access", refresh: "check-refresh",
    user: { id: 1, name: "Aluno de teste", email: "aluno@ads.fiponline.edu.br" },
  };
  const fixtures = products.map((product) => {
    const seller = getProductSeller(product);
    return {
      ...product, sellerId: seller.id, seller,
      status: product.id === "guyton-fisiologia" ? "expired" : product.status ?? "active",
      updatedAt: "2026-11-11T10:00:00-03:00",
    };
  });
  const ownPosts = fixtures.filter((post) => post.sellerId === "matheus-fontes");
  const catalog = fixtures.filter((post) => post.status === "active");
  const reference = { categories: [], campuses: [], pickupLocations: [] };
  const storage = new Map();
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    value: {
      getItem: (key) => storage.get(key) ?? null,
      setItem: (key, value) => storage.set(key, value),
      removeItem: (key) => storage.delete(key),
    },
  });

  function render(path, options = {}) {
    globalThis.window = { location: new URL(path, "http://localhost") };
    storage.clear();
    storage.set("uniplace:favorites", JSON.stringify(options.favorites ?? []));
    for (const [key, value] of Object.entries(options.storage ?? {})) {
      storage.set(key, typeof value === "string" ? value : JSON.stringify(value));
    }
    globalThis[fixtureKey] = {
      session: Object.hasOwn(options, "session") ? options.session : session,
      market: {
        catalog, myPosts: ownPosts, reference, loaded: true, error: null,
        reload: async () => {}, savePost: async () => {},
        deletePost: async () => {}, setPostStatus: async () => {},
        ...options.market,
      },
    };
    return renderToStaticMarkup(createElement(App));
  }
  function activeNavigation(html) {
    return [...html.matchAll(/<a\b[^>]*aria-current="page"[^>]*>([\s\S]*?)<\/a>/g)]
      .map((match) => match[1].replace(/<[^>]*>/g, ""));
  }
  const cardCount = (html) => (html.match(/<article class="product-card/g) ?? []).length;

  // Every protected route must show the actual login form before authentication.
  for (const path of ["/", "/explorar", "/meus-anuncios", "/chat", "/anuncios/inexistente"]) {
    const login = render(path, { session: null });
    assert.match(login, /<h1 id="auth-title"/);
    assert.match(login, /type="email"/);
    assert.match(login, /autoComplete="current-password"/);
    assert.match(login, /<button[^>]*type="submit"/);
    assert.equal(cardCount(login), 0);
    assert.deepEqual(activeNavigation(login), []);
  }
  const loading = render("/", { market: { loaded: false } });
  assert.ok(loading.includes("Carregando anúncios..."));
  assert.equal(cardCount(loading), 0);
  const loadError = render("/", { market: { loaded: false, error: "API indisponível" } });
  assert.ok(loadError.includes("API indisponível"));
  assert.ok(loadError.includes("Tentar novamente"));

  const home = render("/");
  assert.deepEqual(activeNavigation(home), ["Início"]);
  assert.ok(home.includes("Tudo o que você precisa,"));
  assert.equal(cardCount(home), 5);
  const explore = render("/explorar");
  assert.deepEqual(activeNavigation(explore), ["Explorar Anúncios"]);
  assert.ok(explore.includes("Todos os Anúncios"));
  assert.equal(cardCount(explore), 8);
  assert.ok(!explore.includes("Ver anúncio: iPhone 13 128GB"));
  const category = render("/explorar?categoria=eletronicos");
  assert.equal(cardCount(category), 5);
  assert.ok(category.includes("Notebook Acer Aspire 5"));
  assert.equal(cardCount(render("/explorar?q=ERGONOMICA")), 1);
  const emptyCategory = render("/explorar?categoria=calcados");
  assert.equal(cardCount(emptyCategory), 0);
  assert.ok(emptyCategory.includes("Nenhum anúncio por aqui"));
  const favorite = render("/favoritos", { favorites: ["notebook-acer-aspire-5"] });
  assert.deepEqual(activeNavigation(favorite), ["Favoritos1"]);
  assert.equal(cardCount(favorite), 1);
  assert.ok(render("/favoritos").includes("Seus favoritos começam aqui"));

  const product = render("/anuncios/macbook-air-m1-8gb-256gb");
  assert.deepEqual(activeNavigation(product), ["Explorar Anúncios"]);
  assert.ok(product.includes('<h1 id="product-title">MacBook Air M1 8GB 256GB</h1>'));
  assert.ok(product.includes("Matheus Fontes"));
  assert.ok(product.includes("Apple M1"));
  assert.ok(product.includes("Ampliar foto 1 de 4"));
  assert.equal(cardCount(product), 4);
  const otherProduct = render("/anuncios/notebook-acer-aspire-5");
  assert.ok(otherProduct.includes("Lucas Almeida"));
  assert.ok(otherProduct.includes("Intel Core i5"));
  assert.ok(otherProduct.includes("Ampliar foto 1 de 1"));
  assert.ok(render("/anuncios/guyton-fisiologia").includes("Anúncio expirado"));
  // Sold listings belonging to somebody else are absent from the API catalog.
  assert.ok(render("/anuncios/iphone-13-128gb").includes("Anúncio não encontrado"));
  const seller = render("/explorar?vendedor=matheus-fontes");
  assert.ok(seller.includes("Anúncios de Matheus Fontes"));
  assert.equal(cardCount(seller), 5);
  for (const path of ["/anuncios/inexistente", "/anuncios/%E0%A4%A"]) {
    assert.ok(render(path).includes("Anúncio não encontrado"));
  }
  assert.ok(render("/explorar?vendedor=inexistente").includes("Vendedor não encontrado"));
  const managed = render("/meus-anuncios");
  assert.deepEqual(activeNavigation(managed), ["Meus Anúncios"]);
  assert.equal((managed.match(/<article class="owned-post-card"/g) ?? []).length, 6);
  assert.ok(managed.includes("Todos <span>(6)</span>"));
  assert.ok(managed.includes("Ativos <span>(5)</span>"));
  assert.ok(managed.includes("Expirados <span>(1)</span>"));
  assert.ok(render("/perfil").includes('<div class="my-posts-page">'));

  // Server updates replace the old account-localStorage demonstrations.
  const changed = ownPosts.map((post) => post.id === "macbook-air-m1-8gb-256gb"
    ? { ...post, title: "MacBook para estudos", price: 3700 } : post);
  const changedCatalog = catalog.filter((post) => post.sellerId !== "matheus-fontes");
  const updated = render("/anuncios/macbook-air-m1-8gb-256gb", {
    market: { myPosts: changed, catalog: [...changedCatalog, ...changed.filter((post) => post.status === "active")] },
  });
  assert.ok(updated.includes('<h1 id="product-title">MacBook para estudos</h1>'));
  assert.ok(updated.includes("3.700,00"));
  const deletedId = "macbook-air-m1-8gb-256gb";
  const deletedMarket = {
    myPosts: ownPosts.filter((post) => post.id !== deletedId),
    catalog: catalog.filter((post) => post.id !== deletedId),
  };
  assert.ok(render(`/anuncios/${deletedId}`, { market: deletedMarket }).includes("Anúncio não encontrado"));
  assert.equal(cardCount(render("/favoritos", { favorites: [deletedId], market: deletedMarket })), 0);

  const inbox = render("/chat");
  assert.deepEqual(activeNavigation(inbox), ["Chat"]);
  assert.ok(inbox.includes("Selecione uma conversa"));
  assert.equal((inbox.match(/class="chat-conversation-row"/g) ?? []).length, 9);
  const thread = render("/chat/matheus-freitas");
  assert.ok(thread.includes("Conversa com Matheus Freitas"));
  assert.ok(thread.includes("Qual o menor valor que você aceita?"));
  assert.ok(thread.includes('aria-label="Enviar mensagem"'));
  assert.equal((thread.match(/class="chat-message-entry"/g) ?? []).length, 6);
  assert.ok(render("/chat/inexistente").includes("Conversa não encontrada"));
  assert.ok(render("/chat/matheus-freitas", { market: deletedMarket }).includes("Este anúncio não está mais disponível."));
  const extraMessage = {
    id: "local-message-test", sender: "me", text: "Podemos combinar na biblioteca?",
    createdAt: "2026-11-11T14:00:00-03:00",
  };
  const savedThread = render("/chat/matheus-freitas", { storage: {
    [CHAT_STORAGE_KEY]: {
      version: 1,
      conversations: initialConversations.map((conversation) => conversation.id === "matheus-freitas"
        ? { ...conversation, messages: [...conversation.messages, extraMessage], unread: 0 }
        : conversation),
    },
  } });
  assert.ok(savedThread.includes(extraMessage.text));
  assert.equal((savedThread.match(/class="chat-message-entry"/g) ?? []).length, 7);
  assert.ok(render("/chat", { storage: { [CHAT_STORAGE_KEY]: "{bad-json" } }).includes("Selecione uma conversa"));

  // Exercise the real HTTP/session modules, including failures and token renewal.
  const { api, ApiError, getSession, setSession } = await server.ssrLoadModule("/src/lib/api.ts");
  const { login, register, logout } = await server.ssrLoadModule("/src/data/session.ts");
  const requests = [];
  let responses = [];
  globalThis.fetch = async (url, options) => {
    requests.push({ url, ...options });
    assert.ok(responses.length, `Unexpected request: ${url}`);
    const response = responses.shift();
    if (response instanceof Error) throw response;
    return new Response(JSON.stringify(response.body), { status: response.status ?? 200 });
  };
  responses = [{ body: session }];
  await login(" ALUNO@ADS.FIPONLINE.EDU.BR ", "senha-teste");
  assert.equal(requests.at(-1).url, "/api/auth/login/");
  assert.deepEqual(JSON.parse(requests.at(-1).body), { email: session.user.email, password: "senha-teste" });
  assert.equal(requests.at(-1).headers.Authorization, undefined);
  assert.deepEqual(getSession(), session);
  responses = [{ status: 201, body: {} }, { body: session }];
  await register({ name: " Aluno de teste ", email: " ALUNO@ADS.FIPONLINE.EDU.BR ", password: "senha-teste", passwordConfirmation: "senha-teste" });
  assert.equal(requests.at(-2).url, "/api/auth/register/");
  assert.deepEqual(JSON.parse(requests.at(-2).body), {
    name: session.user.name, email: session.user.email,
    password: "senha-teste", password_confirmation: "senha-teste",
  });
  responses = [{ status: 400, body: { email: ["E-mail já cadastrado."] } }];
  await assert.rejects(register({ name: "Aluno", email: session.user.email, password: "senha", passwordConfirmation: "senha" }),
    (error) => error instanceof ApiError && error.status === 400 && error.message.includes("E-mail já cadastrado."));
  responses = [{ status: 401, body: { detail: "Token expirado" } }, { body: { access: "renewed" } }, { body: [] }];
  await api("/posts/");
  assert.equal(requests.at(-2).url, "/api/auth/refresh/");
  assert.equal(requests.at(-1).headers.Authorization, "Bearer renewed");
  responses = [{ status: 401, body: {} }, { status: 401, body: {} }];
  await assert.rejects(api("/posts/"), (error) => error instanceof ApiError && error.status === 401);
  assert.equal(getSession(), null);
  responses = [new TypeError("Failed to fetch")];
  await assert.rejects(login(session.user.email, "senha"), (error) => error instanceof ApiError && error.status === 0);
  setSession(session);
  logout();
  assert.equal(getSession(), null);
  assert.equal(localStorage.getItem("uniplace:session:v1"), null);
  assert.equal(responses.length, 0);
  console.log("Verificações passaram: autenticação e API, renovação de sessão, telas, filtros, favoritos, anúncios, chat e estados inválidos.");
} finally {
  await server.close();
  for (const [key, descriptor] of originals) {
    if (descriptor) Object.defineProperty(globalThis, key, descriptor);
    else delete globalThis[key];
  }
}
