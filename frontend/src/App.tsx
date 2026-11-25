import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Product } from "./data/catalog";
import { Icon } from "./components/Icon";
import { HomePage } from "./pages/HomePage";
import { ExplorePage } from "./pages/ExplorePage";
import { ProductPage, ProductNotFound } from "./pages/ProductPage";
import { DEFAULT_AVATAR } from "./data/productDetails";
import { followLink, productPath, profilePath } from "./lib/navigation";
import { PublicProfilePage } from "./pages/PublicProfilePage";
import { MyPostsPage } from "./pages/MyPostsPage";
import { ChatPage } from "./pages/ChatPage";
import { AuthPage } from "./pages/AuthPage";
import { useChat } from "./data/chat";
import { useMarketplace } from "./data/marketplace";
import { logout, useSession } from "./data/session";
import { useCommunity } from './data/community';
import { errorMessage, getSession } from './lib/api';
import { useNotifications, noticeDestination, noticeKinds, noticeTime } from './data/notifications';
import type { Notice } from './data/notifications';
import { NotificationsPage } from './pages/NotificationsPage';
import { AccountPage } from './pages/AccountPage';
import { LegalPage } from './pages/LegalPage';
import { legalKindFromPath } from './data/legal';
import { useScrollReveal } from './lib/scrollReveal';
import { useSmoothScroll } from './lib/smoothScroll';
import { NotFoundPage } from './pages/NotFoundPage';

type Route = {
  page: "home" | "explore" | "favorites" | "product" | "seller" | "my-posts" | "chat" | "account" | "support" | "notifications" | "not-found";
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
  const profileMatch = pathname.match(/^\/perfil\/([^/]+)$/);
  const productMatch = pathname.match(
    /^\/anuncios\/([^/]+)\/?$/,
  );
  let productId = "";
  let conversationId = "";
  let sellerId = params.get("vendedor") ?? "";
  if (profileMatch) {
    try { sellerId = decodeURIComponent(profileMatch[1]); }
    catch { sellerId = profileMatch[1]; }
  }
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
    page: profileMatch ? "seller" : productMatch
      ? "product"
      : chatMatch || pathname === "/chat"
        ? "chat"
        : pathname === '/perfil' || pathname === '/configuracoes'
          ? 'account'
          : pathname === '/suporte' ? 'support'
          : pathname === '/notificacoes' ? 'notifications'
        : pathname === '/meus-anuncios'
          ? "my-posts"
          : pathname === "/favoritos"
            ? "favorites"
            : ["/explorar", "/anuncios"].includes(pathname)
              ? "explore"
              : pathname === "/" ? "home" : "not-found",
    search: params.get("q") ?? "",
    category: params.get("categoria") ?? "",
    productId,
    sellerId,
    conversationId,
  };
}
export default function App() {
  useSmoothScroll();
  const [route, setRoute] = useState(readRoute);
  useEffect(() => {
    const update = () => setRoute(readRoute());
    window.addEventListener("popstate", update);
    return () => window.removeEventListener("popstate", update);
  }, []);
  const legalKind = legalKindFromPath(window.location.pathname);
  if (legalKind) return <LegalPage kind={legalKind} />;
  if (route.page === "not-found") return <NotFoundPage />;
  return <MarketplaceApp route={route} onRouteChange={setRoute} />;
}

