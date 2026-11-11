import { useEffect, useMemo, useState } from "react";
import { catalogGroups, categories, type Product } from "../data/catalog";
import { Icon } from "../components/Icon";
import { ProductCard } from "../components/ProductCard";
import "./explore.css";

type ExplorePageProps = {
  products: Product[];
  favorites: string[];
  onToggleFavorite: (id: string) => void;
  onSelectProduct: (product: Product) => void;
  search: string;
  initialCategory?: string;
  onNavigateHome: () => void;
  favoritesOnly?: boolean;
  sellerName?: string;
  sellerUnavailable?: boolean;
  onClearSeller?: () => void;
};

type Condition = Product["condition"];
type SortOrder = "recent" | "price-asc" | "price-desc" | "name";
type FilterChip = { id: string; label: string; remove: () => void };

const conditionOptions: { value: Condition; label: string }[] = [
  { value: "new", label: "Novo / lacrado" },
  { value: "like_new", label: "Usado · como novo" },
  { value: "used", label: "Marcas de uso normais" },
];

const pricePresets = [
  { label: "Até R$ 100", min: "", max: "100" },
  { label: "Até R$ 500", min: "", max: "500" },
  { label: "Até R$ 1.500", min: "", max: "1500" },
  { label: "R$ 3.000 +", min: "3000", max: "" },
];

const normalize = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("pt-BR");

const money = (value: string) =>
  Number(value).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  });

