import { useCallback, useEffect, useRef, useState } from "react";
import { api, errorMessage, getSession } from "../lib/api";

export type NoticeKind = "message" | "post" | "support" | "system";
export type Notice = {
  id: string;
  kind: NoticeKind;
  text: string;
  url: string;
  created_at: string;
  read_at: string | null;
};
export type NoticePage = {
  results: Notice[];
  unread: number;
  total: number;
  count: number;
  kinds: Record<NoticeKind, number>;
  page: number;
  page_size: number;
  has_next: boolean;
};
export const noticeKinds = {
  message: {
    label: "Mensagens",
    title: "Nova mensagem",
    icon: "chat",
    action: "Ver conversa",
  },
  post: {
    label: "Anúncios",
    title: "Atualização do anúncio",
    icon: "bag",
    action: "Ver anúncio",
  },
  support: {
    label: "Suporte",
    title: "Resposta do suporte",
    icon: "headphones",
    action: "Ver chamado",
  },
  system: {
    label: "UniPlace",
    title: "Novidade do UniPlace",
    icon: "bell",
    action: "Ver detalhes",
  },
} as const;

// Notifications only open known application routes, including notices created in admin.
export function noticeDestination(url: string) {
  if (/^\/(chat|anuncios)\/[a-zA-Z0-9_-]+\/?$/.test(url))
    return url.replace(/\/$/, "");
  if (
    [
      "/suporte",
      "/meus-anuncios",
      "/configuracoes",
      "/perfil",
      "/explorar",
      "/chat",
    ].includes(url)
  )
    return url;
  return null;
}

export function noticeTime(date: string, now = Date.now()) {
  const timestamp = new Date(date).getTime();
  if (!Number.isFinite(timestamp)) return "";
  const minutes = Math.max(0, Math.floor((now - timestamp) / 60_000));
  if (minutes < 1) return "Agora";
  const relative = new Intl.RelativeTimeFormat("pt-BR", { numeric: "auto" });
  if (minutes < 60) return relative.format(-minutes, "minute");
  if (minutes < 1440) return relative.format(-Math.floor(minutes / 60), "hour");
  if (minutes < 10_080)
    return relative.format(-Math.floor(minutes / 1440), "day");
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(timestamp);
}

const empty: NoticePage = {
  results: [],
  unread: 0,
  total: 0,
  count: 0,
  page: 1,
  page_size: 5,
  has_next: false,
  kinds: { message: 0, post: 0, support: 0, system: 0 },
};

export function useNotifications(userId: number | null) {
  const [data, setData] = useState(empty);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState("");
  const [revision, setRevision] = useState(0);
  const [busy, setBusy] = useState<string | null>(null);
  const owner = useRef(userId);
  owner.current = userId;
  const loadedOwner = useRef<number | null>(null);
  const generation = useRef(0);
  const pending = useRef<symbol | null>(null);

  const reload = useCallback(async () => {
    if (userId === null) return;
    const request = ++generation.current;
    try {
      const response = await api<NoticePage>("/me/notifications/?page_size=5");
      if (owner.current !== userId || request !== generation.current) return;
      loadedOwner.current = userId;
      setData(response);
      setLoaded(true);
      setError("");
      setRevision((value) => value + 1);
    } catch (failure) {
      if (owner.current === userId && request === generation.current) {
        loadedOwner.current = userId;
        setError(
          errorMessage(failure, "Não foi possível carregar as notificações."),
        );
      }
    }
  }, [userId]);

  useEffect(() => {
    setData(empty);
    setLoaded(false);
    setError("");
    setBusy(null);
    pending.current = null;
    void reload();
    const refresh = () => {
      if (document.visibilityState === "visible") void reload();
    };
    const timer = window.setInterval(refresh, 10_000);
    window.addEventListener("focus", refresh);
    return () => {
      generation.current += 1;
      clearInterval(timer);
      window.removeEventListener("focus", refresh);
    };
  }, [reload]);

  async function mutate(key: string, operation: () => Promise<unknown>) {
    if (pending.current || userId === null || getSession()?.user.id !== userId)
      return false;
    const token = Symbol();
    pending.current = token;
    setBusy(key);
    generation.current += 1;
    try {
      await operation();
      if (owner.current !== userId || getSession()?.user.id !== userId)
        return false;
      generation.current += 1;
      setRevision((value) => value + 1);
      await reload();
      return true;
    } finally {
      if (pending.current === token) {
        pending.current = null;
        setBusy(null);
      }
    }
  }

  const current = loadedOwner.current === userId;
  return {
    data: current ? data : empty,
    loaded: current && loaded,
    error: current ? error : "",
    busy,
    revision,
    reload,
    markRead: (notice: Notice, read: boolean) =>
      mutate(notice.id, () =>
        api(`/me/notifications/${encodeURIComponent(notice.id)}/`, {
          method: "PATCH",
          body: { read },
        }),
      ),
    markAllRead: () =>
      mutate("all", () => api("/me/notifications/", { method: "POST" })),
    remove: (notice: Notice) =>
      mutate(notice.id, () =>
        api(`/me/notifications/${encodeURIComponent(notice.id)}/`, {
          method: "DELETE",
        }),
      ),
  };
}

export type NotificationsState = ReturnType<typeof useNotifications>;
type NoticeFilter = {
  status: "all" | "unread" | "read";
  kind: NoticeKind | "all";
  page: number;
};

export function useNotificationFeed(userId: number, revision: number) {
  const [filter, setFilter] = useState<NoticeFilter>({
    status: "all",
    kind: "all",
    page: 1,
  });
  const key = `${userId}:${filter.status}:${filter.kind}:${filter.page}`;
  const [response, setResponse] = useState<{
    key: string;
    data: NoticePage;
  } | null>(null);
  const [failure, setFailure] = useState({ key: "", message: "" });
  const [pending, setPending] = useState(false);
  const generation = useRef(0);
  const reload = useCallback(async () => {
    const request = ++generation.current;
    setPending(true);
    setFailure({ key, message: "" });
    try {
      const params = new URLSearchParams({
        status: filter.status,
        kind: filter.kind,
        page: String(filter.page),
        page_size: "12",
      });
      const data = await api<NoticePage>(`/me/notifications/?${params}`);
      if (request !== generation.current) return;
      // Deleting the last entry on a page returns to the last available page.
      const lastPage = Math.max(1, Math.ceil(data.count / data.page_size));
      if (filter.page > lastPage) {
        setFilter((current) => ({ ...current, page: lastPage }));
        return;
      }
      setResponse({ key, data });
    } catch (error) {
      if (request === generation.current)
        setFailure({
          key,
          message: errorMessage(
            error,
            "Não foi possível carregar as notificações.",
          ),
        });
    } finally {
      if (request === generation.current) setPending(false);
    }
  }, [key, filter]);
  useEffect(() => {
    void reload();
    return () => {
      generation.current += 1;
    };
  }, [reload, revision]);
  return {
    data: response?.key === key ? response.data : null,
    error: failure.key === key ? failure.message : "",
    pending,
    filter,
    reload,
    setStatus: (status: NoticeFilter["status"]) =>
      setFilter((current) => ({ ...current, status, page: 1 })),
    setKind: (kind: NoticeFilter["kind"]) =>
      setFilter((current) => ({ ...current, kind, page: 1 })),
    setPage: (page: number) => setFilter((current) => ({ ...current, page })),
  };
}
