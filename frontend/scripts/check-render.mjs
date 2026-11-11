import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createServer } from "vite";

// Render the actual screens to catch route/menu regressions without a browser.
const server = await createServer({ server: { middlewareMode: true } });
const originalWindow = globalThis.window;
const originalStorage = globalThis.localStorage;

try {
  const { default: App } = await server.ssrLoadModule("/src/App.tsx");
  const { ACCOUNT_STORAGE_KEY, initialManagedPosts } =
    await server.ssrLoadModule("/src/data/account.ts");
  const { CHAT_STORAGE_KEY, initialConversations } =
    await server.ssrLoadModule("/src/data/chat.ts");
  function render(path, favorites = [], storage = {}) {
    globalThis.window = { location: new URL(path, "http://localhost") };
    Object.defineProperty(globalThis, "localStorage", {
      configurable: true,
      value: {
        getItem: (key) =>
          key === "uniplace:favorites"
            ? JSON.stringify(favorites)
            : Object.hasOwn(storage, key)
              ? typeof storage[key] === "string"
                ? storage[key]
                : JSON.stringify(storage[key])
              : null,
      },
    });
    return renderToStaticMarkup(createElement(App));
  }

  function activeNavigation(html) {
    return [
      ...html.matchAll(/<a\b[^>]*aria-current="page"[^>]*>([\s\S]*?)<\/a>/g),
    ].map((match) => match[1].replace(/<[^>]*>/g, ""));
  }
  const cardCount = (html) =>
    (html.match(/<article class="product-card/g) ?? []).length;

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

  const search = render("/explorar?q=ERGONOMICA");
  assert.equal(cardCount(search), 1);
  assert.ok(search.includes("Cadeira"));

  const emptyCategory = render("/explorar?categoria=calcados");
  assert.equal(cardCount(emptyCategory), 0);
  assert.ok(emptyCategory.includes("Remover filtro: Calçados"));
  assert.ok(emptyCategory.includes("Nenhum anúncio por aqui"));

  const favorites = render("/favoritos", ["notebook-acer-aspire-5"]);
  assert.deepEqual(activeNavigation(favorites), ["Favoritos1"]);
  assert.equal(cardCount(favorites), 1);
  assert.ok(favorites.includes("Notebook Acer Aspire 5"));

  const emptyFavorites = render("/favoritos");
  assert.equal(cardCount(emptyFavorites), 0);
  assert.ok(emptyFavorites.includes("Seus favoritos começam aqui"));

  // A direct URL must render its own product and keep the catalog menu active.
  const product = render("/anuncios/macbook-air-m1-8gb-256gb");
  assert.deepEqual(activeNavigation(product), ["Explorar Anúncios"]);
  assert.ok(
    product.includes('<h1 id="product-title">MacBook Air M1 8GB 256GB</h1>'),
  );
  assert.ok(product.includes("Matheus Fontes"));
  assert.ok(product.includes("Informações do produto"));
  assert.ok(product.includes("Apple M1"));
  assert.ok(product.includes("Ampliar foto 1 de 4"));
  assert.equal(cardCount(product), 4);
  assert.ok(!product.includes("Ver anúncio: Notebook Acer Aspire 5"));
  assert.ok(!product.includes("Ver anúncio: MacBook Air M1 8GB 256GB"));

  const otherProduct = render("/anuncios/notebook-acer-aspire-5");
  assert.ok(
    otherProduct.includes('<h1 id="product-title">Notebook Acer Aspire 5</h1>'),
  );
  assert.ok(otherProduct.includes("Lucas Almeida"));
  assert.ok(otherProduct.includes("Intel Core i5"));
  assert.ok(otherProduct.includes("Ampliar foto 1 de 1"));

  const soldProduct = render("/anuncios/iphone-13-128gb");
  assert.match(
    soldProduct,
    /<button[^>]*class="product-contact primary-button"[^>]*disabled=""/,
  );
  assert.ok(soldProduct.includes("Produto vendido"));

  const sellerCatalog = render("/explorar?vendedor=matheus-fontes");
  assert.ok(sellerCatalog.includes("Anúncios de Matheus Fontes"));
  assert.equal(cardCount(sellerCatalog), 5);
  assert.ok(!sellerCatalog.includes("Ver anúncio: Notebook Acer Aspire 5"));

  const notFound = render("/anuncios/inexistente");
  assert.ok(notFound.includes("Anúncio não encontrado"));
  assert.equal(cardCount(notFound), 0);
  assert.deepEqual(activeNavigation(notFound), ["Explorar Anúncios"]);
  assert.ok(render("/anuncios/%E0%A4%A").includes("Anúncio não encontrado"));

  const unknownSeller = render("/explorar?vendedor=inexistente");
  assert.ok(unknownSeller.includes("Vendedor não encontrado"));
  assert.ok(!unknownSeller.includes("Lucas Almeida"));
  assert.equal(cardCount(unknownSeller), 0);

  const ownPosts = render("/meus-anuncios");
  assert.deepEqual(activeNavigation(ownPosts), ["Meus Anúncios"]);
  assert.equal(
    (ownPosts.match(/<article class="owned-post-card"/g) ?? []).length,
    6,
  );
  assert.ok(ownPosts.includes("Todos <span>(6)</span>"));
  assert.ok(ownPosts.includes("Ativos <span>(5)</span>"));
  assert.ok(ownPosts.includes("Expirados <span>(1)</span>"));
  assert.ok(ownPosts.includes("Publicar novo anúncio"));
  assert.ok(render("/perfil").includes('<div class="my-posts-page">'));

  const inbox = render("/chat");
  assert.deepEqual(activeNavigation(inbox), ["Chat"]);
  assert.ok(inbox.includes("Selecione uma conversa"));
  assert.equal((inbox.match(/class="chat-conversation-row"/g) ?? []).length, 9);
  assert.equal((inbox.match(/class="chat-unread-badge"/g) ?? []).length, 3);

  const thread = render("/chat/matheus-freitas");
  assert.deepEqual(activeNavigation(thread), ["Chat"]);
  assert.ok(thread.includes("Conversa com Matheus Freitas"));
  assert.ok(thread.includes("Qual o menor valor que você aceita?"));
  assert.ok(thread.includes("Anúncio em questão"));
  assert.ok(thread.includes("MacBook Air M1 8GB 256GB"));
  assert.ok(thread.includes("Conversa de demonstração"));
  assert.ok(thread.includes('aria-label="Enviar mensagem"'));
  assert.equal((thread.match(/class="chat-message-entry"/g) ?? []).length, 6);
  const missingChat = render("/chat/inexistente");
  assert.ok(missingChat.includes("Conversa não encontrada"));
  assert.ok(!missingChat.includes("Qual o menor valor"));

  const accountPayload = (posts, deletedIds = []) => ({
    version: 1,
    posts,
    deletedIds,
  });
  const editedPosts = initialManagedPosts.map((post) =>
    post.id === "macbook-air-m1-8gb-256gb"
      ? { ...post, title: "MacBook para estudos", price: 3700 }
      : post,
  );
  const editedProduct = render("/anuncios/macbook-air-m1-8gb-256gb", [], {
    [ACCOUNT_STORAGE_KEY]: accountPayload(editedPosts),
  });
  assert.ok(
    editedProduct.includes('<h1 id="product-title">MacBook para estudos</h1>'),
  );
  assert.ok(editedProduct.includes("3.700,00"));

  const deletedId = "macbook-air-m1-8gb-256gb";
  const deletedStorage = {
    [ACCOUNT_STORAGE_KEY]: accountPayload(
      initialManagedPosts.filter((post) => post.id !== deletedId),
      [deletedId],
    ),
  };
  assert.ok(
    render(`/anuncios/${deletedId}`, [], deletedStorage).includes(
      "Anúncio não encontrado",
    ),
  );
  const deletedFavorite = render("/favoritos", [deletedId], deletedStorage);
  assert.equal(cardCount(deletedFavorite), 0);
  assert.ok(!deletedFavorite.includes('class="nav-favorite-count"'));
  const deletedChat = render("/chat/matheus-freitas", [], deletedStorage);
  assert.ok(deletedChat.includes("Este anúncio não está mais disponível."));
  assert.ok(deletedChat.includes("Qual o menor valor que você aceita?"));

  const pausedPosts = initialManagedPosts.map((post) =>
    post.id === deletedId ? { ...post, status: "paused" } : post,
  );
  const pausedStorage = { [ACCOUNT_STORAGE_KEY]: accountPayload(pausedPosts) };
  assert.equal(cardCount(render("/explorar", [], pausedStorage)), 7);
  assert.ok(
    render(`/anuncios/${deletedId}`, [], pausedStorage).includes(
      "Anúncio pausado",
    ),
  );

  const newPost = {
    ...initialManagedPosts[1],
    id: "meu-cadeira-extra",
    title: "Cadeira de estudo extra",
    price: 250,
  };
  const newPostStorage = {
    [ACCOUNT_STORAGE_KEY]: accountPayload([...initialManagedPosts, newPost]),
  };
  assert.ok(
    render(`/anuncios/${newPost.id}`, [], newPostStorage).includes(
      '<h1 id="product-title">Cadeira de estudo extra</h1>',
    ),
  );
  assert.equal(cardCount(render("/explorar", [], newPostStorage)), 9);

  const extraMessage = {
    id: "local-message-test",
    sender: "me",
    text: "Podemos combinar na biblioteca?",
    createdAt: "2026-11-11T14:00:00-03:00",
  };
  const savedChat = {
    [CHAT_STORAGE_KEY]: {
      version: 1,
      conversations: initialConversations.map((conversation) =>
        conversation.id === "matheus-freitas"
          ? {
              ...conversation,
              messages: [...conversation.messages, extraMessage],
              unread: 0,
            }
          : conversation,
      ),
    },
  };
  const persistedThread = render("/chat/matheus-freitas", [], savedChat);
  assert.ok(persistedThread.includes(extraMessage.text));
  assert.equal(
    (persistedThread.match(/class="chat-message-entry"/g) ?? []).length,
    7,
  );

  const corrupt = {
    [ACCOUNT_STORAGE_KEY]: "{bad-json",
    [CHAT_STORAGE_KEY]: "{bad-json",
  };
  assert.ok(render("/perfil", [], corrupt).includes("Meus Anúncios"));
  assert.ok(render("/chat", [], corrupt).includes("Selecione uma conversa"));

  console.log(
    "Verificações de renderização e persistência passaram: catálogo, produtos, perfil, anúncios gerenciados, favoritos, conversas e estados inválidos.",
  );
} finally {
  await server.close();
  if (originalWindow === undefined) delete globalThis.window;
  else globalThis.window = originalWindow;
  if (originalStorage === undefined) delete globalThis.localStorage;
  else
    Object.defineProperty(globalThis, "localStorage", {
      configurable: true,
      value: originalStorage,
    });
}
