import type { Product } from "./catalog";

// Anúncio do usuário autenticado, carregado de /api/me/posts/.
export type ManagedPost = Omit<Product, "status"> & {
  status: "active" | "paused" | "expired" | "draft" | "sold";
  updatedAt: string;
};

// Identidade usada apenas pelas conversas de exemplo do chat, que ainda é local.
export const currentUser = {
  id: "matheus-fontes",
  name: "Matheus Fontes",
  avatar: "/images/seller-matheus.jpg",
  email: "matheus@ads.fiponline.edu.br",
  institution: "UNIFIP",
  memberSince: "2025",
};
