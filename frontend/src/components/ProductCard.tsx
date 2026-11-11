import type { Product } from "../data/catalog";
import { Icon } from "./Icon";
import { followLink, productPath } from "../lib/navigation";

export const formatPrice = (value: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
    value,
  );

export function ProductCard({
  product,
  favorite,
  onToggleFavorite,
  onSelect,
  layout = "grid",
}: {
  product: Product;
  favorite: boolean;
  onToggleFavorite: (id: string) => void;
  onSelect: (product: Product) => void;
  layout?: "grid" | "list";
}) {
  const unavailableBadge =
    product.status && product.status !== "active"
      ? {
          label: {
            paused: "Pausado",
            expired: "Expirado",
            draft: "Rascunho",
            sold: "Vendido",
          }[product.status],
          tone: "dark",
        }
      : product.badge;
  return (
    <article
      className={`product-card ${layout === "list" ? "product-card--list" : ""}`}
    >
      <div className="product-picture">
        <a
          href={productPath(product.id)}
          className="product-image-button"
          onClick={(event) => followLink(event, () => onSelect(product))}
          aria-label={`Ver anúncio: ${product.title}`}
        >
          <img
            src={product.image}
            alt={product.title}
            loading="lazy"
            width="400"
            height="300"
          />
        </a>
        {unavailableBadge && (
          <span
            className={`product-badge product-badge--${unavailableBadge.tone}`}
          >
            {unavailableBadge.label}
          </span>
        )}
        <button
          className={`favorite-button ${favorite ? "is-favorite" : ""}`}
          onClick={() => onToggleFavorite(product.id)}
          aria-label={`${favorite ? "Remover dos" : "Adicionar aos"} favoritos: ${product.title}`}
          aria-pressed={favorite}
        >
          <Icon name="heart" size={17} />
        </button>
      </div>
      <a
        href={productPath(product.id)}
        className="product-info"
        onClick={(event) => followLink(event, () => onSelect(product))}
        aria-label={`Ver detalhes de ${product.title}`}
      >
        <span className="product-category">{product.categoryLabel}</span>
        <h3>{product.title}</h3>
        <strong className="product-price">{formatPrice(product.price)}</strong>
        <span className="product-meta">
          <Icon name="map-pin" size={12} />
          {product.campus}
          <span aria-hidden="true">·</span>
          {product.postedDaysAgo === 0
            ? "Hoje"
            : `${product.postedDaysAgo} ${product.postedDaysAgo === 1 ? "dia" : "dias"} atrás`}
        </span>
      </a>
    </article>
  );
}
