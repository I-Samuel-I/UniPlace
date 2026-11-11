import { useCallback, useEffect, useRef, useState } from "react";
import { api, errorMessage } from "../lib/api";
import type { ManagedPost } from "./account";
import type { Product } from "./catalog";

export const PLACEHOLDER_IMAGE = "/images/sem-foto.svg";
const PAGE_SIZE = 100;
const MAX_PAGES = 5;

type ApiImage = {
  id: string;
  image: string;
  position: number;
  is_cover: boolean;
};

type ApiPost = {
  id: string;
  seller: { id: number; name: string; member_since: string };
  category: string | null;
  category_name: string | null;
  title: string;
  content: string;
  price: string | null;
  kind: "product" | "service";
  condition: "" | Product["condition"];
  status: ManagedPost["status"];
  campus: string | null;
  campus_name: string | null;
  pickup_location: string | null;
  pickup_location_name: string | null;
  accepts_negotiation: boolean;
  accepts_trade: boolean;
  attributes: Record<string, string>;
  tags: string[];
  is_featured: boolean;
  images: ApiImage[];
  cover: ApiImage | null;
  published_at: string | null;
  created_at: string | null;
  updated_at: string;
};

type Page<T> = { count: number; next: string | null; results: T[] };

export type ApiCategory = {
  id: string;
  name: string;
  slug: string;
  children: Array<{ id: string; name: string; slug: string }>;
};
export type ApiCampus = { id: string; name: string; city: string; state: string };
export type ApiPickupLocation = { id: string; name: string; campus: string };

export type ReferenceData = {
  categories: ApiCategory[];
  campuses: ApiCampus[];
  pickupLocations: ApiPickupLocation[];
};

export type PostDraft = {
  title: string;
  description: string;
  price: number;
  kind: "product" | "service";
  condition: Product["condition"];
  categoryId: string;
  campusId: string;
  pickupLocationId: string;
  acceptsNegotiation: boolean;
  acceptsTrade: boolean;
};

// Falha depois que o anúncio já existe no servidor: o formulário continua
// editando o mesmo registro em vez de criar outro rascunho.
export class SaveError extends Error {
  postId: string;
  photoUploaded: boolean;

  constructor(message: string, postId: string, photoUploaded: boolean) {
    super(message);
    this.name = "SaveError";
    this.postId = postId;
    this.photoUploaded = photoUploaded;
  }
}

// A API devolve URLs absolutas; o caminho relativo passa pelo proxy do front.
function mediaPath(url: string) {
  try {
    const parsed = new URL(url, window.location.origin);
    return parsed.pathname.startsWith("/media/")
      ? `${parsed.pathname}${parsed.search}`
      : url;
  } catch {
    return url;
  }
}

function daysSince(date: string) {
  const elapsed = Date.now() - Date.parse(date);
  return Number.isFinite(elapsed) ? Math.max(0, Math.floor(elapsed / 86_400_000)) : 0;
}

// Categoria ou subcategoria (UUID) -> slug da categoria principal, que é o
// identificador usado pelos filtros e atalhos de categoria das telas.
function categoryGroups(categories: ApiCategory[]) {
  const groups = new Map<string, string>();
  for (const category of categories) {
    groups.set(category.id, category.slug);
    for (const child of category.children) groups.set(child.id, category.slug);
  }
  return groups;
}

function toManagedPost(post: ApiPost, groups: Map<string, string>): ManagedPost {
  const date = post.published_at ?? post.created_at ?? post.updated_at;
  const images = [...post.images].sort(
    (a, b) => Number(b.is_cover) - Number(a.is_cover) || a.position - b.position,
  );
  const price = Number(post.price ?? 0);
  return {
    id: post.id,
    title: post.title || "Rascunho sem título",
    category: (post.category && groups.get(post.category)) || "outros",
    categoryLabel: post.category_name ?? "Sem categoria",
    price: Number.isFinite(price) ? price : 0,
    image: images.length ? mediaPath(images[0].image) : PLACEHOLDER_IMAGE,
    campus: post.campus_name ?? "Campus a definir",
    pickupLocation: post.pickup_location_name ?? "Local a combinar",
    postedDaysAgo: daysSince(date),
    condition: post.condition || "like_new",
    status: post.status,
    sellerId: String(post.seller.id),
    badge:
      post.status === "sold"
        ? { label: "Vendido", tone: "dark" }
        : post.is_featured
          ? { label: "Destaque", tone: "orange" }
          : post.kind === "service"
            ? { label: "Serviço", tone: "green" }
            : post.condition === "new"
              ? { label: "Novo", tone: "orange" }
              : undefined,
    featured: post.is_featured,
    acceptsTrade: post.accepts_trade,
    acceptsNegotiation: post.accepts_negotiation,
    description: post.content,
    kind: post.kind,
    categoryId: post.category ?? undefined,
    campusId: post.campus ?? undefined,
    pickupLocationId: post.pickup_location ?? undefined,
    photos: images.map((image) => ({
      id: image.id,
      src: mediaPath(image.image),
    })),
    tags: post.tags,
    attributes: post.attributes,
    seller: {
      id: String(post.seller.id),
      name: post.seller.name,
      memberSince: post.seller.member_since,
    },
    publishedAt: date,
    updatedAt: post.updated_at,
  };
}

