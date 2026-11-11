import { useEffect, useMemo, useRef, useState } from "react";
import { products } from "./data/catalog";
import type { Product } from "./data/catalog";
import { Icon } from "./components/Icon";
import { HomePage } from "./pages/HomePage";
import { ExplorePage } from "./pages/ExplorePage";
import { ProductPage, ProductNotFound } from "./pages/ProductPage";
import { getProductDetails, getSeller } from "./data/productDetails";
import { followLink, productPath } from "./lib/navigation";
import { MyPostsPage } from "./pages/MyPostsPage";
import { ChatPage } from "./pages/ChatPage";
import { currentUser, useManagedPosts } from "./data/account";
import type { ManagedPost } from "./data/account";
import { useChat } from "./data/chat";

type Route = {
  page: "home" | "explore" | "favorites" | "product" | "my-posts" | "chat";
  search: string;
  category: string;
  productId: string;
  sellerId: string;
  conversationId: string;
};
function readRoute(): Route {
  const params = new URLSearchParams(window.location.search);
  const pathname = window.location.pathname.replace(/\/+$/, "") || "/";
  const chatMatch = pathname.match(/^\/chat\/([^/]+)$/);
  const productMatch = window.location.pathname.match(
    /^\/anuncios\/([^/]+)\/?$/,
  );
  let productId = "";
  let conversationId = "";
  if (chatMatch) {
    try {
      conversationId = decodeURIComponent(chatMatch[1]);
    } catch {
      conversationId = chatMatch[1];
    }
  }
  if (productMatch) {
    try {
      productId = decodeURIComponent(productMatch[1]);
    } catch {
      /* Invalid URL is handled by the missing-product page. */
    }
  }
  return {
    page: productMatch
      ? "product"
      : chatMatch || pathname === "/chat"
        ? "chat"
        : ["/meus-anuncios", "/perfil"].includes(pathname)
          ? "my-posts"
          : pathname === "/favoritos"
            ? "favorites"
            : ["/explorar", "/anuncios"].includes(window.location.pathname)
              ? "explore"
              : "home",
    search: params.get("q") ?? "",
    category: params.get("categoria") ?? "",
    productId,
    sellerId: params.get("vendedor") ?? "",
    conversationId,
  };
}
function readFavorites(): string[] {
  try {
    const stored: unknown = JSON.parse(
      localStorage.getItem("uniplace:favorites") ?? "[]",
    );
    return Array.isArray(stored)
      ? stored.filter((id): id is string => typeof id === "string")
      : [];
  } catch {
    return [];
  }
}

