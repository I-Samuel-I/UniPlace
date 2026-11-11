import { useCallback, useEffect, useRef, useState } from "react";
import { products, type Product } from "./catalog";

export type ManagedPost = Omit<Product, "status"> & {
  status: "active" | "paused" | "expired" | "draft" | "sold";
  views: number;
  messageCount: number;
  updatedAt: string;
};

export const currentUser = {
  id: "matheus-fontes",
  name: "Matheus Fontes",
  avatar: "/images/seller-matheus.jpg",
  email: "matheus@ads.fiponline.edu.br",
  institution: "UNIFIP",
  memberSince: "2025",
};

const seedRows = [
  { id: "macbook-air-m1-8gb-256gb", views: 12, messageCount: 0 },
  { id: "cadeira-escritorio", views: 15, messageCount: 0 },
  { id: "mochila-nike", views: 10, messageCount: 0 },
  { id: "guyton-fisiologia", views: 32, messageCount: 2 },
  { id: "monitor-dell-24", views: 18, messageCount: 1 },
  { id: "ipad-9-geracao", views: 8, messageCount: 1 },
];

// Metrics are example content, not measurements of real marketplace activity.
export const initialManagedPosts: ManagedPost[] = seedRows.map(
  (seed, index) => {
    const product = products.find((item) => item.id === seed.id);
    if (!product)
      throw new Error(`Produto de demonstração não encontrado: ${seed.id}`);
    return {
      ...product,
      status: seed.id === "guyton-fisiologia" ? "expired" : "active",
      views: seed.views,
      messageCount: seed.messageCount,
      updatedAt: `2026-11-${String(11 - index).padStart(2, "0")}T10:00:00-03:00`,
    };
  },
);

export const ACCOUNT_STORAGE_KEY = "uniplace:managed-posts:v1";
const MAX_POSTS = 500;
const statuses: ManagedPost["status"][] = [
  "active",
  "paused",
  "expired",
  "draft",
  "sold",
];

function normalizeBadge(
  post: ManagedPost,
  status: ManagedPost["status"],
): ManagedPost["badge"] {
  if (status === "sold") return { label: "Vendido", tone: "dark" };
  if (
    status === "active" &&
    post.badge &&
    ["Vendido", "Pausado", "Expirado", "Rascunho"].includes(post.badge.label)
  ) {
    return post.condition === "new"
      ? { label: "Novo", tone: "orange" }
      : undefined;
  }
  return post.badge;
}

type ManagedState = { posts: ManagedPost[]; deletedIds: string[] };
type LoadedState = { state: ManagedState; error: string | null };

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);
const isText = (
  value: unknown,
  max: number,
  allowEmpty = false,
): value is string =>
  typeof value === "string" &&
  value.length <= max &&
  (allowEmpty || value.trim().length > 0);
const isId = (value: unknown): value is string =>
  typeof value === "string" &&
  /^[a-zA-Z0-9][a-zA-Z0-9._:-]{0,127}$/.test(value);
const isCounter = (value: unknown): value is number =>
  typeof value === "number" && Number.isSafeInteger(value) && value >= 0;
const isDate = (value: unknown): value is string =>
  typeof value === "string" &&
  value.length <= 40 &&
  Number.isFinite(Date.parse(value));