async function fetchAll(path: string) {
  const posts: ApiPost[] = [];
  for (let page = 1; page <= MAX_PAGES; page += 1) {
    const data = await api<Page<ApiPost>>(
      `${path}?page_size=${PAGE_SIZE}&page=${page}`,
    );
    posts.push(...data.results);
    if (!data.next) break;
  }
  return posts;
}

type MarketplaceState = {
  catalog: Product[];
  myPosts: ManagedPost[];
  reference: ReferenceData;
  loaded: boolean;
  error: string | null;
};

const emptyState: MarketplaceState = {
  catalog: [],
  myPosts: [],
  reference: { categories: [], campuses: [], pickupLocations: [] },
  loaded: false,
  error: null,
};

// Carrega o catálogo de anúncios ativos, os anúncios do usuário e as listas de
// referência. A busca e os filtros das telas são aplicados sobre esses dados.
export function useMarketplace(userId: number | null) {
  const [state, setState] = useState<MarketplaceState>(emptyState);
  const requestRef = useRef(0);

  const load = useCallback(async () => {
    const request = (requestRef.current += 1);
    if (userId === null) {
      setState(emptyState);
      return;
    }
    try {
      const [categories, campuses, pickupLocations, catalog, mine] =
        await Promise.all([
          api<ApiCategory[]>("/posts/categories/"),
          api<ApiCampus[]>("/campuses/"),
          api<ApiPickupLocation[]>("/pickup-locations/"),
          fetchAll("/posts/"),
          fetchAll("/me/posts/"),
        ]);
      if (request !== requestRef.current) return;
      const groups = categoryGroups(categories);
      setState({
        catalog: catalog.map((post) => toManagedPost(post, groups)),
        myPosts: mine.map((post) => toManagedPost(post, groups)),
        reference: { categories, campuses, pickupLocations },
        loaded: true,
        error: null,
      });
    } catch (error) {
      if (request !== requestRef.current) return;
      setState((previous) => ({
        ...previous,
        error: errorMessage(error, "Não foi possível carregar os anúncios."),
      }));
    }
  }, [userId]);

  useEffect(() => {
    setState(emptyState);
    void load();
  }, [load]);

  const savePost = useCallback(
    async (
      id: string | null,
      draft: PostDraft,
      photo: File | null,
      publish: boolean,
    ) => {
      const body = {
        title: draft.title,
        content: draft.description,
        price: draft.price.toFixed(2),
        kind: draft.kind,
        condition: draft.kind === "service" ? "" : draft.condition,
        category: draft.categoryId,
        campus: draft.campusId,
        pickup_location: draft.pickupLocationId,
        accepts_negotiation: draft.acceptsNegotiation,
        accepts_trade: draft.acceptsTrade,
      };
      let postId = id;
      let photoUploaded = false;
      try {
        if (postId) {
          await api(`/posts/${postId}/`, { method: "PATCH", body });
        } else {
          const created = await api<ApiPost>("/posts/", { method: "POST", body });
          postId = created.id;
        }
        if (photo) {
          const form = new FormData();
          form.append("image", photo);
          form.append("is_cover", "true");
          await api(`/posts/${postId}/images/`, { method: "POST", form });
          photoUploaded = true;
        }
        if (publish)
          await api(`/posts/${postId}/status/`, {
            method: "PATCH",
            body: { status: "active" },
          });
      } catch (error) {
        if (!postId) throw error;
        throw new SaveError(
          errorMessage(error, "Não foi possível salvar o anúncio."),
          postId,
          photoUploaded,
        );
      } finally {
        await load();
      }
    },
    [load],
  );

  const setPostStatus = useCallback(
    async (id: string, status: ManagedPost["status"]) => {
      try {
        await api(`/posts/${id}/status/`, { method: "PATCH", body: { status } });
      } finally {
        await load();
      }
    },
    [load],
  );

  const deletePost = useCallback(
    async (id: string) => {
      try {
        await api(`/posts/${id}/`, { method: "DELETE" });
      } finally {
        await load();
      }
    },
    [load],
  );

  return { ...state, reload: load, savePost, setPostStatus, deletePost };
}
