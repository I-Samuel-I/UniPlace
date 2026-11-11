import { useState } from "react";
import type { Product } from "../data/catalog";
import { categories } from "../data/catalog";
import { Icon } from "../components/Icon";
import { ProductCard } from "../components/ProductCard";
import { HeroIllustration } from "../components/HeroIllustration";

const slides = [
  {
    title: (
      <>
        Tudo o que você precisa,
        <br />
        <em>em um só lugar.</em>
      </>
    ),
    description:
      "Compre, venda e conecte-se com outros estudantes da sua faculdade.",
    action: "Explorar anúncios",
  },
  {
    title: (
      <>
        Seu próximo achado
        <br />
        <em>está no campus.</em>
      </>
    ),
    description:
      "De livros a eletrônicos: encontre o que precisa pertinho de você.",
    action: "Encontrar meu próximo achado",
  },
  {
    title: (
      <>
        Mais conexões.
        <br />
        <em>Novas possibilidades.</em>
      </>
    ),
    description:
      "Dê uma nova história ao que você já não usa e faça parte da comunidade.",
    action: "Conhecer a comunidade",
  },
];

export function HomePage({
  products,
  favorites,
  onToggleFavorite,
  onSelectProduct,
  onExplore,
}: {
  products: Product[];
  favorites: string[];
  onToggleFavorite: (id: string) => void;
  onSelectProduct: (product: Product) => void;
  onExplore: (category?: string) => void;
}) {
  const [slide, setSlide] = useState(0);
  const visible = products.filter(
    (p) => !p.status || p.status === "active" || p.status === "sold",
  );
  // Destaques definidos pela administração primeiro; o restante são os mais recentes.
  const highlights = [
    ...visible.filter((p) => p.featured),
    ...visible.filter((p) => !p.featured && p.status !== "sold"),
  ].slice(0, 5);
  const hasFeatured = highlights.some((p) => p.featured);
  return (
    <div className="home-page">
      <section
        className="hero"
        aria-label="Destaques UniPlace"
        aria-roledescription="carrossel"
      >
        <button
          className="hero-arrow hero-arrow--left"
          onClick={() => setSlide((slide + slides.length - 1) % slides.length)}
          aria-label="Destaque anterior"
        >
          <Icon name="chevron-left" size={18} />
        </button>
        <div className="hero-copy" aria-live="polite">
          <span className="hero-tag">UniPlace</span>
          <h1>{slides[slide].title}</h1>
          <p>{slides[slide].description}</p>
          <button className="primary-button" onClick={() => onExplore()}>
            <Icon name="search" size={17} />
            {slides[slide].action}
          </button>
        </div>
        <HeroIllustration />
        <button
          className="hero-arrow hero-arrow--right"
          onClick={() => setSlide((slide + 1) % slides.length)}
          aria-label="Próximo destaque"
        >
          <Icon name="chevron-right" size={18} />
        </button>
        <div className="hero-dots">
          {slides.map((_, index) => (
            <button
              key={index}
              className={slide === index ? "is-active" : ""}
              onClick={() => setSlide(index)}
              aria-label={`Ir para destaque ${index + 1}`}
              aria-current={slide === index ? "true" : undefined}
            />
          ))}
        </div>
      </section>

      <section className="home-section" aria-labelledby="categories-heading">
        <div className="section-heading">
          <h2 id="categories-heading">Categorias</h2>
          <button className="text-link" onClick={() => onExplore()}>
            Ver todas <span aria-hidden="true">→</span>
          </button>
        </div>
        <div className="category-grid">
          {categories.map((category) => (
            <button
              className="category-tile"
              key={category.id}
              onClick={() =>
                onExplore(category.id === "mais" ? undefined : category.id)
              }
            >
              <span className="category-icon">
                <Icon name={category.icon} size={23} />
              </span>
              <span>{category.label}</span>
            </button>
          ))}
        </div>
      </section>

      <section
        className="home-section featured-section"
        aria-labelledby="featured-heading"
      >
        <div className="section-heading">
          <h2 id="featured-heading">
            {hasFeatured ? "Anúncios em destaque" : "Anúncios recentes"}
          </h2>
          <button className="text-link" onClick={() => onExplore()}>
            Ver todos <span aria-hidden="true">→</span>
          </button>
        </div>
        <div className="featured-grid">
          {highlights.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              favorite={favorites.includes(product.id)}
              onToggleFavorite={onToggleFavorite}
              onSelect={onSelectProduct}
            />
          ))}
        </div>
        {highlights.length === 0 && (
          <p className="page-status">
            Ainda não há anúncios publicados. Que tal publicar o primeiro?
          </p>
        )}
      </section>
    </div>
  );
}
