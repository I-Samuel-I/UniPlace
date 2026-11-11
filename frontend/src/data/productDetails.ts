import { products, type Product } from "./catalog";

export type ProductPhoto = { src: string; alt: string };

export type Seller = {
  id: string;
  name: string;
  avatar: string;
  memberSince: string;
  // Avaliações e presença ainda não existem na API; só os exemplos as têm.
  rating?: number;
  reviewCount?: number;
  online?: boolean;
  testimonial?: string;
};

export const DEFAULT_AVATAR = "/images/avatar.svg";

export type ProductDetails = {
  photos: ProductPhoto[];
  publishedAt: string;
  specifications: Array<{ label: string; value: string; icon: string }>;
  tags: string[];
  sellerId: string;
  location: { label: string; campusName: string; mapUrl: string };
};

// Pessoas, avaliações e anúncios são exemplos locais para a demonstração das telas.
const sellers: Record<string, Seller> = {
  "matheus-fontes": {
    id: "matheus-fontes",
    name: "Matheus Fontes",
    avatar: "/images/seller-matheus.jpg",
    memberSince: "jan/2024",
    rating: 4.9,
    reviewCount: 24,
    online: true,
    testimonial: "Sempre disponível e atencioso. Ótimo vendedor, recomendo!",
  },
  "lucas-almeida": {
    id: "lucas-almeida",
    name: "Lucas Almeida",
    avatar: "/images/seller-lucas.jpg",
    memberSince: "mar/2024",
    rating: 4.8,
    reviewCount: 12,
    online: false,
    testimonial:
      "Produto bem conservado e entrega combinada com facilidade. Recomendo!",
  },
};

const productSellerIds: Record<string, string> = {
  "macbook-air-m1-8gb-256gb": "matheus-fontes",
  "cadeira-escritorio": "matheus-fontes",
  "mochila-nike": "matheus-fontes",
  "guyton-fisiologia": "matheus-fontes",
  "monitor-dell-24": "matheus-fontes",
  "ipad-9-geracao": "matheus-fontes",
  "notebook-acer-aspire-5": "lucas-almeida",
  "iphone-13-128gb": "lucas-almeida",
  "airpods-pro-2": "lucas-almeida",
  "controle-ps5": "lucas-almeida",
};

type Specification = ProductDetails["specifications"][number];

