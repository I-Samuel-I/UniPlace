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
      if (id.endsWith('/src/data/chat.ts')) {
        return source.replace('export function useChat(userId: number | null) {', `export function useChat(userId: number | null) {\nreturn globalThis.${fixtureKey}.chat;`);
      }
      if (id.endsWith('/src/data/community.ts')) {
        return source.replace('export function useCommunity(userId: number | null) {', `export function useCommunity(userId: number | null) {\nreturn globalThis.${fixtureKey}.community;`);
      }
      if (id.endsWith('/src/data/notifications.ts')) {
        return source
          .replace('export function useNotifications(userId: number | null) {', `export function useNotifications(userId: number | null) {\nreturn globalThis.${fixtureKey}.notifications;`)
          .replace('export function useNotificationFeed(userId: number, revision: number) {', `export function useNotificationFeed(userId: number, revision: number) {\nreturn globalThis.${fixtureKey}.notificationFeed;`);
      }
    },
  }],
});

try {
  const { default: App } = await server.ssrLoadModule("/src/App.tsx");
  const { products } = await server.ssrLoadModule("/src/data/catalog.ts");
  const { getProductSeller } = await server.ssrLoadModule("/src/data/productDetails.ts");
  const { initialConversations } = await server.ssrLoadModule('/scripts/fixtures/chat.ts');
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
      chat: {
        conversations: options.conversations ?? initialConversations,
        loaded: true, storageError: null,
        reload: async () => {}, markRead: async () => {}, sendMessage: async () => {}, toggleFavorite: async () => {}, startConversation: async () => '',
      },
      community: {
        favorites: options.favorites ?? [], error: '',
        reload: async () => {}, toggleFavorite: async () => {},
      },
      notifications: {
        data: { results: [], unread: 0, total: 0 }, loaded: true, error: '', busy: null, revision: 0,
        reload: async () => {}, markRead: async () => true, markAllRead: async () => true, remove: async () => true,
        ...options.notifications,
      },
      notificationFeed: {
        data: { results: [], unread: 0, total: 0, count: 0, page: 1, page_size: 12, has_next: false },
        filter: { status: 'all', kind: 'all', page: 1 }, error: '', pending: false,
        reload: async () => {}, setStatus: () => {}, setKind: () => {}, setPage: () => {},
        ...options.notificationFeed,
      },
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

  // Unknown URLs show the public 404, even without a session or a working API.
  for (const path of ["/pagina-inexistente", "/explorar/nao-existe", "/chat/conversa/extra", "/anuncios/item/extra", "/qualquer/coisa/?q=teste#detalhes", "/%E0%A4%A"]) {
    for (const userSession of [session, null]) {
      const missing = render(path, { session: userSession, market: { loaded: false, error: "API indisponível" } });
      assert.ok(missing.includes('id="not-found-main"'), `Expected 404 for ${path}`);
      assert.ok(missing.includes('PÁGINA NÃO ENCONTRADA'));
      assert.ok(missing.includes('Voltar ao início'));
      assert.ok(missing.includes('href="/explorar"'));
      assert.ok(missing.includes('href="/suporte"'));
      assert.ok(!missing.includes('id="auth-title"'));
      assert.ok(!missing.includes('Carregando anúncios'));
      assert.ok(!missing.includes('API indisponível'));
      assert.equal(cardCount(missing), 0);
      assert.deepEqual(activeNavigation(missing), []);
    }
  }

  // Every protected route must show the actual login form before authentication.
  for (const path of ["/", "/explorar", "/meus-anuncios", "/chat", "/notificacoes", "/anuncios/inexistente"]) {
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
  for (const path of ['/explorar/', '/anuncios', '/anuncios/']) {
    assert.deepEqual(activeNavigation(render(path)), ['Explorar Anúncios']);
    assert.equal(cardCount(render(path)), 8);
  }
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
  assert.ok(render("/perfil").includes('Configurações'));
  assert.ok(render("/configuracoes").includes('Seu perfil, sua segurança e seus dados'));
  for (const [path, title] of [["/termos-de-uso", "Termos de uso"], ["/politica-de-privacidade", "Política de privacidade"]]) {
    const legal = render(path, { session: null });
    assert.ok(legal.includes(title));
    assert.ok(legal.includes('Exemplo para apresentação acadêmica'));
    assert.ok(!legal.includes('type="password"'));
  }
  const support = render('/suporte', { market: { loaded: false } });
  assert.ok(support.includes('Ajuda e suporte'));
  assert.ok(support.includes('Continuar no WhatsApp'));
  assert.ok(support.includes('(83) 9 9606-7677'));
  assert.ok(support.includes('Outros assuntos'));
  assert.ok(support.includes('Chamados e denúncias anteriores'));
  assert.ok(!support.includes('Carregando anúncios'));
  const { buildSupportMessage, supportWhatsAppUrl } = await server.ssrLoadModule('/src/data/support.ts');
  assert.equal(buildSupportMessage({ categoryId: 'support', reasonId: '' }), null);
  assert.equal(buildSupportMessage({ categoryId: 'issue', reasonId: 'buy' }), null);
  assert.equal(buildSupportMessage({ categoryId: 'invalid', reasonId: 'other' }), null);
  assert.equal(buildSupportMessage({ categoryId: 'other', reasonId: '', details: '   ' }), null);
  assert.equal(buildSupportMessage({ categoryId: 'report', reasonId: 'other', details: '  ' }), null);
  const customSupport = buildSupportMessage({ categoryId: 'other', reasonId: '', details: '  Sugestão de melhoria & dúvidas? #UniPlace 😊  ' });
  assert.ok(customSupport.includes('Detalhes:\nSugestão de melhoria & dúvidas? #UniPlace 😊'));
  const supportUrl = new URL(supportWhatsAppUrl(customSupport));
  assert.equal(supportUrl.origin, 'https://wa.me');
  assert.equal(supportUrl.pathname, '/5583996067677');
  assert.equal(supportUrl.searchParams.get('text'), customSupport);
  assert.equal([...supportUrl.searchParams].length, 1);
  const reportMessage = buildSupportMessage({ categoryId: 'report', reasonId: 'scam', reference: ' https://uniplace.test/anuncios/item?a=1&b=2 ', details: 'Descrição da denúncia' });
  assert.ok(reportMessage.includes('Categoria: Fazer uma denúncia'));
  assert.ok(reportMessage.includes('Motivo: Suspeita de golpe ou fraude'));
  assert.ok(reportMessage.includes('Link relacionado: https://uniplace.test/anuncios/item?a=1&b=2'));
  assert.ok(buildSupportMessage({ categoryId: 'support', reasonId: 'publish' }));
  const emptyNotices = render('/notificacoes', { market: { loaded: false } });
  assert.deepEqual(activeNavigation(emptyNotices), ['Notificações']);
  assert.ok(emptyNotices.includes('Suas novidades chegam por aqui'));
  assert.ok(!emptyNotices.includes('Carregando anúncios'));
  const notice = { id: 'notice-1', kind: 'message', text: 'Maria enviou uma mensagem.', url: '/chat/maria', read_at: null, created_at: '2026-11-25T12:00:00Z' };
  const noticeData = { results: [notice], unread: 1, total: 13, count: 13, page: 1, page_size: 12, has_next: true };
  const notices = render('/notificacoes/', { notifications: { data: noticeData }, notificationFeed: { data: noticeData } });
  assert.ok(notices.includes(notice.text));
  assert.ok(notices.includes('href="/chat/maria"'));
  assert.ok(notices.includes('Marcar como lida'));
  assert.ok(notices.includes('Excluir notificação'));
  assert.ok(notices.includes('1 notificação não lida'));
  assert.ok(notices.includes('Página 1'));
  assert.ok(render('/notificacoes', { notificationFeed: { data: null, pending: true } }).includes('Carregando notificações...'));
  assert.ok(render('/notificacoes', { notificationFeed: { data: null, error: 'Falha nas notificações' } }).includes('Tentar novamente'));
  assert.ok(render('/notificacoes', { notificationFeed: { filter: { status: 'unread', kind: 'all', page: 1 } } }).includes('Nenhuma notificação neste filtro'));
  const { noticeDestination, noticeTime } = await server.ssrLoadModule('/src/data/notifications.ts');
  assert.equal(noticeDestination('https://bad.test'), null);
  assert.equal(noticeDestination('//bad.test'), null);
  assert.equal(noticeDestination('/chat/../configuracoes'), null);
  assert.equal(noticeDestination('/suporte'), '/suporte');
  assert.equal(noticeTime('2026-11-25T12:00:00Z', Date.parse('2026-11-25T12:05:00Z')), 'há 5 minutos');

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
  const savedThread = render("/chat/matheus-freitas", {
      conversations: initialConversations.map((conversation) => conversation.id === "matheus-freitas"
        ? { ...conversation, messages: [...conversation.messages, extraMessage], unread: 0 }
        : conversation),
  });
  assert.ok(savedThread.includes(extraMessage.text));
  assert.equal((savedThread.match(/class="chat-message-entry"/g) ?? []).length, 7);
  const noConversations = render('/chat', { conversations: [] });
  assert.ok(!noConversations.includes('class="chat-conversation-row"'));
  assert.ok(!noConversations.includes('Matheus Freitas'));

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
  // A late 401 after another request refreshed must retry with the renewed token.
  setSession(session);
  let releaseLate;
  let refreshCalls = 0;
  globalThis.fetch = async (url, options) => {
    if (url === '/api/posts/late' && options.headers.Authorization === `Bearer ${session.access}`)
      return new Promise(resolve => { releaseLate = resolve; });
    if (url === '/api/auth/refresh/') { refreshCalls++; return new Response(JSON.stringify({ access: 'parallel-renewed' })); }
    if (options.headers.Authorization === `Bearer ${session.access}`) return new Response('{}', { status: 401 });
    return new Response('[]');
  };
  const firstRequest = api('/posts/first');
  const lateRequest = api('/posts/late');
  await firstRequest;
  releaseLate(new Response('{}', { status: 401 }));
  await lateRequest;
  assert.equal(refreshCalls, 1);
  // A slow 401 from an old login must not renew or clear a newer account.
  setSession(session);
  let release;
  globalThis.fetch = () => new Promise(resolve => { release = resolve; });
  const oldRequest = api('/posts/');
  const nextSession = { ...session, access: 'other-access', refresh: 'other-refresh', user: { ...session.user, id: 2 } };
  setSession(nextSession);
  release(new Response('{}', { status: 401 }));
  await assert.rejects(oldRequest, error => error instanceof ApiError && error.status === 401);
  assert.deepEqual(getSession(), nextSession);
  logout();
  console.log("Verificações passaram: autenticação e API, renovação de sessão, telas, filtros, favoritos, anúncios, chat, notificações e estados inválidos.");
} finally {
  await server.close();
  for (const [key, descriptor] of originals) {
    if (descriptor) Object.defineProperty(globalThis, key, descriptor);
    else delete globalThis[key];
  }
}
