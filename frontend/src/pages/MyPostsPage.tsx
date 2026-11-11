import { useEffect, useMemo, useRef, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import type { ManagedPost } from "../data/account";
import { categories, type Product } from "../data/catalog";
import { Icon } from "../components/Icon";
import { formatPrice } from "../components/ProductCard";
import { followLink, productPath } from "../lib/navigation";
import "./my-posts.css";

type MyPostsPageProps = {
  posts: ManagedPost[];
  favorites: string[];
  onToggleFavorite: (id: string) => void;
  onSelectProduct: (product: Product) => void;
  onSavePost: (post: ManagedPost) => void;
  onDeletePost: (id: string) => void;
  onSetStatus: (id: string, status: ManagedPost["status"]) => void;
  onNavigateHome: () => void;
  onOpenChat: (product: Product) => void;
  onNotify: (message: string) => void;
};

type StatusFilter = "all" | ManagedPost["status"];
type SortOrder = "recent" | "price-asc" | "price-desc";

const statusLabels: Record<ManagedPost["status"], string> = {
  active: "Ativo",
  paused: "Pausado",
  expired: "Expirado",
  draft: "Rascunho",
  sold: "Vendido",
};

const normalize = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("pt-BR");
const formCategories = [
  ...categories.filter((category) => category.id !== "mais"),
  { id: "mochilas", label: "Mochilas & Bolsas", icon: "bag" },
  { id: "games", label: "Games & Consoles", icon: "grid" },
];

export function MyPostsPage({
  posts,
  favorites,
  onToggleFavorite,
  onSelectProduct,
  onSavePost,
  onDeletePost,
  onSetStatus,
  onNavigateHome,
  onOpenChat,
  onNotify,
}: MyPostsPageProps) {
  const [status, setStatus] = useState<StatusFilter>("all");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<SortOrder>("recent");
  const [category, setCategory] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [menuId, setMenuId] = useState<string | null>(null);
  const [editorPost, setEditorPost] = useState<ManagedPost | null | undefined>(
    undefined,
  );
  const [deleteTarget, setDeleteTarget] = useState<ManagedPost | null>(null);
  const [deleteError, setDeleteError] = useState("");

  useEffect(() => {
    if (!menuId) return;
    const closeMenu = (event: MouseEvent) => {
      if (
        !(event.target instanceof Element) ||
        !event.target.closest(".owned-post-menu")
      )
        setMenuId(null);
    };
    const escapeMenu = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenuId(null);
    };
    document.addEventListener("click", closeMenu);
    document.addEventListener("keydown", escapeMenu);
    return () => {
      document.removeEventListener("click", closeMenu);
      document.removeEventListener("keydown", escapeMenu);
    };
  }, [menuId]);

  const tabs: Array<{ id: StatusFilter; label: string; count: number }> = [
    { id: "all", label: "Todos", count: posts.length },
    {
      id: "active",
      label: "Ativos",
      count: posts.filter((post) => post.status === "active").length,
    },
    {
      id: "paused",
      label: "Pausados",
      count: posts.filter((post) => post.status === "paused").length,
    },
    {
      id: "expired",
      label: "Expirados",
      count: posts.filter((post) => post.status === "expired").length,
    },
  ];
  if (status === "draft" || posts.some((post) => post.status === "draft"))
    tabs.push({
      id: "draft",
      label: "Rascunhos",
      count: posts.filter((post) => post.status === "draft").length,
    });
  if (status === "sold" || posts.some((post) => post.status === "sold"))
    tabs.push({
      id: "sold",
      label: "Vendidos",
      count: posts.filter((post) => post.status === "sold").length,
    });

  const shownPosts = useMemo(() => {
    const query = normalize(search.trim());
    return posts
      .filter(
        (post) =>
          (status === "all" || post.status === status) &&
          (!category || post.category === category) &&
          (!query ||
            normalize(
              `${post.title} ${post.categoryLabel} ${post.description}`,
            ).includes(query)),
      )
      .sort((a, b) =>
        sort === "price-asc"
          ? a.price - b.price
          : sort === "price-desc"
            ? b.price - a.price
            : Date.parse(b.updatedAt) - Date.parse(a.updatedAt),
      );
  }, [posts, status, category, search, sort]);
  const availableCategories = [
    ...new Map(
      posts.map((post) => [post.category, post.categoryLabel]),
    ).entries(),
  ];

  function changeStatus(post: ManagedPost, nextStatus: ManagedPost["status"]) {
    try {
      onSetStatus(post.id, nextStatus);
      setMenuId(null);
      onNotify(
        nextStatus === "active"
          ? "Anúncio reativado."
          : nextStatus === "paused"
            ? "Anúncio pausado."
            : "Anúncio marcado como vendido.",
      );
    } catch (error) {
      onNotify(
        error instanceof Error
          ? error.message
          : "Não foi possível alterar o anúncio.",
      );
    }
  }

  function removePost() {
    if (!deleteTarget) return;
    try {
      onDeletePost(deleteTarget.id);
      setDeleteTarget(null);
      setDeleteError("");
      onNotify("Anúncio excluído.");
    } catch (error) {
      setDeleteError(
        error instanceof Error
          ? error.message
          : "Não foi possível excluir o anúncio.",
      );
    }
  }

  return (
    <div className="my-posts-page">
      <nav className="my-posts-breadcrumb" aria-label="Caminho da página">
        <a href="/" onClick={(event) => followLink(event, onNavigateHome)}>
          Início
        </a>
        <Icon name="chevron-right" size={11} />
        <span aria-current="page">Meus Anúncios</span>
      </nav>
      <div className="my-posts-heading">
        <div>
          <h1>Meus Anúncios</h1>
          <p>Gerencie seus anúncios publicados na plataforma.</p>
        </div>
        <button
          className="primary-button my-posts-publish"
          onClick={() => setEditorPost(null)}
        >
          <Icon name="plus" size={17} />
          Publicar novo anúncio
        </button>
      </div>

      <div className="my-posts-toolbar">
        <div
          className="my-posts-tabs"
          role="group"
          aria-label="Status dos anúncios"
        >
          {tabs.map((tab) => (
            <button
              key={tab.id}
              className={status === tab.id ? "is-active" : ""}
              aria-pressed={status === tab.id}
              onClick={() => setStatus(tab.id)}
            >
              {tab.label} <span>({tab.count})</span>
            </button>
          ))}
        </div>
        <div className="my-posts-tools">
          <label className="my-posts-search">
            <Icon name="search" size={16} />
            <input
              type="search"
              aria-label="Buscar meus anúncios"
              placeholder="Buscar nos meus anúncios..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </label>
          <label className="my-posts-sort">
            <select
              aria-label="Ordenar meus anúncios"
              value={sort}
              onChange={(event) => setSort(event.target.value as SortOrder)}
            >
              <option value="recent">Mais recentes</option>
              <option value="price-asc">Menor preço</option>
              <option value="price-desc">Maior preço</option>
            </select>
            <Icon name="chevron-down" size={12} />
          </label>
          <button
            className={`my-posts-filter-toggle ${filtersOpen ? "is-active" : ""}`}
            aria-label="Filtrar meus anúncios por categoria"
            aria-expanded={filtersOpen}
            aria-controls="my-posts-category-filter"
            onClick={() => setFiltersOpen(!filtersOpen)}
          >
            <Icon name="sliders" size={17} />
            {category && <i />}
          </button>
        </div>
      </div>
      {filtersOpen && (
        <div className="my-posts-category-filter" id="my-posts-category-filter">
          <label>
            Categoria
            <select
              value={category}
              onChange={(event) => setCategory(event.target.value)}
            >
              <option value="">Todas as categorias</option>
              {availableCategories.map(([id, label]) => (
                <option value={id} key={id}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          {category && (
            <button onClick={() => setCategory("")}>
              Limpar filtro
              <Icon name="x" size={13} />
            </button>
          )}
        </div>
      )}

      <section
        className="owned-posts-grid"
        aria-label="Meus anúncios publicados"
      >
        {shownPosts.map((post) => (
          <article className="owned-post-card" key={post.id}>
            <div className="owned-post-picture">
              <a
                href={productPath(post.id)}
                onClick={(event) =>
                  followLink(event, () => onSelectProduct(post))
                }
                aria-label={`Ver meu anúncio: ${post.title}`}
              >
                <img
                  src={post.image}
                  alt={post.title}
                  loading="lazy"
                  width="420"
                  height="320"
                />
              </a>
              <span
                className={`owned-post-status owned-post-status--${post.status}`}
              >
                {statusLabels[post.status]}
              </span>
              <button
                className={`favorite-button ${favorites.includes(post.id) ? "is-favorite" : ""}`}
                aria-label={`${favorites.includes(post.id) ? "Remover dos" : "Adicionar aos"} favoritos: ${post.title}`}
                aria-pressed={favorites.includes(post.id)}
                onClick={() => onToggleFavorite(post.id)}
              >
                <Icon name="heart" size={17} />
              </button>
            </div>
            <div className="owned-post-content">
              <a
                className="owned-post-summary"
                href={productPath(post.id)}
                onClick={(event) =>
                  followLink(event, () => onSelectProduct(post))
                }
              >
                <h2>{post.title}</h2>
                <strong>{formatPrice(post.price)}</strong>
              </a>
              <div className="owned-post-stats">
                <span>
                  <Icon name="eye" size={13} />
                  <span>
                    {post.views}
                    <small>
                      {post.views === 1 ? "visualização" : "visualizações"}
                    </small>
                  </span>
                </span>
                <button
                  onClick={() => onOpenChat(post)}
                  aria-label={`Ver ${post.messageCount} ${post.messageCount === 1 ? "mensagem" : "mensagens"} sobre ${post.title}`}
                >
                  <Icon name="chat" size={13} />
                  <span>
                    {post.messageCount}
                    <small>
                      {post.messageCount === 1 ? "mensagem" : "mensagens"}
                    </small>
                  </span>
                </button>
              </div>
              <span className="owned-post-category">{post.categoryLabel}</span>
              <div className="owned-post-actions">
                <button
                  onClick={() => setEditorPost(post)}
                  aria-label={`Editar ${post.title}`}
                >
                  <Icon name="edit" size={14} />
                  Editar
                </button>
                <button
                  onClick={() => {
                    setDeleteTarget(post);
                    setDeleteError("");
                  }}
                  aria-label={`Excluir ${post.title}`}
                >
                  <Icon name="trash" size={13} />
                  Excluir
                </button>
                <div className="owned-post-menu">
                  <button
                    className="owned-post-more"
                    aria-label={`Mais opções para ${post.title}`}
                    aria-expanded={menuId === post.id}
                    aria-controls={`post-options-${post.id}`}
                    onClick={() =>
                      setMenuId(menuId === post.id ? null : post.id)
                    }
                  >
                    <Icon name="more" size={17} />
                  </button>
                  {menuId === post.id && (
                    <div
                      className="owned-post-menu-options"
                      id={`post-options-${post.id}`}
                    >
                      <button
                        onClick={() =>
                          changeStatus(
                            post,
                            post.status === "active" ? "paused" : "active",
                          )
                        }
                      >
                        <Icon
                          name={post.status === "active" ? "pause" : "play"}
                          size={14}
                        />
                        {post.status === "active"
                          ? "Pausar anúncio"
                          : "Reativar anúncio"}
                      </button>
                      {post.status !== "sold" && (
                        <button onClick={() => changeStatus(post, "sold")}>
                          <Icon name="check" size={14} />
                          Marcar como vendido
                        </button>
                      )}
                      <button
                        onClick={() => {
                          setMenuId(null);
                          onSelectProduct(post);
                        }}
                      >
                        <Icon name="eye" size={14} />
                        Ver anúncio
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </article>
        ))}
        {shownPosts.length > 0 && (
          <div className="owned-posts-info">
            <span>
              <Icon name="file" size={27} />
            </span>
            <p>
              Aqui você encontra todos os seus anúncios publicados. Mantenha
              suas publicações sempre atualizadas.
            </p>
          </div>
        )}
        {shownPosts.length === 0 && (
          <div className="owned-posts-empty">
            <span>
              <Icon name={search || category ? "search" : "bag"} size={30} />
            </span>
            <h2>
              {posts.length
                ? "Nenhum anúncio encontrado"
                : "Seu primeiro anúncio começa aqui"}
            </h2>
            <p>
              {posts.length
                ? "Experimente outro termo de busca ou selecione um status diferente."
                : "Dê uma nova história ao que você não usa mais. Publique um anúncio para a comunidade."}
            </p>
            {posts.length ? (
              <button
                onClick={() => {
                  setStatus("all");
                  setCategory("");
                  setSearch("");
                }}
              >
                Limpar filtros
              </button>
            ) : (
              <button onClick={() => setEditorPost(null)}>
                Publicar novo anúncio
                <Icon name="plus" size={16} />
              </button>
            )}
          </div>
        )}
      </section>

      {editorPost !== undefined && (
        <PostEditor
          key={editorPost?.id ?? "new"}
          post={editorPost}
          onClose={() => setEditorPost(undefined)}
          onSave={onSavePost}
          onNotify={onNotify}
        />
      )}
      {deleteTarget && (
        <OwnedPostDialog
          title="Excluir anúncio?"
          onClose={() => setDeleteTarget(null)}
        >
          <p>
            O anúncio <strong>{deleteTarget.title}</strong> será removido das
            suas publicações neste navegador.
          </p>
          {deleteError && (
            <p className="owned-post-form-error" role="alert">
              {deleteError}
            </p>
          )}
          <div className="owned-post-delete-actions">
            <button onClick={() => setDeleteTarget(null)}>Cancelar</button>
            <button className="owned-post-delete-confirm" onClick={removePost}>
              <Icon name="trash" size={16} />
              Excluir anúncio
            </button>
          </div>
        </OwnedPostDialog>
      )}
    </div>
  );
}

function OwnedPostDialog({
  title,
  children,
  onClose,
  className = "",
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
  className?: string;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = dialogRef.current;
    dialog?.showModal();
    return () => dialog?.close();
  }, []);
  return (
    <dialog
      ref={dialogRef}
      className={`owned-post-dialog ${className}`}
      aria-labelledby="owned-post-dialog-title"
      onCancel={onClose}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="owned-post-dialog-inner">
        <div className="owned-post-dialog-heading">
          <h2 id="owned-post-dialog-title">{title}</h2>
          <button className="icon-button" aria-label="Fechar" onClick={onClose}>
            <Icon name="x" />
          </button>
        </div>
        {children}
      </div>
    </dialog>
  );
}

function PostEditor({
  post,
  onSave,
  onClose,
  onNotify,
}: {
  post: ManagedPost | null;
  onSave: (post: ManagedPost) => void;
  onClose: () => void;
  onNotify: (message: string) => void;
}) {
  const [title, setTitle] = useState(post?.title ?? "");
  const [price, setPrice] = useState(post?.price.toString() ?? "");
  const [category, setCategory] = useState(post?.category ?? "eletronicos");
  const [description, setDescription] = useState(post?.description ?? "");
  const [condition, setCondition] = useState<Product["condition"]>(
    post?.condition ?? "like_new",
  );
  const [campus, setCampus] = useState(post?.campus ?? "Campus 1");
  const [pickupLocation, setPickupLocation] = useState(
    post?.pickupLocation ?? "Bloco Central",
  );
  const [image, setImage] = useState(post?.image ?? "/images/notebook.jpg");
  const [acceptsNegotiation, setAcceptsNegotiation] = useState(
    post?.acceptsNegotiation ?? true,
  );
  const [acceptsTrade, setAcceptsTrade] = useState(post?.acceptsTrade ?? false);
  const [imageLoading, setImageLoading] = useState(false);
  const [error, setError] = useState("");
  const readerRef = useRef<FileReader | null>(null);
  useEffect(
    () => () => {
      const reader = readerRef.current;
      readerRef.current = null;
      reader?.abort();
    },
    [],
  );

  function readPhoto(file: File | undefined) {
    if (!file) return;
    readerRef.current?.abort();
    readerRef.current = null;
    setImageLoading(false);
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setError("Escolha uma foto JPG, PNG ou WebP.");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setError("A foto deve ter no máximo 2 MB.");
      return;
    }
    const reader = new FileReader();
    readerRef.current = reader;
    setError("");
    setImageLoading(true);
    reader.onload = async () => {
      if (readerRef.current !== reader) return;
      try {
        const photo = reader.result;
        if (typeof photo !== "string" || !hasSupportedImageHeader(photo)) {
          throw new Error("Invalid image data");
        }
        const preview = new Image();
        preview.src = photo;
        await preview.decode();
        if (readerRef.current !== reader) return;
        if (!preview.naturalWidth || !preview.naturalHeight) {
          throw new Error("Empty image");
        }
        setImage(photo);
        setError("");
        setImageLoading(false);
      } catch {
        if (readerRef.current !== reader) return;
        setError(
          "Não foi possível abrir esta foto. Escolha uma imagem JPG, PNG ou WebP válida.",
        );
        setImageLoading(false);
      }
    };
    reader.onerror = () => {
      if (readerRef.current !== reader) return;
      setError("Não foi possível abrir esta foto. Escolha outro arquivo.");
      setImageLoading(false);
    };
    reader.readAsDataURL(file);
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const numericPrice = Number(price.replace(",", "."));
    if (
      !title.trim() ||
      !description.trim() ||
      !campus.trim() ||
      !pickupLocation.trim() ||
      !price.trim() ||
      !Number.isFinite(numericPrice) ||
      numericPrice < 0
    ) {
      setError("Preencha os dados do anúncio e informe um preço válido.");
      return;
    }
    const nextPost: ManagedPost = {
      ...post,
      id: post?.id ?? `meu-${crypto.randomUUID()}`,
      title: title.trim(),
      price: numericPrice,
      category,
      categoryLabel:
        category === post?.category
          ? post.categoryLabel
          : (formCategories.find((item) => item.id === category)?.label ??
            "Outros"),
      description: description.trim(),
      condition,
      campus: campus.trim(),
      pickupLocation: pickupLocation.trim(),
      image,
      status: post?.status ?? "active",
      badge:
        post?.status === "sold"
          ? { label: "Vendido", tone: "dark" }
          : condition === "new"
            ? { label: "Novo", tone: "orange" }
            : post?.badge?.label === "Novo"
              ? undefined
              : post?.badge,
      postedDaysAgo: post?.postedDaysAgo ?? 0,
      featured: post?.featured ?? false,
      acceptsNegotiation,
      acceptsTrade,
      views: post?.views ?? 0,
      messageCount: post?.messageCount ?? 0,
      updatedAt: new Date().toISOString(),
    };
    try {
      onSave(nextPost);
      onClose();
      onNotify(
        post ? "Alterações salvas." : "Anúncio adicionado às suas publicações.",
      );
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Não foi possível salvar o anúncio. Tente novamente.",
      );
    }
  }

  return (
    <OwnedPostDialog
      title={post ? "Editar anúncio" : "Publicar novo anúncio"}
      onClose={onClose}
      className="owned-post-editor"
    >
      <form className="owned-post-form" onSubmit={submit}>
        <div className="owned-post-photo-editor">
          <img
            src={image}
            alt="Prévia da foto do anúncio"
            width="200"
            height="150"
          />
          <div>
            <label className="owned-post-photo-upload">
              <Icon name="upload" size={17} />
              {imageLoading ? "Carregando foto..." : "Escolher foto"}
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                aria-label="Foto do anúncio"
                onChange={(event) => readPhoto(event.target.files?.[0])}
              />
            </label>
            <p>
              JPG, PNG ou WebP, até 2 MB.
              <br />
              Adicione uma foto do item para ajudar outros estudantes.
            </p>
          </div>
        </div>
        <label>
          Título do anúncio
          <input
            required
            maxLength={200}
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Ex.: Notebook para estudos"
          />
        </label>
        <div className="owned-post-form-row">
          <label>
            Preço (R$)
            <input
              required
              type="number"
              min="0"
              step="0.01"
              inputMode="decimal"
              value={price}
              onChange={(event) => setPrice(event.target.value)}
              placeholder="0,00"
            />
          </label>
          <label>
            Categoria
            <select
              value={category}
              onChange={(event) => setCategory(event.target.value)}
            >
              {formCategories.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>
        </div>
        <label>
          Descrição
          <textarea
            required
            maxLength={5000}
            rows={4}
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="Conte sobre o item, o estado de conservação e o que acompanha."
          />
        </label>
        <div className="owned-post-form-row">
          <label>
            Condição
            <select
              value={condition}
              onChange={(event) =>
                setCondition(event.target.value as Product["condition"])
              }
            >
              <option value="new">Novo / lacrado</option>
              <option value="like_new">Usado — como novo</option>
              <option value="used">Com marcas de uso</option>
            </select>
          </label>
          <label>
            Campus
            <input
              required
              maxLength={120}
              value={campus}
              onChange={(event) => setCampus(event.target.value)}
            />
          </label>
        </div>
        <label>
          Local de retirada
          <input
            required
            maxLength={120}
            value={pickupLocation}
            onChange={(event) => setPickupLocation(event.target.value)}
          />
        </label>
        <div className="owned-post-form-checkboxes">
          <label>
            <input
              type="checkbox"
              checked={acceptsNegotiation}
              onChange={(event) => setAcceptsNegotiation(event.target.checked)}
            />
            Aceita propostas
          </label>
          <label>
            <input
              type="checkbox"
              checked={acceptsTrade}
              onChange={(event) => setAcceptsTrade(event.target.checked)}
            />
            Aceita trocas
          </label>
        </div>
        {error && (
          <p className="owned-post-form-error" role="alert">
            {error}
          </p>
        )}
        <div className="owned-post-form-footer">
          <button type="button" onClick={onClose}>
            Cancelar
          </button>
          <button
            className="primary-button"
            type="submit"
            disabled={imageLoading}
          >
            <Icon name={post ? "check" : "plus"} size={17} />
            {post ? "Salvar alterações" : "Publicar anúncio"}
          </button>
        </div>
      </form>
    </OwnedPostDialog>
  );
}

function hasSupportedImageHeader(dataUrl: string) {
  const payload = dataUrl.slice(dataUrl.indexOf(",") + 1);
  const header = atob(payload.slice(0, 16));
  return (
    header.startsWith("\xff\xd8\xff") ||
    header.startsWith("\x89PNG\r\n\x1a\n") ||
    (header.startsWith("RIFF") && header.slice(8, 12) === "WEBP")
  );
}

export default MyPostsPage;