const productSpecifications: Record<string, Specification[]> = {
  "macbook-air-m1-8gb-256gb": [
    { label: "Categoria", value: "Notebooks", icon: "laptop" },
    { label: "Marca", value: "Apple", icon: "tag" },
    { label: "Modelo", value: "MacBook Air M1", icon: "laptop" },
    { label: "Memória RAM", value: "8 GB", icon: "memory" },
    { label: "Armazenamento", value: "256 GB", icon: "hard-drive" },
    { label: "Processador", value: "Apple M1", icon: "cpu" },
    { label: "Condição", value: "Usado (pouco tempo de uso)", icon: "check" },
  ],
  "notebook-acer-aspire-5": [
    { label: "Categoria", value: "Notebooks", icon: "laptop" },
    { label: "Marca", value: "Acer", icon: "tag" },
    { label: "Modelo", value: "Aspire 5", icon: "laptop" },
    { label: "Memória RAM", value: "8 GB", icon: "memory" },
    { label: "Armazenamento", value: "SSD de 512 GB", icon: "hard-drive" },
    { label: "Processador", value: "Intel Core i5", icon: "cpu" },
  ],
  "iphone-13-128gb": [
    { label: "Categoria", value: "Celulares", icon: "smartphone" },
    { label: "Marca", value: "Apple", icon: "tag" },
    { label: "Modelo", value: "iPhone 13", icon: "smartphone" },
    { label: "Armazenamento", value: "128 GB", icon: "hard-drive" },
    { label: "Acompanha", value: "Cabo e capinha", icon: "package" },
  ],
  "airpods-pro-2": [
    { label: "Categoria", value: "Fones de ouvido", icon: "headphones" },
    { label: "Marca", value: "Apple", icon: "tag" },
    { label: "Modelo", value: "AirPods Pro · 2ª geração", icon: "headphones" },
    { label: "Recurso", value: "Cancelamento de ruído", icon: "settings" },
    {
      label: "Acompanha",
      value: "Estojo, caixa, cabo e ponteiras extras",
      icon: "package",
    },
  ],
  "mochila-nike": [
    { label: "Categoria", value: "Mochilas & Bolsas", icon: "bag" },
    { label: "Marca", value: "Nike", icon: "tag" },
    { label: "Cor", value: "Preta", icon: "grid" },
    { label: "Compartimento", value: "Espaço para notebook", icon: "laptop" },
  ],
  "controle-ps5": [
    { label: "Categoria", value: "Games & Consoles", icon: "grid" },
    { label: "Modelo", value: "DualSense", icon: "package" },
    { label: "Compatibilidade", value: "PlayStation 5", icon: "check" },
    { label: "Cor", value: "Branco", icon: "grid" },
    { label: "Acompanha", value: "Cabo USB", icon: "package" },
  ],
  "guyton-fisiologia": [
    { label: "Categoria", value: "Livros Universitários", icon: "book" },
    {
      label: "Título",
      value: "Guyton & Hall — Fisiologia Médica",
      icon: "book",
    },
    { label: "Formato", value: "Livro físico", icon: "package" },
    {
      label: "Conservação",
      value: "Páginas completas, com marcações de estudo",
      icon: "check",
    },
  ],
  "cadeira-escritorio": [
    { label: "Categoria", value: "Móveis", icon: "armchair" },
    { label: "Tipo", value: "Cadeira para escritório", icon: "armchair" },
    { label: "Retirada", value: "A combinar no campus", icon: "map-pin" },
  ],
  "monitor-dell-24": [
    { label: "Categoria", value: "Monitores", icon: "laptop" },
    { label: "Marca", value: "Dell", icon: "tag" },
    { label: "Tela", value: "24 polegadas", icon: "laptop" },
    { label: "Resolução", value: "Full HD", icon: "grid" },
    { label: "Acompanha", value: "Base, fonte e cabo HDMI", icon: "package" },
  ],
  "ipad-9-geracao": [
    { label: "Categoria", value: "Tablets", icon: "smartphone" },
    { label: "Marca", value: "Apple", icon: "tag" },
    { label: "Modelo", value: "iPad · 9ª geração", icon: "smartphone" },
    { label: "Armazenamento", value: "64 GB", icon: "hard-drive" },
    { label: "Conexão", value: "Wi-Fi", icon: "settings" },
    {
      label: "Acompanha",
      value: "Capa protetora e carregador",
      icon: "package",
    },
  ],
};

const productTags: Record<string, string[]> = {
  "macbook-air-m1-8gb-256gb": [
    "Apple",
    "MacBook",
    "Notebook",
    "M1",
    "8GB",
    "256GB",
  ],
  "notebook-acer-aspire-5": ["Notebook", "Acer", "Estudos", "Core i5"],
  "iphone-13-128gb": ["Apple", "iPhone", "128GB"],
  "airpods-pro-2": ["Apple", "AirPods", "Fones", "Bluetooth"],
  "mochila-nike": ["Mochila", "Faculdade", "Notebook"],
  "controle-ps5": ["PlayStation", "PS5", "DualSense", "Games"],
  "guyton-fisiologia": ["Livros", "Fisiologia", "Saúde", "Estudos"],
  "cadeira-escritorio": ["Móveis", "Escritório", "República"],
  "monitor-dell-24": ["Monitor", "Full HD", "Estudos"],
  "ipad-9-geracao": ["Apple", "iPad", "Tablet", "64GB"],
};

