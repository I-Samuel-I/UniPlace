export type Product = {
  id: string;
  title: string;
  category: string;
  categoryLabel: string;
  price: number;
  image: string;
  campus: string;
  pickupLocation: string;
  postedDaysAgo: number;
  condition: "new" | "like_new" | "used";
  status?: "active" | "paused" | "expired" | "draft" | "sold";
  sellerId?: string;
  badge?: { label: string; tone: "orange" | "green" | "dark" };
  featured: boolean;
  acceptsTrade: boolean;
  acceptsNegotiation: boolean;
  description: string;
};

export type Category = {
  id: string;
  label: string;
  icon: string;
};

export const categories: Category[] = [
  { id: "eletronicos", label: "Eletrônicos", icon: "laptop" },
  { id: "celulares", label: "Celulares", icon: "smartphone" },
  {
    id: "eletrodomesticos",
    label: "Eletrodomésticos",
    icon: "washing-machine",
  },
  { id: "roupas", label: "Roupas", icon: "shirt" },
  { id: "calcados", label: "Calçados", icon: "footprints" },
  { id: "livros", label: "Livros", icon: "book-open" },
  { id: "esportes", label: "Esportes", icon: "dumbbell" },
  { id: "moveis", label: "Móveis", icon: "armchair" },
  { id: "beleza", label: "Beleza e Saúde", icon: "shopping-bag" },
  { id: "mais", label: "Mais", icon: "grid" },
];

export const catalogGroups: Array<{
  id: string;
  label: string;
  categories: string[];
}> = [
  {
    id: "eletronicos-acessorios",
    label: "Eletrônicos e Acessórios",
    categories: ["eletronicos", "eletrodomesticos"],
  },
  {
    id: "celulares-smart",
    label: "Celulares & Smart",
    categories: ["celulares"],
  },
  {
    id: "livros-apostilas",
    label: "Livros & Apostilas",
    categories: ["livros"],
  },
  {
    id: "roupas-calcados",
    label: "Roupas & Calçados",
    categories: ["roupas", "calcados", "mochilas"],
  },
  {
    id: "moveis-republica",
    label: "Móveis para Quarto/República",
    categories: ["moveis"],
  },
  { id: "esportes-lazer", label: "Esportes & Lazer", categories: ["esportes"] },
  { id: "games-consoles", label: "Games & Consoles", categories: ["games"] },
  { id: "beleza-saude", label: "Beleza & Saúde", categories: ["beleza"] },
];

