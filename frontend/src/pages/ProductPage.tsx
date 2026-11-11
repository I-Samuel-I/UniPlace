import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import type { Product } from "../data/catalog";
import { catalogGroups, categories } from "../data/catalog";
import {
  getProductDetails,
  getSeller,
  getSellerProducts,
} from "../data/productDetails";
import { Icon } from "../components/Icon";
import { ProductCard, formatPrice } from "../components/ProductCard";
import { followLink, productPath } from "../lib/navigation";
import "./product.css";

type ProductPageProps = {
  product: Product;
  favorites: string[];
  onToggleFavorite: (id: string) => void;
  onSelectProduct: (product: Product) => void;
  onNavigateHome: () => void;
  onExplore: (category?: string) => void;
  onExploreSeller: (sellerId: string) => void;
  onNotify: (message: string) => void;
  onOpenChat: (product: Product) => void;
  ownProduct?: boolean;
  sellerProducts?: Product[];
};

type Action = "gallery" | "seller" | "report" | "support" | "share" | null;

export function ProductPage({
  product,
  favorites,
  onToggleFavorite,
  onSelectProduct,
  onNavigateHome,
  onExplore,
  onExploreSeller,
  onNotify,
  onOpenChat,
  ownProduct = false,
  sellerProducts,
}: ProductPageProps) {
  const details = getProductDetails(product);
  const seller = getSeller(details.sellerId);
  const sellerInventory = sellerProducts ?? getSellerProducts(seller.id);
  const relatedProducts = sellerInventory.filter(
    (item) => item.id !== product.id,
  );
  const [photoIndex, setPhotoIndex] = useState(0);
  const [action, setAction] = useState<Action>(null);
  const [shareUrl, setShareUrl] = useState("");
  const photos = details.photos.length
    ? details.photos
    : [{ src: product.image, alt: product.title }];
  const currentPhoto = photos[photoIndex] ?? photos[0];
  const favorite = favorites.includes(product.id);
  const unavailable = Boolean(product.status && product.status !== "active");
  const availability =
    product.status === "sold"
      ? "Produto vendido"
      : product.status === "paused"
        ? "Anúncio pausado"
        : product.status === "expired"
          ? "Anúncio expirado"
          : product.status === "draft"
            ? "Rascunho"
            : "Produto disponível";
  const categoryGroup = catalogGroups.find((group) =>
    group.categories.includes(product.category),
  );
  const categoryIcon =
    categories.find((category) => category.id === product.category)?.icon ??
    "package";
  const publicationDate = new Intl.DateTimeFormat("pt-BR", {
    timeZone: "UTC",
  }).format(new Date(details.publishedAt));

  function movePhoto(direction: number) {
    setPhotoIndex(
      (index) => (index + direction + photos.length) % photos.length,
    );
  }

  useEffect(() => {
    if (action !== "gallery") return;
    const handleKey = (event: KeyboardEvent) => {
      if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
      event.preventDefault();
      const direction = event.key === "ArrowLeft" ? -1 : 1;
      setPhotoIndex(
        (index) => (index + direction + photos.length) % photos.length,
      );
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [action, photos.length]);

  async function shareProduct() {
    const url = new URL(productPath(product.id), window.location.origin).href;
    setShareUrl(url);
    if (navigator.share) {
      try {
        await navigator.share({
          title: product.title,
          text: `Confira este anúncio no UniPlace: ${product.title}`,
          url,
        });
        return;
      } catch (error) {
        if (error instanceof Error && error.name === "AbortError") return;
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      onNotify("Link do anúncio copiado!");
    } catch {
      setAction("share");
    }
  }

  return (
    <div className="product-page">
      <nav className="product-breadcrumb" aria-label="Caminho da página">
        <a href="/" onClick={(event) => followLink(event, onNavigateHome)}>
          Início
        </a>
        <Icon name="chevron-right" size={11} />
        <a
          href={`/explorar?categoria=${categoryGroup?.id ?? product.category}`}
          onClick={(event) =>
            followLink(event, () =>
              onExplore(categoryGroup?.id ?? product.category),
            )
          }
        >
          {product.category === "eletronicos"
            ? "Eletrônicos e Informática"
            : (categoryGroup?.label ?? product.categoryLabel)}
        </a>
        <Icon name="chevron-right" size={11} />
        <a
          href={`/explorar?categoria=${product.category}`}
          onClick={(event) =>
            followLink(event, () => onExplore(product.category))
          }
        >
          {product.categoryLabel}
        </a>
        <Icon name="chevron-right" size={11} />
        <span aria-current="page">{product.title}</span>
      </nav>

      <div className="product-page-layout">
        <div className="product-main">
          <section className="product-overview" aria-labelledby="product-title">
            <div className="product-gallery" aria-label="Fotos do produto">
              <div className="gallery-main">
                <button
                  className="gallery-open"
                  onClick={() => setAction("gallery")}
                  aria-label={`Ampliar foto ${photoIndex + 1} de ${photos.length}: ${product.title}`}
                >
                  <img
                    src={currentPhoto.src}
                    alt={currentPhoto.alt}
                    width="720"
                    height="540"
                    fetchPriority="high"
                  />
                </button>
                <span className="gallery-photo-count">
                  <Icon name="image" size={13} />
                  {photos.length} {photos.length === 1 ? "foto" : "fotos"}
                </span>
                <button
                  className={`gallery-favorite favorite-button ${favorite ? "is-favorite" : ""}`}
                  onClick={() => onToggleFavorite(product.id)}
                  aria-label={`${favorite ? "Remover dos" : "Adicionar aos"} favoritos: ${product.title}`}
                  aria-pressed={favorite}
                >
                  <Icon name="heart" size={18} />
                </button>
                {photos.length > 1 && (
                  <>
                    <button
                      className="gallery-arrow--prev"
                      aria-label="Foto anterior"
                      onClick={() => movePhoto(-1)}
                    >
                      <Icon name="chevron-left" size={18} />
                    </button>
                    <button
                      className="gallery-arrow--next"
                      aria-label="Próxima foto"
                      onClick={() => movePhoto(1)}
                    >
                      <Icon name="chevron-right" size={18} />
                    </button>
                  </>
                )}
              </div>
              {photos.length > 1 && (
                <div className="gallery-thumbnails" aria-label="Escolher foto">
                  {photos.map((photo, index) => (
                    <button
                      key={photo.src}
                      className={index === photoIndex ? "is-active" : ""}
                      onClick={() => setPhotoIndex(index)}
                      aria-label={`Ver foto ${index + 1} de ${photos.length}`}
                      aria-pressed={index === photoIndex}
                    >
                      <img
                        src={photo.src}
                        alt={photo.alt}
                        loading="lazy"
                        width="100"
                        height="75"
                      />
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="product-summary">
              <div className="product-publication">
                <span
                  className={`availability-badge${unavailable ? " is-sold" : ""}`}
                >
                  {availability}
                </span>
                <time dateTime={details.publishedAt}>
                  Publicado em {publicationDate}
                </time>
              </div>
              <h1 id="product-title">{product.title}</h1>
              <a
                className="product-summary-category"
                href={`/explorar?categoria=${product.category}`}
                onClick={(event) =>
                  followLink(event, () => onExplore(product.category))
                }
              >
                <Icon name={categoryIcon} size={15} />
                {product.categoryLabel}
              </a>
              <strong className="product-detail-price">
                {formatPrice(product.price)}
              </strong>
              <p className="product-short-description">
                {product.description.split("\n\n")[0]}
              </p>
              <button
                className="product-contact primary-button"
                disabled={unavailable && !ownProduct}
                onClick={() => onOpenChat(product)}
              >
                <Icon name="chat" size={18} />
                {ownProduct
                  ? "Ver conversas do anúncio"
                  : unavailable
                    ? availability
                    : "Conversar com o vendedor"}
              </button>
              <div className="product-secondary-actions">
                <button className="product-share" onClick={shareProduct}>
                  <Icon name="share" size={15} />
                  Compartilhar
                </button>
                <button
                  className="product-report"
                  onClick={() => setAction("report")}
                >
                  <Icon name="alert" size={15} />
                  Denunciar anúncio
                </button>
              </div>
            </div>
          </section>

          <section
            className="product-information"
            aria-labelledby="product-information-title"
          >
            <h2 id="product-information-title">Informações do produto</h2>
            <div className="product-information-columns">
              <dl className="product-specifications">
                {details.specifications.map((specification) => (
                  <div key={specification.label}>
                    <dt>
                      <Icon name={specification.icon} size={15} />
                      {specification.label}
                    </dt>
                    <dd>{specification.value}</dd>
                  </div>
                ))}
              </dl>
              <div className="product-full-description">
                <h3>Descrição completa</h3>
                <p>{product.description}</p>
                {product.id === "macbook-air-m1-8gb-256gb" && (
                  <p>Motivo: migração para desktop.</p>
                )}
                <div className="product-tags">
                  <h3>Tags</h3>
                  <div>
                    {details.tags.map((tag) => (
                      <span key={tag}>{tag}</span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </section>
        </div>

        <aside className="product-side" aria-label="Vendedor e localização">
          <section className="seller-card" aria-labelledby="seller-name">
            <div className="seller-identity">
              <img
                src={seller.avatar}
                alt={`Foto de ${seller.name}`}
                width="48"
                height="48"
              />
              <div className="seller-identity-copy">
                <h2 id="seller-name">{seller.name}</h2>
                <span
                  className={`seller-presence${seller.online ? " is-online" : ""}`}
                >
                  <i />
                  {seller.online ? "Online" : "Offline"}
                </span>
                <span className="seller-since">
                  Membro desde {seller.memberSince}
                </span>
              </div>
            </div>
            <div className="seller-rating">
              <Icon name="star" size={16} />
              <strong>
                {seller.rating.toLocaleString("pt-BR", {
                  minimumFractionDigits: 1,
                })}
              </strong>
              <span>({seller.reviewCount} avaliações)</span>
            </div>
            <blockquote className="seller-testimonial">
              “{seller.testimonial}”
            </blockquote>
            <button
              className="seller-profile-button"
              onClick={() => setAction("seller")}
            >
              Ver perfil completo
            </button>
          </section>

          <section className="location-card" aria-labelledby="location-title">
            <div className="location-heading">
              <h2 id="location-title">
                <Icon name="map-pin" size={16} />
                Localização
              </h2>
              <span>{details.location.campusName}</span>
            </div>
            <div className="location-map">
              <CampusMap />
              <a
                className="location-map-open"
                href={details.location.mapUrl}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`Ver ${details.location.label} no mapa (abre em outra aba)`}
              >
                <Icon name="map-pin" size={13} />
                Ver no mapa
              </a>
            </div>
          </section>

          <section className="trust-card">
            <span className="trust-icon">
              <Icon name="shield" size={20} />
            </span>
            <div className="trust-copy">
              <h2>Compra segura</h2>
              <p>
                Negocie com tranquilidade. O UniPlace conecta estudantes para
                combinar a compra e a retirada no campus.
              </p>
            </div>
          </section>
          <section className="support-card">
            <div className="support-info">
              <span className="support-icon">
                <Icon name="help" size={20} />
              </span>
              <div className="support-copy">
                <h2>Dúvidas?</h2>
                <p>Use o chat de suporte para mais informações.</p>
              </div>
            </div>
            <button
              className="support-button"
              onClick={() => setAction("support")}
            >
              <Icon name="headphones" size={15} />
              Falar com o suporte
            </button>
          </section>
        </aside>
      </div>

      {relatedProducts.length > 0 && (
        <section className="seller-more" aria-labelledby="seller-more-title">
          <div className="seller-more-heading">
            <h2 id="seller-more-title">Mais anúncios do vendedor</h2>
            <a
              className="text-link"
              href={`/explorar?vendedor=${seller.id}`}
              onClick={(event) =>
                followLink(event, () => onExploreSeller(seller.id))
              }
            >
              Ver todos <span aria-hidden="true">→</span>
            </a>
          </div>
          <div className="seller-products">
            {relatedProducts.slice(0, 5).map((item) => (
              <ProductCard
                key={item.id}
                product={item}
                favorite={favorites.includes(item.id)}
                onToggleFavorite={onToggleFavorite}
                onSelect={onSelectProduct}
              />
            ))}
          </div>
        </section>
      )}

      {action === "gallery" && (
        <ProductActionDialog
          className="product-lightbox"
          title="Fotos do produto"
          onClose={() => setAction(null)}
        >
          <div className="lightbox-toolbar">
            <span>{product.title}</span>
            <span aria-live="polite">
              {photoIndex + 1} / {photos.length}
            </span>
          </div>
          <img
            className="lightbox-image"
            src={currentPhoto.src}
            alt={currentPhoto.alt}
          />
          {photos.length > 1 && (
            <div className="lightbox-controls">
              <button
                aria-label="Foto anterior ampliada"
                onClick={() => movePhoto(-1)}
              >
                <Icon name="chevron-left" />
                Anterior
              </button>
              <button
                aria-label="Próxima foto ampliada"
                onClick={() => movePhoto(1)}
              >
                Próxima
                <Icon name="chevron-right" />
              </button>
            </div>
          )}
        </ProductActionDialog>
      )}
      {action === "seller" && (
        <ProductActionDialog
          title="Perfil do vendedor"
          onClose={() => setAction(null)}
        >
          <div className="seller-identity">
            <img src={seller.avatar} alt={seller.name} width="56" height="56" />
            <div className="seller-identity-copy">
              <h3>{seller.name}</h3>
              <span className="seller-since">
                Membro desde {seller.memberSince}
              </span>
            </div>
          </div>
          <div className="seller-rating">
            <Icon name="star" size={18} />
            <strong>
              {seller.rating.toLocaleString("pt-BR", {
                minimumFractionDigits: 1,
              })}
            </strong>
            <span>({seller.reviewCount} avaliações)</span>
          </div>
          <blockquote className="seller-testimonial">
            “{seller.testimonial}”
          </blockquote>
          <p>{sellerInventory.length} anúncios disponíveis na comunidade.</p>
          <button
            className="primary-button product-action-submit"
            onClick={() => onExploreSeller(seller.id)}
          >
            Ver anúncios de {seller.name.split(" ")[0]}
            <Icon name="arrow-right" size={17} />
          </button>
        </ProductActionDialog>
      )}
      {action === "report" && (
        <ProductActionDialog
          title="Denunciar anúncio"
          onClose={() => setAction(null)}
        >
          <p>O envio de denúncias ainda não está disponível nesta versão.</p>
          <p>
            Se uma oferta parecer suspeita, evite pagamentos antecipados e
            combine a conferência do produto em um local público do campus.
          </p>
          <button
            className="primary-button product-action-submit"
            onClick={() => setAction(null)}
          >
            Entendi
          </button>
        </ProductActionDialog>
      )}
      {action === "support" && (
        <ProductActionDialog
          title="Como podemos ajudar?"
          onClose={() => setAction(null)}
        >
          <p>
            Confira as informações do produto e combine a retirada em um local
            público do campus. Verifique o estado do item antes de concluir a
            compra.
          </p>
          <p>O chat de suporte ainda não está disponível nesta versão.</p>
          <button
            className="primary-button product-action-submit"
            onClick={() => setAction(null)}
          >
            Voltar ao anúncio
          </button>
        </ProductActionDialog>
      )}
      {action === "share" && (
        <ProductActionDialog
          title="Compartilhar anúncio"
          onClose={() => setAction(null)}
        >
          <p>Copie o link abaixo para compartilhar este achado:</p>
          <input
            className="product-share-url"
            aria-label="Link do anúncio"
            value={shareUrl}
            readOnly
            onFocus={(event) => event.currentTarget.select()}
          />
          <button
            className="primary-button product-action-submit"
            onClick={() => setAction(null)}
          >
            Concluir
          </button>
        </ProductActionDialog>
      )}
    </div>
  );
}

function ProductActionDialog({
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
      className={`product-action-dialog ${className}`}
      aria-labelledby="product-action-title"
      onCancel={onClose}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="product-action-dialog-content">
        <div className="product-action-dialog-header">
          <h2 id="product-action-title">{title}</h2>
          <button className="icon-button" aria-label="Fechar" onClick={onClose}>
            <Icon name="x" />
          </button>
        </div>
        {children}
      </div>
    </dialog>
  );
}

function CampusMap() {
  return (
    <svg
      viewBox="0 0 330 135"
      fill="none"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
    >
      <rect width="330" height="135" rx="12" fill="#ECFBF5" />
      <path
        d="m53-10 24 145M231-10l-29 145M143-10l29 145"
        stroke="#DDF3E9"
        strokeWidth="4"
      />
      <path
        d="M-10 39C36 62 61 61 92 40s48-41 80-14 55 90 85 91 42-37 49-81"
        stroke="#D4E6E8"
        strokeWidth="6"
        strokeLinecap="round"
      />
      <rect x="38" y="18" width="29" height="30" rx="3" fill="#E0F7EC" />
      <rect x="229" y="55" width="40" height="34" rx="3" fill="#E1F0F8" />
      <g transform="translate(153 57)">
        <path
          d="M23 10c0 8-11 18-11 18S1 18 1 10a11 11 0 1 1 22 0Z"
          fill="#FF6535"
        />
        <circle cx="12" cy="10" r="3.5" fill="white" />
      </g>
    </svg>
  );
}

export function ProductNotFound({ onExplore }: { onExplore: () => void }) {
  return (
    <div className="product-not-found">
      <Icon name="package" size={44} />
      <h1>Anúncio não encontrado</h1>
      <p>Este anúncio não está disponível ou o endereço está incorreto.</p>
      <a
        className="primary-button"
        href="/explorar"
        onClick={(event) => followLink(event, onExplore)}
      >
        Explorar anúncios
        <Icon name="arrow-right" size={17} />
      </a>
    </div>
  );
}