function isImage(value: unknown): value is string {
  if (typeof value !== "string" || !value || value.length > 2_800_000)
    return false;
  return (
    /^\/(?!\/)/.test(value) ||
    /^https?:\/\//i.test(value) ||
    /^data:image\/(?:jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(value)
  );
}

export function isManagedPost(value: unknown): value is ManagedPost {
  if (!isObject(value)) return false;
  if (
    !isId(value.id) ||
    !isText(value.title, 200) ||
    !isText(value.description, 5000, true)
  )
    return false;
  if (!isText(value.category, 100) || !isText(value.categoryLabel, 100))
    return false;
  if (
    typeof value.price !== "number" ||
    !Number.isFinite(value.price) ||
    value.price < 0 ||
    value.price > 999_999_999.99
  )
    return false;
  if (
    !isImage(value.image) ||
    !isText(value.campus, 120) ||
    !isText(value.pickupLocation, 120)
  )
    return false;
  if (
    !isCounter(value.postedDaysAgo) ||
    !isCounter(value.views) ||
    !isCounter(value.messageCount) ||
    !isDate(value.updatedAt)
  )
    return false;
  if (
    !["new", "like_new", "used"].includes(String(value.condition)) ||
    !statuses.includes(value.status as ManagedPost["status"])
  )
    return false;
  if (
    typeof value.featured !== "boolean" ||
    typeof value.acceptsTrade !== "boolean" ||
    typeof value.acceptsNegotiation !== "boolean"
  )
    return false;
  if (
    value.badge !== undefined &&
    (!isObject(value.badge) ||
      !isText(value.badge.label, 50) ||
      !["orange", "green", "dark"].includes(String(value.badge.tone)))
  )
    return false;
  return true;
}

function initialState(): ManagedState {
  return {
    posts: initialManagedPosts.map((post) => ({ ...post })),
    deletedIds: [],
  };
}

function readManagedState(): LoadedState {
  try {
    if (typeof localStorage === "undefined")
      return { state: initialState(), error: null };
    const saved = localStorage.getItem(ACCOUNT_STORAGE_KEY);
    if (saved === null) return { state: initialState(), error: null };
    const value: unknown = JSON.parse(saved);
    if (
      !isObject(value) ||
      value.version !== 1 ||
      !Array.isArray(value.posts) ||
      !Array.isArray(value.deletedIds)
    )
      throw new Error("Invalid saved account data");
    if (
      value.posts.length > MAX_POSTS ||
      !value.posts.every(isManagedPost) ||
      !value.deletedIds.every(isId)
    )
      throw new Error("Invalid saved account records");
    const posts = value.posts as ManagedPost[];
    const deletedIds = [...new Set(value.deletedIds as string[])];
    if (new Set(posts.map((post) => post.id)).size !== posts.length)
      throw new Error("Duplicate saved post IDs");
    return {
      state: {
        posts: posts.filter((post) => !deletedIds.includes(post.id)),
        deletedIds,
      },
      error: null,
    };
  } catch {
    return {
      state: initialState(),
      error:
        "Não foi possível recuperar os anúncios salvos neste navegador. Os exemplos foram restaurados.",
    };
  }
}

export function useManagedPosts() {
  const [loaded] = useState(readManagedState);
  const [state, setState] = useState<ManagedState>(loaded.state);
  const [storageError, setStorageError] = useState<string | null>(loaded.error);
  const dirty = useRef(false);
  const stateRef = useRef(state);
  stateRef.current = state;

  const update = useCallback(
    (change: (previous: ManagedState) => ManagedState) => {
      const previous = stateRef.current;
      const next = change(previous);
      if (next === previous) return;
      dirty.current = true;
      stateRef.current = next;
      setState(next);
    },
    [],
  );

  useEffect(() => {
    // Preserve an unreadable payload until the user changes the recovered data.
    if (loaded.error && !dirty.current) return;
    try {
      if (typeof localStorage === "undefined") return;
      localStorage.setItem(
        ACCOUNT_STORAGE_KEY,
        JSON.stringify({ version: 1, ...state }),
      );
      setStorageError(null);
    } catch {
      setStorageError(
        "As alterações estão disponíveis nesta sessão, mas o navegador não conseguiu salvá-las. Libere espaço para manter os anúncios após recarregar.",
      );
    }
  }, [state, loaded.error]);

  const savePost = useCallback(
    (post: ManagedPost) => {
      if (!isManagedPost(post))
        throw new Error(
          "Confira o título, a descrição, o preço e a imagem do anúncio antes de salvar.",
        );
      const savedPost = {
        ...post,
        badge: normalizeBadge(post, post.status),
        updatedAt: new Date().toISOString(),
      };
      update((previous) => {
        const exists = previous.posts.some((item) => item.id === post.id);
        if (!exists && previous.posts.length >= MAX_POSTS)
          throw new Error(
            "Você atingiu o limite de 500 anúncios neste navegador. Exclua um anúncio antes de criar outro.",
          );
        return {
          posts: exists
            ? previous.posts.map((item) =>
                item.id === post.id ? savedPost : item,
              )
            : [savedPost, ...previous.posts],
          deletedIds: previous.deletedIds.filter((id) => id !== post.id),
        };
      });
    },
    [update],
  );

  const deletePost = useCallback(
    (id: string) => {
      update((previous) => {
        if (!previous.posts.some((post) => post.id === id)) return previous;
        return {
          posts: previous.posts.filter((post) => post.id !== id),
          deletedIds: [...new Set([...previous.deletedIds, id])],
        };
      });
    },
    [update],
  );

  const setPostStatus = useCallback(
    (id: string, status: ManagedPost["status"]) => {
      if (!statuses.includes(status)) return;
      update((previous) => {
        if (
          !previous.posts.some(
            (post) => post.id === id && post.status !== status,
          )
        )
          return previous;
        return {
          ...previous,
          posts: previous.posts.map((post) =>
            post.id === id
              ? {
                  ...post,
                  status,
                  badge: normalizeBadge(post, status),
                  updatedAt: new Date().toISOString(),
                }
              : post,
          ),
        };
      });
    },
    [update],
  );

  return {
    posts: state.posts,
    deletedIds: state.deletedIds,
    savePost,
    deletePost,
    setPostStatus,
    storageError,
  };
}