const conditionLabels: Record<Product["condition"], string> = {
  new: "Novo / lacrado",
  like_new: "Usado — como novo",
  used: "Com marcas de uso",
};

const macbookPhotos: ProductPhoto[] = [
  {
    src: "/images/macbook-air-open.jpg",
    alt: "MacBook Air prata aberto, visto pela tampa e lateral",
  },
  {
    src: "/images/macbook-air-desk.jpg",
    alt: "MacBook Air aberto sobre uma mesa, com teclado e tela visíveis",
  },
  {
    src: "/images/macbook-air-keyboard.jpg",
    alt: "Detalhe do teclado e da identificação MacBook Air abaixo da tela",
  },
  {
    src: "/images/macbook-air-ports.jpg",
    alt: "Detalhe das duas portas USB-C na lateral do MacBook Air",
  },
];

export function getProductDetails(product: Product): ProductDetails {
  const specifications = productSpecifications[product.id] ?? [
    { label: "Categoria", value: product.categoryLabel, icon: "grid" },
    ...(product.kind === "service"
      ? [{ label: "Tipo", value: "Serviço", icon: "tag" }]
      : []),
    ...Object.entries(product.attributes ?? {})
      .filter(([label]) => !["Categoria", "Condição", "Tipo"].includes(label))
      .map(([label, value]) => ({ label, value, icon: "tag" })),
  ];
  // Anúncios da API trazem a data real; os exemplos usam uma data-base fixa.
  const publishedAt =
    product.publishedAt ??
    new Date(
      Date.UTC(2026, 10, 11 - product.postedDaysAgo, 13, 30),
    ).toISOString();
  return {
    photos: product.photos?.length
      ? product.photos.map((photo, index) => ({
          src: photo.src,
          alt: `${product.title} — foto ${index + 1}`,
        }))
      : product.id === "macbook-air-m1-8gb-256gb"
        ? [
            { src: product.image, alt: product.title },
            ...macbookPhotos.filter((photo) => photo.src !== product.image),
          ]
        : [{ src: product.image, alt: product.title }],
    publishedAt,
    specifications: (product.kind === "service" ||
    specifications.some((specification) => specification.label === "Condição")
      ? specifications
      : [
          ...specifications,
          {
            label: "Condição",
            value: conditionLabels[product.condition],
            icon: "check",
          },
        ]
    ).map((specification) =>
      specification.label === "Categoria"
        ? { ...specification, value: product.categoryLabel }
        : specification.label === "Condição"
          ? { ...specification, value: conditionLabels[product.condition] }
          : specification,
    ),
    tags: product.tags?.length
      ? product.tags
      : (productTags[product.id] ?? [product.categoryLabel]),
    sellerId:
      product.sellerId ?? productSellerIds[product.id] ?? "lucas-almeida",
    location: {
      label: `${product.campus} · ${product.pickupLocation}`,
      campusName: product.campus,
      mapUrl: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${product.campus} ${product.pickupLocation} Patos PB`)}`,
    },
  };
}

export function getSeller(sellerId: string): Seller {
  return sellers[sellerId] ?? sellers["lucas-almeida"];
}

// Vendedor real quando o anúncio vem da API; caso contrário, o de exemplo.
export function getProductSeller(product: Product): Seller {
  if (!product.seller)
    return getSeller(getProductDetails(product).sellerId);
  const joined = new Date(product.seller.memberSince);
  return {
    id: product.seller.id,
    name: product.seller.name,
    avatar: DEFAULT_AVATAR,
    memberSince: Number.isFinite(joined.getTime())
      ? new Intl.DateTimeFormat("pt-BR", {
          month: "short",
          year: "numeric",
        }).format(joined)
      : "data não informada",
  };
}

export function getSellerProducts(sellerId: string): Product[] {
  return products.filter(
    (product) =>
      product.status !== "sold" && productSellerIds[product.id] === sellerId,
  );
}