export default function App() {
  const account = useManagedPosts();
  const chat = useChat();
  const [route, setRoute] = useState(readRoute);
  const [search, setSearch] = useState(route.search);
  const [savedFavorites, setFavorites] = useState(readFavorites);
  const [mobileMenu, setMobileMenu] = useState(false);
  const [toast, setToast] = useState("");
  const [popover, setPopover] = useState<"notifications" | "profile" | null>(
    null,
  );
  const toastTimer = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );
  const popoverRef = useRef<HTMLDivElement>(null);
  const catalogProducts = useMemo(() => {
    const managedById = new Map(account.posts.map((post) => [post.id, post]));
    const baseIds = new Set(products.map((product) => product.id));
    const toProduct = (post: ManagedPost): Product => ({
      ...post,
      sellerId: currentUser.id,
    });
    return [
      ...products
        .filter((product) => !account.deletedIds.includes(product.id))
        .map((product) =>
          managedById.has(product.id)
            ? toProduct(managedById.get(product.id)!)
            : product,
        ),
      ...account.posts.filter((post) => !baseIds.has(post.id)).map(toProduct),
    ];
  }, [account.posts, account.deletedIds]);
  const favorites = useMemo(() => {
    const availableIds = new Set(catalogProducts.map((product) => product.id));
    return [...new Set(savedFavorites)].filter((id) => availableIds.has(id));
  }, [savedFavorites, catalogProducts]);
  const sellerProducts = (sellerId: string) =>
    catalogProducts.filter(
      (product) =>
        (!product.status || product.status === "active") &&
        getProductDetails(product).sellerId === sellerId,
    );
  const currentProduct = catalogProducts.find(
    (product) => product.id === route.productId,
  );
  const activeNavigation = route.page === "product" ? "explore" : route.page;
  const requestedSeller = route.sellerId
    ? getSeller(route.sellerId)
    : undefined;
  const validSeller =
    requestedSeller?.id === route.sellerId ? requestedSeller : undefined;

  useEffect(() => {
    const update = () => {
      const next = readRoute();
      setRoute(next);
      setSearch(next.search);
      setMobileMenu(false);
    };
    window.addEventListener("popstate", update);
    return () => window.removeEventListener("popstate", update);
  }, []);
  useEffect(() => {
    document.title = `${route.page === "home" ? "Início" : route.page === "favorites" ? "Favoritos" : route.page === "my-posts" ? "Meus Anúncios" : route.page === "chat" ? "Chat" : route.page === "product" ? (currentProduct?.title ?? "Anúncio não encontrado") : "Explorar Anúncios"} | UniPlace`;
  }, [route.page, currentProduct?.title]);
  useEffect(() => {
    try {
      localStorage.setItem("uniplace:favorites", JSON.stringify(favorites));
    } catch {
      /* Storage can be unavailable in private contexts. */
    }
  }, [favorites]);
  useEffect(() => {
    if (!popover) return;
    const close = (event: MouseEvent) => {
      if (!popoverRef.current?.contains(event.target as Node)) setPopover(null);
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setPopover(null);
    };
    document.addEventListener("click", close);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("click", close);
      document.removeEventListener("keydown", escape);
    };
  }, [popover]);
  useEffect(() => {
    if (!mobileMenu) return;
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMobileMenu(false);
    };
    document.addEventListener("keydown", escape);
    return () => document.removeEventListener("keydown", escape);
  }, [mobileMenu]);
  useEffect(() => () => clearTimeout(toastTimer.current), []);
  useEffect(() => {
    const storageError = account.storageError ?? chat.storageError;
    if (storageError) notify(storageError);
  }, [account.storageError, chat.storageError]);

  function notify(message: string) {
    setToast(message);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(""), 4000);
  }
  function navigate(
    page: Route["page"],
    options: {
      category?: string;
      query?: string;
      productId?: string;
      sellerId?: string;
      conversationId?: string;
    } = {},
  ) {
    const {
      category = "",
      query = "",
      productId = "",
      sellerId = "",
      conversationId = "",
    } = options;
    const params = new URLSearchParams();
    if (category) params.set("categoria", category);
    if (query) params.set("q", query);
    if (sellerId) params.set("vendedor", sellerId);
    const path =
      page === "home"
        ? "/"
        : page === "favorites"
          ? "/favoritos"
          : page === "my-posts"
            ? "/meus-anuncios"
            : page === "chat"
              ? `/chat${conversationId ? `/${encodeURIComponent(conversationId)}` : ""}`
              : page === "product"
                ? productPath(productId)
                : "/explorar";
    const url = `${path}${params.size ? `?${params}` : ""}`;
    window.history.pushState({}, "", url);
    setRoute({
      page,
      category,
      search: query,
      productId,
      sellerId,
      conversationId,
    });
    setSearch(query);
    setMobileMenu(false);
    setPopover(null);
    window.scrollTo({ top: 0, behavior: "instant" });
  }
  function openProduct(product: Product) {
    navigate("product", { productId: product.id });
  }
  function openChat(product: Product) {
    try {
      const conversationId = chat.startConversation(product);
      navigate("chat", { conversationId });
      if (!conversationId) notify("Este anúncio ainda não tem conversas.");
    } catch (error) {
      notify(
        error instanceof Error
          ? error.message
          : "Não foi possível abrir a conversa.",
      );
    }
  }
  function toggleFavorite(id: string) {
    setFavorites((current) =>
      current.includes(id)
        ? current.filter((item) => item !== id)
        : [...current, id],
    );
  }
  function comingSoon(label: string) {
    setMobileMenu(false);
    notify(`${label} estará disponível em uma próxima versão.`);
  }

  const navigation = [
    { id: "home", label: "Início", icon: "home", href: "/" },
    {
      id: "explore",
      label: "Explorar Anúncios",
      icon: "grid",
      href: "/explorar",
    },
    {
      id: "my-posts",
      label: "Meus Anúncios",
      icon: "bag",
      href: "/meus-anuncios",
    },
    { id: "chat", label: "Chat", icon: "chat", href: "/chat" },
    { id: "notifications", label: "Notificações", icon: "bell" },
    { id: "favorites", label: "Favoritos", icon: "heart", href: "/favoritos" },
  ];

  return (
    <>
      <a className="skip-link" href="#main-content">
        Ir para o conteúdo
      </a>
      {mobileMenu && (
        <button
          className="sidebar-backdrop"
          aria-label="Fechar menu"
          onClick={() => setMobileMenu(false)}
        />
      )}
      <aside
        className={`sidebar ${mobileMenu ? "sidebar--open" : ""}`}
        aria-label="Menu principal"
      >
        <a
          href="/"
          className="brand"
          onClick={(event) => {
            followLink(event, () => navigate("home"));
          }}
          aria-label="UniPlace — Início"
        >
          <span className="brand-icon">
            <Icon name="bag" size={22} />
          </span>
          <span>
            Uni<span className="brand-accent">Place</span>
          </span>
        </a>
        <nav className="main-nav" aria-label="Navegação principal">
          {navigation.map((item) =>
            item.href ? (
              <a
                key={item.id}
                href={item.href}
                className={`nav-item ${activeNavigation === item.id ? "nav-item--active" : ""}`}
                aria-current={activeNavigation === item.id ? "page" : undefined}
                onClick={(event) => {
                  followLink(event, () => navigate(item.id as Route["page"]));
                }}
              >
                <Icon name={item.icon} size={19} />
                <span>{item.label}</span>
                {item.id === "favorites" && favorites.length > 0 && (
                  <span className="nav-favorite-count">{favorites.length}</span>
                )}
              </a>
            ) : (
              <button
                key={item.id}
                className="nav-item"
                onClick={() =>
                  item.id === "notifications"
                    ? (setPopover("notifications"), setMobileMenu(false))
                    : comingSoon(item.label)
                }
              >
                <Icon name={item.icon} size={19} />
                <span>{item.label}</span>
                {item.id === "notifications" && (
                  <span className="notification-count">3</span>
                )}
              </button>
            ),
          )}
        </nav>
        <div className="sidebar-footer">
          <button
            className="nav-item"
            onClick={() => comingSoon("Configurações")}
          >
            <Icon name="settings" size={18} />
            <span>Configurações</span>
          </button>
          <button
            className="nav-item"
            onClick={() =>
              notify(
                "Precisa de ajuda? Explore os anúncios, use os filtros e salve seus favoritos para encontrar depois.",
              )
            }
          >
            <Icon name="help" size={18} />
            <span>Ajuda e Suporte</span>
          </button>
          <button
            className="nav-item nav-item--logout"
            onClick={() =>
              notify("Você está navegando na versão de demonstração.")
            }
          >
            <Icon name="logout" size={18} />
            <span>Sair</span>
          </button>
        </div>
      </aside>

      <div
        className={`app-shell${route.page === "chat" && route.conversationId ? " app-shell--conversation" : ""}`}
      >
        <header className="topbar">
          <button
            className="icon-button mobile-menu-button"
            aria-label="Abrir menu"
            aria-expanded={mobileMenu}
            onClick={() => setMobileMenu(!mobileMenu)}
          >
            <Icon name="menu" />
          </button>
          <form
            className="global-search"
            role="search"
            onSubmit={(event) => {
              event.preventDefault();
              navigate("explore", { query: search.trim() });
            }}
          >
            <Icon name="search" size={19} />
            <input
              type="search"
              aria-label="Buscar anúncios"
              placeholder="Buscar por nome, categoria, palavra-chave..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
            {search && (
              <button
                type="button"
                className="search-clear"
                aria-label="Limpar busca"
                onClick={() => {
                  setSearch("");
                  if (route.search)
                    navigate("explore", { category: route.category });
                }}
              >
                <Icon name="x" size={15} />
              </button>
            )}
          </form>
          <div className="topbar-actions" ref={popoverRef}>
            <span className="topbar-location">
              <Icon name="map-pin" size={18} />
              <span>Patos - PB</span>
            </span>
            <div className="notification-anchor">
              <button
                className="icon-button header-bell"
                aria-label="Ver 3 notificações"
                aria-expanded={popover === "notifications"}
                onClick={() =>
                  setPopover(
                    popover === "notifications" ? null : "notifications",
                  )
                }
              >
                <Icon name="bell" size={21} />
                <span className="header-notification-count">3</span>
              </button>
              {popover === "notifications" && (
                <div className="header-popover notifications-popover">
                  <h2>Notificações</h2>
                  <p className="popover-intro">Boas-vindas à comunidade!</p>
                  <div className="notification-entry">
                    <Icon name="bag" />
                    <div>
                      <strong>Seu campus, mais conectado</strong>
                      <p>Encontre ofertas de outros estudantes.</p>
                    </div>
                  </div>
                  <div className="notification-entry">
                    <Icon name="search" />
                    <div>
                      <strong>Encontre seu próximo achado</strong>
                      <p>Explore as categorias e filtre os anúncios.</p>
                    </div>
                  </div>
                  <div className="notification-entry">
                    <Icon name="heart" />
                    <div>
                      <strong>Guarde o que você gostou</strong>
                      <p>Seus favoritos ficam salvos neste navegador.</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
            <div className="profile-anchor">
              <button
                className="profile-button"
                aria-label="Abrir menu da conta"
                aria-expanded={popover === "profile"}
                onClick={() =>
                  setPopover(popover === "profile" ? null : "profile")
                }
              >
                <span className="avatar">
                  <img src={currentUser.avatar} alt="" width="29" height="29" />
                  <span className="online-dot" />
                </span>
                <Icon name="chevron-down" size={13} />
              </button>
              {popover === "profile" && (
                <div className="header-popover profile-popover">
                  <strong>{currentUser.name}</strong>
                  <p>Você está na demonstração do UniPlace.</p>
                  <a
                    href="/perfil"
                    onClick={(event) =>
                      followLink(event, () => navigate("my-posts"))
                    }
                  >
                    <Icon name="user" size={17} />
                    Meu perfil
                  </a>
                  <a
                    href="/meus-anuncios"
                    onClick={(event) =>
                      followLink(event, () => navigate("my-posts"))
                    }
                  >
                    <Icon name="bag" size={17} />
                    Meus anúncios
                  </a>
                  <button onClick={() => navigate("favorites")}>
                    <Icon name="heart" size={17} />
                    Meus favoritos
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>
        <main
          id="main-content"
          className={`main-content${route.page === "chat" ? " main-content--chat" : ""}`}
          tabIndex={-1}
        >
          {route.page === "my-posts" ? (
            <MyPostsPage
              posts={account.posts}
              favorites={favorites}
              onToggleFavorite={toggleFavorite}
              onSelectProduct={openProduct}
              onSavePost={account.savePost}
              onDeletePost={account.deletePost}
              onSetStatus={account.setPostStatus}
              onNavigateHome={() => navigate("home")}
              onOpenChat={openChat}
              onNotify={notify}
            />
          ) : route.page === "chat" ? (
            <ChatPage
              conversations={chat.conversations}
              conversationId={route.conversationId}
              products={catalogProducts}
              onSelectConversation={(conversationId) =>
                navigate("chat", { conversationId })
              }
              onBack={() => navigate("chat")}
              onSendMessage={chat.sendMessage}
              onMarkRead={chat.markRead}
              onToggleFavorite={chat.toggleFavorite}
              onSelectProduct={openProduct}
              onNotify={notify}
            />
          ) : route.page === "home" ? (
            <HomePage
              products={catalogProducts}
              favorites={favorites}
              onToggleFavorite={toggleFavorite}
              onSelectProduct={openProduct}
              onExplore={(category) => navigate("explore", { category })}
            />
          ) : route.page === "product" ? (
            currentProduct ? (
              <ProductPage
                key={currentProduct.id}
                product={currentProduct}
                favorites={favorites}
                onToggleFavorite={toggleFavorite}
                onSelectProduct={openProduct}
                onNavigateHome={() => navigate("home")}
                onExplore={(category) => navigate("explore", { category })}
                onExploreSeller={(sellerId) =>
                  navigate("explore", { sellerId })
                }
                onNotify={notify}
                onOpenChat={openChat}
                ownProduct={account.posts.some(
                  (post) => post.id === currentProduct.id,
                )}
                sellerProducts={sellerProducts(
                  getProductDetails(currentProduct).sellerId,
                )}
              />
            ) : (
              <ProductNotFound onExplore={() => navigate("explore")} />
            )
          ) : (
            <ExplorePage
              products={
                route.sellerId
                  ? sellerProducts(route.sellerId)
                  : catalogProducts
              }
              favorites={favorites}
              onToggleFavorite={toggleFavorite}
              onSelectProduct={openProduct}
              search={route.search}
              initialCategory={route.category}
              onNavigateHome={() => navigate("home")}
              favoritesOnly={route.page === "favorites"}
              sellerName={validSeller?.name}
              sellerUnavailable={Boolean(route.sellerId && !validSeller)}
              onClearSeller={() =>
                navigate("explore", {
                  category: route.category,
                  query: route.search,
                })
              }
            />
          )}
        </main>
      </div>
      {toast && (
        <div className="toast" role="status">
          <Icon name="help" size={20} />
          <span>{toast}</span>
          <button aria-label="Fechar aviso" onClick={() => setToast("")}>
            <Icon name="x" size={17} />
          </button>
        </div>
      )}
    </>
  );
}