export function ExplorePage({
  products,
  favorites,
  onToggleFavorite,
  onSelectProduct,
  search,
  initialCategory = "",
  onNavigateHome,
  favoritesOnly = false,
  sellerName,
  sellerUnavailable = false,
  onClearSeller,
}: ExplorePageProps) {
  const [category, setCategory] = useState(
    initialCategory === "mais" ? "" : initialCategory,
  );
  const [priceMin, setPriceMin] = useState("");
  const [priceMax, setPriceMax] = useState("");
  const [conditions, setConditions] = useState<Condition[]>([]);
  const [pickupLocations, setPickupLocations] = useState<string[]>([]);
  const [hasPhotos, setHasPhotos] = useState(false);
  const [acceptsNegotiation, setAcceptsNegotiation] = useState(false);
  const [acceptsTrade, setAcceptsTrade] = useState(false);
  const [sortOrder, setSortOrder] = useState<SortOrder>("recent");
  const [layout, setLayout] = useState<"grid" | "list">("grid");
  const [filtersOpen, setFiltersOpen] = useState(false);

  useEffect(() => {
    setCategory(initialCategory === "mais" ? "" : initialCategory);
  }, [initialCategory]);

  useEffect(() => {
    setPriceMin("");
    setPriceMax("");
    setConditions([]);
    setPickupLocations([]);
    setHasPhotos(false);
    setAcceptsNegotiation(false);
    setAcceptsTrade(false);
  }, [favoritesOnly]);

  const baseProducts = useMemo(
    () =>
      favoritesOnly
        ? products.filter((product) => favorites.includes(product.id))
        : products.filter(
            (product) => !product.status || product.status === "active",
          ),
    [products, favorites, favoritesOnly],
  );

  const selectedGroup = catalogGroups.find((group) => group.id === category);
  const categoryLabel =
    selectedGroup?.label ??
    categories.find((item) => item.id === category)?.label ??
    "Categoria selecionada";
  const allPickupLocations = useMemo(
    () =>
      [
        ...new Set(
          baseProducts.map(
            (product) => `${product.campus} · ${product.pickupLocation}`,
          ),
        ),
      ].sort((a, b) => a.localeCompare(b, "pt-BR")),
    [baseProducts],
  );

  const filteredProducts = useMemo(() => {
    const query = normalize(search.trim());
    const result = baseProducts.filter((product) => {
      if (
        query &&
        !normalize(
          `${product.title} ${product.categoryLabel} ${product.description}`,
        ).includes(query)
      )
        return false;
      if (
        category &&
        !(selectedGroup
          ? selectedGroup.categories.includes(product.category)
          : product.category === category)
      )
        return false;
      if (priceMin !== "" && product.price < Math.max(0, Number(priceMin)))
        return false;
      if (priceMax !== "" && product.price > Math.max(0, Number(priceMax)))
        return false;
      if (
        conditions.length &&
        (product.kind === "service" || !conditions.includes(product.condition))
      )
        return false;
      if (
        pickupLocations.length &&
        !pickupLocations.includes(
          `${product.campus} · ${product.pickupLocation}`,
        )
      )
        return false;
      if (hasPhotos && !product.image) return false;
      if (acceptsNegotiation && !product.acceptsNegotiation) return false;
      if (acceptsTrade && !product.acceptsTrade) return false;
      return true;
    });

    return result.sort((a, b) => {
      if (sortOrder === "price-asc") return a.price - b.price;
      if (sortOrder === "price-desc") return b.price - a.price;
      if (sortOrder === "name") return a.title.localeCompare(b.title, "pt-BR");
      return a.postedDaysAgo - b.postedDaysAgo;
    });
  }, [
    baseProducts,
    search,
    category,
    selectedGroup,
    priceMin,
    priceMax,
    conditions,
    pickupLocations,
    hasPhotos,
    acceptsNegotiation,
    acceptsTrade,
    sortOrder,
  ]);

  function clearFilters() {
    setCategory("");
    setPriceMin("");
    setPriceMax("");
    setConditions([]);
    setPickupLocations([]);
    setHasPhotos(false);
    setAcceptsNegotiation(false);
    setAcceptsTrade(false);
    if (sellerName || sellerUnavailable) onClearSeller?.();
  }

  function toggleCondition(value: Condition) {
    setConditions((previous) =>
      previous.includes(value)
        ? previous.filter((item) => item !== value)
        : [...previous, value],
    );
  }

  function togglePickupLocation(value: string) {
    setPickupLocations((previous) =>
      previous.includes(value)
        ? previous.filter((item) => item !== value)
        : [...previous, value],
    );
  }

  const chips: FilterChip[] = [];
  if (sellerUnavailable)
    chips.push({
      id: "seller-unavailable",
      label: "Vendedor indisponível",
      remove: () => onClearSeller?.(),
    });
  if (sellerName)
    chips.push({
      id: "seller",
      label: `Vendedor: ${sellerName}`,
      remove: () => onClearSeller?.(),
    });
  if (category)
    chips.push({
      id: "category",
      label: categoryLabel,
      remove: () => setCategory(""),
    });
  if (priceMin)
    chips.push({
      id: "min",
      label: `A partir de ${money(priceMin)}`,
      remove: () => setPriceMin(""),
    });
  if (priceMax)
    chips.push({
      id: "max",
      label: `Até ${money(priceMax)}`,
      remove: () => setPriceMax(""),
    });
  conditions.forEach((condition) =>
    chips.push({
      id: condition,
      label: conditionOptions.find((option) => option.value === condition)!
        .label,
      remove: () => toggleCondition(condition),
    }),
  );
  pickupLocations.forEach((location) =>
    chips.push({
      id: `pickup-${location}`,
      label: location,
      remove: () => togglePickupLocation(location),
    }),
  );
  if (hasPhotos)
    chips.push({
      id: "photos",
      label: "Com fotos",
      remove: () => setHasPhotos(false),
    });
  if (acceptsNegotiation)
    chips.push({
      id: "negotiation",
      label: "Aceita propostas",
      remove: () => setAcceptsNegotiation(false),
    });
  if (acceptsTrade)
    chips.push({
      id: "trade",
      label: "Aceita trocas",
      remove: () => setAcceptsTrade(false),
    });

  return (
    <div className="explore-page">
      <nav className="explore-breadcrumb" aria-label="Caminho da página">
        <button type="button" onClick={onNavigateHome}>
          Início
        </button>
        <span aria-hidden="true">/</span>
        <span>Anúncios</span>
        <span aria-hidden="true">/</span>
        <span aria-current="page">
          {favoritesOnly ? "Favoritos" : "Todos os anúncios"}
        </span>
      </nav>

      <div className="explore-heading">
        <div>
          <h1>
            {favoritesOnly
              ? "Seus favoritos"
              : sellerUnavailable
                ? "Vendedor não encontrado"
                : sellerName
                  ? `Anúncios de ${sellerName}`
                  : "Todos os Anúncios"}
          </h1>
          <p>
            {favoritesOnly
              ? "Os seus achados do campus, salvos em um só lugar."
              : "Explore ofertas de estudantes do campus, compre com segurança e retire em mãos."}
          </p>
        </div>
        <div className="explore-toolbar">
          <label className="explore-sort">
            <span>Ordenar por:</span>
            <select
              aria-label="Ordenar anúncios"
              value={sortOrder}
              onChange={(event) =>
                setSortOrder(event.target.value as SortOrder)
              }
            >
              <option value="recent">Mais recentes</option>
              <option value="price-asc">Menor preço</option>
              <option value="price-desc">Maior preço</option>
              <option value="name">Nome: A a Z</option>
            </select>
            <Icon name="chevron-down" size={13} />
          </label>
          <div
            className="explore-view-switch"
            aria-label="Visualização dos anúncios"
          >
            <button
              type="button"
              aria-label="Visualizar em grade"
              aria-pressed={layout === "grid"}
              className={layout === "grid" ? "is-active" : ""}
              onClick={() => setLayout("grid")}
            >
              <Icon name="grid" size={17} />
            </button>
            <button
              type="button"
              aria-label="Visualizar em lista"
              aria-pressed={layout === "list"}
              className={layout === "list" ? "is-active" : ""}
              onClick={() => setLayout("list")}
            >
              <Icon name="list" size={17} />
            </button>
          </div>
        </div>
      </div>

      <div className="explore-active-filters">
        <button
          type="button"
          className="explore-mobile-filter"
          aria-expanded={filtersOpen}
          aria-controls="catalog-filters"
          onClick={() => setFiltersOpen(!filtersOpen)}
        >
          <Icon name="sliders" size={16} /> Filtros{" "}
          {chips.length > 0 && <span>{chips.length}</span>}
        </button>
        <span className="explore-filter-caption">
          {chips.length ? "Filtros ativos:" : "Encontre seu próximo achado"}
        </span>
        {chips.map((chip) => (
          <button
            type="button"
            className="explore-filter-chip"
            key={chip.id}
            onClick={chip.remove}
            aria-label={`Remover filtro: ${chip.label}`}
          >
            {chip.label}
            <Icon name="x" size={12} />
          </button>
        ))}
        {chips.length > 0 && (
          <button
            className="explore-clear"
            type="button"
            onClick={clearFilters}
          >
            Limpar filtros
          </button>
        )}
        <span className="explore-results-count" role="status">
          {filteredProducts.length}{" "}
          {filteredProducts.length === 1 ? "anúncio" : "anúncios"}
        </span>
      </div>

      <div className="explore-layout">
        <aside
          id="catalog-filters"
          className={`explore-filters${filtersOpen ? " is-open" : ""}`}
          aria-label="Filtrar anúncios"
        >
          <div className="explore-mobile-filter-heading">
            <strong>Filtrar anúncios</strong>
            <button
              type="button"
              aria-label="Fechar filtros"
              onClick={() => setFiltersOpen(false)}
            >
              <Icon name="x" size={20} />
            </button>
          </div>
          <section className="explore-filter-panel explore-categories">
            <div className="explore-filter-panel-title">
              <h2>Categorias</h2>
              <span>{catalogGroups.length} grupos</span>
            </div>
            <button
              type="button"
              className={`explore-category-option${!category ? " is-selected" : ""}`}
              aria-pressed={!category}
              onClick={() => setCategory("")}
            >
              <span>
                <i />
                Todas as categorias
              </span>
              <span className="explore-category-count">
                {baseProducts.length}
              </span>
            </button>
            {catalogGroups.map((group) => (
              <button
                type="button"
                key={group.id}
                className={`explore-category-option${category === group.id || group.categories.includes(category) ? " is-selected" : ""}`}
                aria-pressed={
                  category === group.id || group.categories.includes(category)
                }
                onClick={() =>
                  setCategory(category === group.id ? "" : group.id)
                }
              >
                <span>{group.label}</span>
                <span className="explore-category-count">
                  {
                    baseProducts.filter((product) =>
                      group.categories.includes(product.category),
                    ).length
                  }
                </span>
              </button>
            ))}
          </section>

          <section className="explore-filter-panel">
            <h2>Faixa de Preço</h2>
            <div className="explore-price-inputs">
              <label>
                <span>MÍNIMO</span>
                <div>
                  <span>R$</span>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    inputMode="decimal"
                    placeholder="0"
                    aria-label="Preço mínimo"
                    value={priceMin}
                    onChange={(event) => setPriceMin(event.target.value)}
                  />
                </div>
              </label>
              <label>
                <span>MÁXIMO</span>
                <div>
                  <span>R$</span>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    inputMode="decimal"
                    placeholder="Sem limite"
                    aria-label="Preço máximo"
                    value={priceMax}
                    onChange={(event) => setPriceMax(event.target.value)}
                  />
                </div>
              </label>
            </div>
            <div className="explore-price-presets">
              {pricePresets.map((preset) => (
                <button
                  type="button"
                  key={preset.label}
                  className={
                    priceMin === preset.min && priceMax === preset.max
                      ? "is-selected"
                      : ""
                  }
                  aria-pressed={
                    priceMin === preset.min && priceMax === preset.max
                  }
                  onClick={() => {
                    setPriceMin(preset.min);
                    setPriceMax(preset.max);
                  }}
                >
                  {preset.label}
                </button>
              ))}
            </div>
            {priceMin && priceMax && Number(priceMin) > Number(priceMax) && (
              <p className="explore-price-error">
                O valor mínimo deve ser menor que o máximo.
              </p>
            )}
          </section>

          <section className="explore-filter-panel">
            <h2>Condição do Item</h2>
            <div className="explore-checkbox-options">
              {conditionOptions.map((option) => (
                <label key={option.value}>
                  <input
                    type="checkbox"
                    checked={conditions.includes(option.value)}
                    onChange={() => toggleCondition(option.value)}
                  />
                  <span>{option.label}</span>
                </label>
              ))}
            </div>
          </section>

          <section className="explore-filter-panel">
            <h2>Local de Retirada</h2>
            <div className="explore-checkbox-options">
              {allPickupLocations.map((location) => (
                <label key={location}>
                  <input
                    type="checkbox"
                    checked={pickupLocations.includes(location)}
                    onChange={() => togglePickupLocation(location)}
                  />
                  <span>{location}</span>
                </label>
              ))}
            </div>
          </section>

          <section className="explore-filter-panel explore-extra-filters">
            <label>
              <span>Apenas com fotos</span>
              <input
                type="checkbox"
                checked={hasPhotos}
                onChange={(event) => setHasPhotos(event.target.checked)}
              />
            </label>
            <label>
              <span>Aceita propostas</span>
              <input
                type="checkbox"
                checked={acceptsNegotiation}
                onChange={(event) =>
                  setAcceptsNegotiation(event.target.checked)
                }
              />
            </label>
            <label>
              <span>Aceita trocas</span>
              <input
                type="checkbox"
                checked={acceptsTrade}
                onChange={(event) => setAcceptsTrade(event.target.checked)}
              />
            </label>
          </section>
          <button
            className="explore-apply-filters"
            type="button"
            onClick={() => setFiltersOpen(false)}
          >
            Ver {filteredProducts.length}{" "}
            {filteredProducts.length === 1 ? "anúncio" : "anúncios"}
            <Icon name="chevron-right" size={16} />
          </button>
        </aside>

        <section
          className={`explore-products explore-products--${layout}`}
          aria-label={
            favoritesOnly ? "Anúncios favoritos" : "Resultados dos anúncios"
          }
        >
          {filteredProducts.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              favorite={favorites.includes(product.id)}
              onToggleFavorite={onToggleFavorite}
              onSelect={onSelectProduct}
              layout={layout}
            />
          ))}
          {filteredProducts.length === 0 && (
            <div className="explore-empty-state">
              <div>
                <Icon
                  name={
                    favoritesOnly && !baseProducts.length ? "heart" : "search"
                  }
                  size={30}
                />
              </div>
              <h2>
                {favoritesOnly && !baseProducts.length
                  ? "Seus favoritos começam aqui"
                  : "Nenhum anúncio por aqui"}
              </h2>
              <p>
                {favoritesOnly && !baseProducts.length
                  ? "Toque no coração de um anúncio para salvá-lo e encontrar depois."
                  : search.trim()
                    ? "Tente outro termo de busca ou ajuste os filtros para encontrar mais opções."
                    : "Experimente ajustar os filtros para descobrir outros achados do campus."}
              </p>
              {chips.length > 0 && (
                <button type="button" onClick={clearFilters}>
                  Limpar filtros
                </button>
              )}
              {favoritesOnly && !baseProducts.length && (
                <button type="button" onClick={onNavigateHome}>
                  Descobrir anúncios
                  <Icon name="chevron-right" size={15} />
                </button>
              )}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

export default ExplorePage;
