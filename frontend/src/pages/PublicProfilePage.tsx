import { useEffect, useMemo, useState } from "react";
import type { Product } from "../data/catalog";
import { categories } from "../data/catalog";
import { DEFAULT_AVATAR } from "../data/productDetails";
import { usePublicProfile } from "../data/publicProfile";
import { Icon } from "../components/Icon";
import { ProductCard } from "../components/ProductCard";
import { followLink } from "../lib/navigation";
import "./public-profile.css";

type Props = {
  profileId: string;
  products: Product[];
  productsLoaded: boolean;
  productsError: string | null;
  favorites: string[];
  onToggleFavorite: (id: string) => void;
  onSelectProduct: (product: Product) => void;
  onNavigateHome: () => void;
  onExplore: () => void;
  onRetryProducts: () => void;
};

const normalize = (text: string) => text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("pt-BR");
const listingCount = (count: number) => `${count} ${count === 1 ? "anúncio" : "anúncios"}`;
type Kind = "all" | "product" | "service";
type Order = "recent" | "price-asc" | "price-desc";

export function PublicProfilePage({ profileId, products, productsLoaded, productsError, favorites, onToggleFavorite, onSelectProduct, onNavigateHome, onExplore, onRetryProducts }: Props) {
  const { profile, loaded, error, notFound, reload } = usePublicProfile(profileId);
  const [search, setSearch] = useState("");
  const [kind, setKind] = useState<Kind>("all");
  const [category, setCategory] = useState("");
  const [order, setOrder] = useState<Order>("recent");
  const listings = useMemo(() => products.filter(post => post.sellerId === profileId && (!post.status || post.status === "active")), [products, profileId]);
  const counts = { all: listings.length, product: listings.filter(post => post.kind !== "service").length, service: listings.filter(post => post.kind === "service").length };
  const categoryOptions = useMemo(() => [...new Map(listings.map(post => [post.category, categories.find(item => item.id === post.category)?.label ?? post.categoryLabel])).entries()].sort((first, second) => first[1].localeCompare(second[1], "pt-BR")), [listings]);
  const visible = useMemo(() => {
    const query = normalize(search.trim());
    return listings.filter(post =>
      (kind === "all" || (post.kind ?? "product") === kind) &&
      (!category || post.category === category) &&
      (!query || normalize(`${post.title} ${post.description} ${post.categoryLabel}`).includes(query)),
    ).sort((first, second) => order === "price-asc" ? first.price - second.price : order === "price-desc" ? second.price - first.price : (Date.parse(second.publishedAt ?? "") || 0) - (Date.parse(first.publishedAt ?? "") || 0) || first.postedDaysAgo - second.postedDaysAgo);
  }, [listings, search, kind, category, order]);
  const filtered = Boolean(search.trim() || category || kind !== "all");
  const firstName = profile?.name.trim().split(/\s+/)[0] || "estudante";
  const joined = profile && Number.isFinite(Date.parse(profile.member_since))
    ? new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric", timeZone: "America/Fortaleza" }).format(new Date(profile.member_since)) : null;

  useEffect(() => {
    document.title = `${profile ? `Perfil de ${profile.name}` : notFound ? "Perfil indisponível" : "Perfil do vendedor"} | UniPlace`;
  }, [profile?.name, notFound]);

  function clearFilters() { setSearch(""); setKind("all"); setCategory(""); }

  return (
    <section className="public-profile-page" aria-labelledby="public-profile-title">
      <nav className="public-profile-breadcrumb" aria-label="Caminho da página"><a href="/" onClick={event => followLink(event, onNavigateHome)}>Início</a><span aria-hidden="true">/</span><span aria-current="page">Perfil da comunidade</span></nav>
      {!profile ? (
        <div className="public-profile-state public-profile-load" role={error && !notFound ? "alert" : "status"}>
          <span className="public-profile-state-icon"><Icon name="user" size={30} /></span>
          <h1 id="public-profile-title">{!loaded ? "Carregando perfil…" : notFound ? "Perfil indisponível" : "Não foi possível abrir este perfil"}</h1>
          <p>{!loaded ? "Estamos buscando as informações e os anúncios desta pessoa." : notFound ? "Este perfil não foi encontrado ou não está mais disponível." : error}</p>
          {loaded && (notFound ? <a href="/explorar" className="primary-button" onClick={event => followLink(event, onExplore)}>Explorar anúncios</a> : <button className="primary-button" onClick={reload}>Tentar novamente</button>)}
        </div>
      ) : (
        <>
          <header className="public-profile-heading" data-reveal><div><h1 id="public-profile-title">Anúncios de {firstName}</h1><p>Conheça o perfil e encontre seus próximos achados no campus.</p></div><span className="public-profile-heading-label"><Icon name="user" size={17} /> Perfil da comunidade</span></header>
          <div className="public-profile-layout">
            <section className="public-profile-inventory" aria-label={`Anúncios de ${profile.name}`}>
              <div className="public-profile-tabs" aria-label="Tipo de anúncio">
                {([["all", "Todos"], ["product", "Produtos"], ["service", "Serviços"]] as const).map(([value, label]) => <button type="button" key={value} aria-pressed={kind === value} disabled={!productsLoaded} onClick={() => setKind(value)}>{label}<span>{productsLoaded ? counts[value] : "—"}</span></button>)}
              </div>
              <div className="public-profile-toolbar">
                <div className="public-profile-search"><Icon name="search" size={18} /><input type="search" value={search} onChange={event => setSearch(event.target.value)} aria-label="Buscar anúncios deste perfil" placeholder="Buscar nos anúncios deste perfil…" />{search && <button type="button" aria-label="Limpar busca do perfil" onClick={() => setSearch("")}><Icon name="x" size={17} /></button>}</div>
                <label className="public-profile-select"><select aria-label="Ordenar anúncios do perfil" value={order} onChange={event => setOrder(event.target.value as Order)}><option value="recent">Mais recentes</option><option value="price-asc">Menor preço</option><option value="price-desc">Maior preço</option></select><Icon name="chevron-down" size={14} /></label>
              </div>
              <div className="public-profile-results"><span aria-live="polite">{productsLoaded ? `${listingCount(visible.length)} ${visible.length === 1 ? "disponível" : "disponíveis"}` : "Buscando anúncios…"}</span><label className="public-profile-category"><select aria-label="Filtrar anúncios do perfil por categoria" value={category} onChange={event => setCategory(event.target.value)}><option value="">Todas as categorias</option>{categoryOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select><Icon name="chevron-down" size={13} /></label>{filtered && <button type="button" className="public-profile-clear" onClick={clearFilters}>Limpar filtros</button>}</div>
              {productsError && <div className="public-profile-error" role="alert"><Icon name="info" size={19} /><p>{productsError}</p><button type="button" onClick={onRetryProducts}>Tentar novamente</button></div>}
              {!productsLoaded ? <div className="public-profile-state" role="status"><Icon name="package" size={30} /><p>{productsError ? "Os anúncios ainda não puderam ser carregados." : "Carregando os anúncios deste perfil…"}</p></div> : visible.length ? (
                <div className="public-profile-grid">{visible.map(post => <ProductCard product={post} key={post.id} favorite={favorites.includes(post.id)} onToggleFavorite={onToggleFavorite} onSelect={onSelectProduct} />)}</div>
              ) : (
                <div className="public-profile-state" data-reveal><span className="public-profile-state-icon"><Icon name={filtered ? "search" : "package"} size={28} /></span><h2>{filtered ? "Nenhum anúncio com esses filtros" : "Ainda não há anúncios por aqui"}</h2><p>{filtered ? "Tente buscar por outro termo ou limpar os filtros para ver os anúncios disponíveis." : `${firstName} ainda não tem anúncios disponíveis. Novas publicações aparecerão neste perfil.`}</p>{filtered ? <button type="button" className="public-profile-secondary" onClick={clearFilters}>Limpar filtros</button> : <a href="/explorar" className="public-profile-secondary" onClick={event => followLink(event, onExplore)}>Explorar outros anúncios</a>}</div>
              )}
            </section>

            <aside className="public-profile-sidebar" aria-label="Informações do perfil">
              <section className="public-profile-card" aria-labelledby="public-profile-name" data-reveal>
                <div className="public-profile-cover" aria-hidden="true" />
                <div className="public-profile-identity"><img src={profile.avatar || DEFAULT_AVATAR} alt={`Foto de ${profile.name}`} width="88" height="88" /><h2 id="public-profile-name">{profile.name}</h2><span><Icon name="graduation" size={17} /> Comunidade UniPlace</span></div>
                <div className="public-profile-stat"><span className="public-profile-stat-icon"><Icon name="bag" size={22} /></span><div><strong>{profile.active_posts}</strong><span>{profile.active_posts === 1 ? "anúncio disponível" : "anúncios disponíveis"}</span></div></div>
                <div className="public-profile-facts">
                  {joined && <div className="public-profile-fact"><Icon name="calendar" size={19} /><div><span>Membro desde</span><strong><time dateTime={profile.member_since}>{joined}</time></strong></div></div>}
                  {profile.campuses.length > 0 && <div className="public-profile-fact"><Icon name="map-pin" size={19} /><div><span>{profile.campuses.length === 1 ? "Campus dos anúncios" : "Campi dos anúncios"}</span>{profile.campuses.map(campus => <div className="public-profile-campus" key={campus.id}><strong>{campus.name}</strong><small>{campus.city} · {campus.state}</small></div>)}</div></div>}
                </div>
              </section>
              <div className="public-profile-tip" data-reveal><Icon name="chat" size={22} /><div><strong>{profile.active_posts ? "Converse pelo anúncio" : "Mais achados no campus"}</strong><p>{profile.active_posts ? `Abra um anúncio de ${firstName} para conversar e combinar os detalhes da negociação.` : "Explore os anúncios de outros estudantes da comunidade."}</p></div></div>
            </aside>
          </div>
        </>
      )}
    </section>
  );
}