// Conteúdo demonstrativo para pré-visualizar as telas sem autenticação na API.
export const products: Product[] = [
  {
    id: "notebook-acer-aspire-5",
    title: "Notebook Acer Aspire 5",
    category: "eletronicos",
    categoryLabel: "Notebooks",
    price: 2800,
    image: "/images/notebook.jpg",
    campus: "Campus 1",
    pickupLocation: "Bloco Central",
    postedDaysAgo: 2,
    condition: "new",
    badge: { label: "Novo", tone: "orange" },
    featured: true,
    acceptsTrade: false,
    acceptsNegotiation: true,
    description:
      "Notebook com Intel Core i5, 8 GB de memória e SSD de 512 GB. Acompanha carregador original e caixa. Ideal para as aulas, trabalhos e estudos. Retirada no campus em horário combinado.",
  },
  {
    id: "iphone-13-128gb",
    title: "iPhone 13 128GB",
    category: "celulares",
    categoryLabel: "Celulares",
    price: 2700,
    image: "/images/iphone.jpg",
    campus: "Campus 2",
    pickupLocation: "Biblioteca",
    postedDaysAgo: 4,
    condition: "like_new",
    status: "sold",
    badge: { label: "Vendido", tone: "dark" },
    featured: true,
    acceptsTrade: true,
    acceptsNegotiation: true,
    description:
      "iPhone 13 com 128 GB, conservado e com todas as funções funcionando. Acompanha cabo e capinha. Disponível para conferir pessoalmente antes de combinar a compra.",
  },
  {
    id: "airpods-pro-2",
    title: "AirPods Pro (2ª geração)",
    category: "eletronicos",
    categoryLabel: "Eletrônicos",
    price: 1450,
    image: "/images/airpods.jpg",
    campus: "Campus 1",
    pickupLocation: "Biblioteca",
    postedDaysAgo: 1,
    condition: "like_new",
    badge: { label: "Seminovo", tone: "dark" },
    featured: true,
    acceptsTrade: false,
    acceptsNegotiation: true,
    description:
      "Fones com cancelamento de ruído e estojo de recarga. Pouco uso, higienizados e com ponteiras extras. Acompanha caixa e cabo. Podemos combinar a retirada na biblioteca.",
  },
  {
    id: "mochila-nike",
    title: "Mochila Nike",
    category: "mochilas",
    categoryLabel: "Mochilas & Bolsas",
    price: 180,
    image: "/images/mochila.jpg",
    campus: "Campus 3",
    pickupLocation: "Entrada Principal",
    postedDaysAgo: 3,
    condition: "like_new",
    featured: true,
    acceptsTrade: false,
    acceptsNegotiation: true,
    description:
      "Mochila preta com compartimento para notebook, bolsos laterais e alças acolchoadas. Bem conservada, ótima para levar o material da faculdade.",
  },
  {
    id: "controle-ps5",
    title: "Controle DualSense PS5",
    category: "games",
    categoryLabel: "Games",
    price: 350,
    image: "/images/controle.jpg",
    campus: "Campus 1",
    pickupLocation: "Bloco Central",
    postedDaysAgo: 5,
    condition: "like_new",
    featured: true,
    acceptsTrade: true,
    acceptsNegotiation: false,
    description:
      "Controle DualSense branco, com vibração e gatilhos funcionando. Sem drift nos analógicos. Acompanha cabo USB. Aceito avaliar troca por jogos.",
  },
  {
    id: "guyton-fisiologia",
    title: "Guyton & Hall — Fisiologia Médica",
    category: "livros",
    categoryLabel: "Livros Universitários",
    price: 190,
    image: "/images/livro.jpg",
    campus: "Campus 1",
    pickupLocation: "Biblioteca",
    postedDaysAgo: 0,
    condition: "used",
    badge: { label: "Excelente", tone: "green" },
    featured: false,
    acceptsTrade: true,
    acceptsNegotiation: true,
    description:
      "Livro de fisiologia médica para acompanhar as disciplinas da área de saúde. Páginas completas, com algumas marcações de estudo. Posso entregar na biblioteca do Campus 1.",
  },
  {
    id: "cadeira-escritorio",
    title: "Cadeira de escritório ergonômica",
    category: "moveis",
    categoryLabel: "Móveis",
    price: 320,
    image: "/images/cadeira.jpg",
    campus: "Campus 1",
    pickupLocation: "Bloco Central",
    postedDaysAgo: 4,
    condition: "used",
    featured: false,
    acceptsTrade: false,
    acceptsNegotiation: true,
    description:
      "Cadeira de escritório com ajuste de altura, apoio para braços e encosto confortável. Boa opção para montar um cantinho de estudos na república. Retirada a combinar.",
  },
  {
    id: "monitor-dell-24",
    title: "Monitor Dell 24” Full HD",
    category: "eletronicos",
    categoryLabel: "Monitores",
    price: 620,
    image: "/images/monitor.jpg",
    campus: "Campus 1",
    pickupLocation: "Biblioteca",
    postedDaysAgo: 6,
    condition: "like_new",
    featured: false,
    acceptsTrade: false,
    acceptsNegotiation: true,
    description:
      "Monitor de 24 polegadas com resolução Full HD. Imagem nítida, sem pixels defeituosos. Acompanha base, fonte e cabo HDMI. Ideal para uma segunda tela de estudos.",
  },
  {
    id: "ipad-9-geracao",
    title: "iPad 9ª Geração 64GB",
    category: "eletronicos",
    categoryLabel: "Tablets",
    price: 2190,
    image: "/images/ipad.jpg",
    campus: "Campus 1",
    pickupLocation: "Bloco Central",
    postedDaysAgo: 2,
    condition: "like_new",
    badge: { label: "Destaque", tone: "orange" },
    featured: false,
    acceptsTrade: true,
    acceptsNegotiation: true,
    description:
      "iPad de 9ª geração com 64 GB e Wi-Fi. Conservado, com capa protetora e carregador. Ótimo para anotações, leitura de artigos e aulas online.",
  },
  {
    id: "macbook-air-m1-8gb-256gb",
    title: "MacBook Air M1 8GB 256GB",
    category: "eletronicos",
    categoryLabel: "Notebooks",
    price: 3800,
    image: "/images/macbook-air-open.jpg",
    campus: "Campus 1",
    pickupLocation: "Bloco Central",
    postedDaysAgo: 2,
    condition: "like_new",
    status: "active",
    featured: false,
    acceptsTrade: true,
    acceptsNegotiation: true,
    description:
      "MacBook Air M1, impecável, com poucos meses de uso. Acompanha carregador original Apple USB-C 30W, cabo, caixa e nota fiscal.",
  },
];