function MarketplaceApp({ route, onRouteChange }: { route: Route; onRouteChange: (route: Route) => void }) {
  const session = useSession();
  const market = useMarketplace(session?.user.id ?? null);
  const chat = useChat(session?.user.id ?? null);
  const community = useCommunity(session?.user.id ?? null);
  const notifications = useNotifications(session?.user.id ?? null);
  const markConversationRead = useCallback(async (id: string) => {
    await chat.markRead(id);
    await notifications.reload();
  }, [chat.markRead, notifications.reload]);
  const [search, setSearch] = useState(route.search);
  const [mobileMenu, setMobileMenu] = useState(false);
  const [toast, setToast] = useState("");
  const [popover, setPopover] = useState<"notifications" | "profile" | null>(
    null,
  );
  const toastTimer = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );
  const popoverRef = useRef<HTMLDivElement>(null);
  const contentRef = useScrollReveal();
  // Catálogo de anúncios ativos mais os anúncios próprios em outros status,
  // para que o dono consiga abrir rascunhos, pausados e vendidos.
  const catalogProducts = useMemo<Product[]>(() => {
    const listed = new Set(market.catalog.map((product) => product.id));
    return [
      ...market.catalog,
      ...market.myPosts.filter((post) => !listed.has(post.id)),
    ];
  }, [market.catalog, market.myPosts]);
  const isOwnProduct = (product: Product) =>
    market.myPosts.some((post) => post.id === product.id);
  const favorites = useMemo(() => {
    const availableIds = new Set(catalogProducts.map((product) => product.id));
    return [...new Set(community.favorites)].filter((id) => availableIds.has(id));
  }, [community.favorites, catalogProducts]);
  const sellerProducts = (sellerId: string) =>
    catalogProducts.filter(
      (product) =>
        (!product.status || product.status === "active") &&
        product.sellerId === sellerId,
    );
  const currentProduct = catalogProducts.find(
    (product) => product.id === route.productId,
  );
  const activeNavigation = route.page === "product" || route.page === "seller" ? "explore" : route.page;
  const validSeller = route.sellerId
    ? catalogProducts.find((product) => product.sellerId === route.sellerId)
        ?.seller
    : undefined;

  useEffect(() => {
    setSearch(route.search);
    setMobileMenu(false);
    setPopover(null);
  }, [route]);
  useEffect(() => {
    if (route.page === "seller") return;
    document.title = `${route.page === 'notifications' ? 'Notificações' : route.page === 'account' ? 'Meu perfil' : route.page === 'support' ? 'Ajuda e Suporte' : route.page === "home" ? "Início" : route.page === "favorites" ? "Favoritos" : route.page === "my-posts" ? "Meus Anúncios" : route.page === "chat" ? "Chat" : route.page === "product" ? (currentProduct?.title ?? "Anúncio não encontrado") : "Explorar Anúncios"} | UniPlace`;
  }, [route.page, currentProduct?.title]);
  useEffect(() => { if (community.error) notify(community.error); }, [community.error]);
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
    if (chat.storageError) notify(chat.storageError);
  }, [chat.storageError]);
  useEffect(() => {
    // Falha ao atualizar dados já exibidos; a primeira carga mostra o erro na página.
    if (market.loaded && market.error) notify(market.error);
  }, [market.loaded, market.error]);

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
    if (sellerId && page !== "seller") params.set("vendedor", sellerId);
    const path =
      page === "seller" ? profilePath(sellerId) : page === 'notifications' ? '/notificacoes' : page === 'account' ? '/perfil' : page === 'support' ? '/suporte' : page === "home"
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
    onRouteChange({
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
  async function openChat(product: Product) {
    try {
      const conversationId = await chat.startConversation(
        product,
        isOwnProduct(product),
      );
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
    void community.toggleFavorite(id).catch(failure => notify(errorMessage(failure, 'Não foi possível atualizar o favorito.')));
  }
  async function openNotice(notice: Notice) {
    try {
      if (!notice.read_at && !await notifications.markRead(notice, true)) return;
      if (getSession()?.user.id !== session?.user.id) return;
      const destination = noticeDestination(notice.url);
      const conversationId = destination?.match(/^\/chat\/([^/]+)$/)?.[1];
      const productId = destination?.match(/^\/anuncios\/([^/]+)$/)?.[1];
      if (conversationId) navigate('chat', { conversationId });
      else if (productId) navigate('product', { productId });
      else if (destination === '/suporte') navigate('support');
      else if (destination === '/meus-anuncios') navigate('my-posts');
      else if (destination === '/perfil' || destination === '/configuracoes') navigate('account');
      else if (destination === '/explorar') navigate('explore');
      else if (destination === '/chat') navigate('chat');
      else navigate('notifications');
    } catch (failure) { notify(errorMessage(failure, 'Não foi possível abrir a notificação.')); }
  }

  if (!session) return <AuthPage />;

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
    { id: "notifications", label: "Notificações", icon: "bell", href: '/notificacoes' },
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
          {navigation.map((item) => (
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
                {item.id === 'notifications' && notifications.data.unread > 0 && <span className="notification-count">{notifications.data.unread}</span>}
              </a>
          ))}
        </nav>
        <div className="sidebar-footer">
          <button
            className="nav-item"
            onClick={() => navigate('account')}
          >
            <Icon name="settings" size={18} />
            <span>Configurações</span>
          </button>
          <button
            className="nav-item"
            onClick={() => navigate('support')}
          >
            <Icon name="help" size={18} />
            <span>Ajuda e Suporte</span>
          </button>
          <button
            className="nav-item nav-item--logout"
            onClick={() => logout()}
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
                aria-label={`Ver notificações, ${notifications.data.unread} não lidas`}
                aria-expanded={popover === "notifications"}
                onClick={() =>
                  setPopover(
                    popover === "notifications" ? null : "notifications",
                  )
                }
              >
                <Icon name="bell" size={21} />
                {notifications.data.unread > 0 && <span className="header-notification-count">{notifications.data.unread}</span>}
              </button>
              {popover === "notifications" && (
                <div className="header-popover notifications-popover" role="region" aria-label="Notificações recentes">
                  <div className="notice-preview-header"><h2>Notificações</h2><span>{notifications.data.unread} não lidas</span></div>
                  {notifications.error ? <div className="notice-preview-status" role="alert"><p>{notifications.error}</p><button className="notice-button" onClick={() => void notifications.reload()}>Tentar novamente</button></div> : !notifications.loaded ? <p className="notice-preview-status" role="status">Carregando notificações...</p> : notifications.data.results.length === 0 && <p className="notice-preview-status">Nenhuma notificação por enquanto.</p>}
                  {notifications.data.results.map(notice => <div className={`notice-preview${notice.read_at ? '' : ' is-unread'}`} key={notice.id}><Icon name={(noticeKinds[notice.kind] ?? noticeKinds.system).icon} size={20} /><a href={noticeDestination(notice.url) ?? '/notificacoes'} onClick={event => followLink(event, () => { void openNotice(notice); })}>{notice.text}<time dateTime={notice.created_at}>{noticeTime(notice.created_at)}</time></a></div>)}
                  <a className="notice-preview-link" href="/notificacoes" onClick={event => followLink(event, () => navigate('notifications'))}>Ver todas as notificações<Icon name="arrow-right" size={17} /></a>
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
                  <img src={session.user.avatar || DEFAULT_AVATAR} alt="" width="29" height="29" />
                  <span className="online-dot" />
                </span>
                <Icon name="chevron-down" size={13} />
              </button>
              {popover === "profile" && (
                <div className="header-popover profile-popover">
                  <strong title={session.user.name}>{session.user.name}</strong>
                  <p title={session.user.email}>{session.user.email}</p>
                  <a
                    href="/perfil"
                    onClick={(event) =>
                      followLink(event, () => navigate("account"))
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
          ref={contentRef}
          className={`main-content${route.page === "chat" ? " main-content--chat" : ""}`}
          tabIndex={-1}
        >
          {route.page === "seller" ? (
            <PublicProfilePage
              key={`${session.user.id}-${route.sellerId}`}
              profileId={route.sellerId}
              products={market.catalog}
              productsLoaded={market.loaded}
              productsError={market.error}
              favorites={favorites}
              onToggleFavorite={toggleFavorite}
              onSelectProduct={openProduct}
              onNavigateHome={() => navigate("home")}
              onExplore={() => navigate("explore")}
              onRetryProducts={() => void market.reload()}
            />
          ) : route.page === 'notifications' ? <NotificationsPage key={session.user.id} userId={session.user.id} notifications={notifications} onOpen={openNotice} onNotify={notify} /> : route.page === 'account' || route.page === 'support' ? <AccountPage key={`${route.page}-${session.user.id}`} support={route.page === 'support'} onNotify={notify} onProfileChange={() => { void market.reload(); void chat.reload(); }} /> : route.page === 'chat' && !chat.loaded ? <div className="page-status" role="status">Carregando conversas...</div> : route.page !== "chat" && !market.loaded ? (
            <div className="page-status" role="status">
              {market.error ? (
                <>
                  <p>{market.error}</p>
                  <button
                    className="primary-button"
                    onClick={() => void market.reload()}
                  >
                    Tentar novamente
                  </button>
                </>
              ) : (
                <p>Carregando anúncios...</p>
              )}
            </div>
          ) : route.page === "my-posts" ? (
            <MyPostsPage
              posts={market.myPosts}
              reference={market.reference}
              favorites={favorites}
              onToggleFavorite={toggleFavorite}
              onSelectProduct={openProduct}
              onSavePost={market.savePost}
              onDeletePost={market.deletePost}
              onSetStatus={market.setPostStatus}
              onNavigateHome={() => navigate("home")}
              onOpenChat={openChat}
              onNotify={notify}
            />
          ) : route.page === "chat" ? (
            <>{chat.storageError && <div role="alert" className="page-status"><p>{chat.storageError}</p><button onClick={() => void chat.reload()}>Tentar novamente</button></div>}<ChatPage
              conversations={chat.conversations}
              conversationId={route.conversationId}
              products={catalogProducts}
              onSelectConversation={(conversationId) =>
                navigate("chat", { conversationId })
              }
              onBack={() => navigate("chat")}
              onSendMessage={chat.sendMessage}
              onMarkRead={markConversationRead}
              onToggleFavorite={(id) => { void chat.toggleFavorite(id).catch(failure => notify(errorMessage(failure, 'Não foi possível atualizar a conversa.'))); }}
              onSelectProduct={openProduct}
              onOpenProfile={sellerId => navigate("seller", { sellerId })}
              onNotify={notify}
            /></>
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
                onOpenProfile={(sellerId) =>
                  navigate("seller", { sellerId })
                }
                onNotify={notify}
                onOpenChat={openChat}
                ownProduct={isOwnProduct(currentProduct)}
                sellerProducts={sellerProducts(currentProduct.sellerId ?? "")}
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
