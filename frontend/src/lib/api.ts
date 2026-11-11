// Cliente HTTP da API Django. As chamadas usam caminhos relativos (/api/...),
// encaminhados ao backend pelo proxy configurado em vite.config.ts.

const API_BASE = "/api";
const SESSION_KEY = "uniplace:session:v1";

export type SessionUser = { id: number; name: string; email: string };
export type Session = { access: string; refresh: string; user: SessionUser };

export class ApiError extends Error {
  status: number;
  fields: Record<string, string[]>;

  constructor(
    status: number,
    message: string,
    fields: Record<string, string[]> = {},
  ) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.fields = fields;
  }
}

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

function isSession(value: unknown): value is Session {
  if (!isObject(value) || !isObject(value.user)) return false;
  return (
    typeof value.access === "string" &&
    typeof value.refresh === "string" &&
    typeof value.user.id === "number" &&
    typeof value.user.name === "string" &&
    typeof value.user.email === "string"
  );
}

function readSession(): Session | null {
  try {
    if (typeof localStorage === "undefined") return null;
    const saved: unknown = JSON.parse(localStorage.getItem(SESSION_KEY) ?? "null");
    return isSession(saved) ? saved : null;
  } catch {
    return null;
  }
}

let session: Session | null = readSession();
const listeners = new Set<() => void>();

export function getSession() {
  return session;
}

export function setSession(next: Session | null) {
  session = next;
  try {
    if (typeof localStorage !== "undefined") {
      if (next) localStorage.setItem(SESSION_KEY, JSON.stringify(next));
      else localStorage.removeItem(SESSION_KEY);
    }
  } catch {
    /* Sem armazenamento, a sessão vale apenas até recarregar a página. */
  }
  listeners.forEach((listener) => listener());
}

export function subscribeSession(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

type RequestOptions = {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  form?: FormData;
  auth?: boolean;
};

function send(path: string, options: RequestOptions, token?: string) {
  const headers: Record<string, string> = { Accept: "application/json" };
  let body: BodyInit | undefined;
  if (options.form) {
    body = options.form;
  } else if (options.body !== undefined) {
    headers["Content-Type"] = "application/json";
    body = JSON.stringify(options.body);
  }
  if (token) headers.Authorization = `Bearer ${token}`;
  return fetch(`${API_BASE}${path}`, {
    method: options.method ?? "GET",
    headers,
    body,
  });
}

let refreshing: Promise<string | null> | null = null;

// O token de acesso dura poucos minutos; o de renovação obtém outro sem novo login.
function refreshAccess(): Promise<string | null> {
  if (!refreshing) {
    refreshing = (async () => {
      const current = session;
      if (!current) return null;
      const response = await send(
        "/auth/refresh/",
        { method: "POST", body: { refresh: current.refresh } },
        undefined,
      );
      const data: unknown = await response.json().catch(() => null);
      if (session?.refresh !== current.refresh) return null;
      if (!response.ok || !isObject(data) || typeof data.access !== "string") {
        if (response.status === 400 || response.status === 401)
          setSession(null);
        return null;
      }
      setSession({
        ...current,
        access: data.access,
        refresh: typeof data.refresh === "string" ? data.refresh : current.refresh,
      });
      return data.access;
    })().finally(() => {
      refreshing = null;
    });
  }
  return refreshing;
}

const fieldLabels: Record<string, string> = {
  name: "Nome",
  email: "E-mail",
  password: "Senha",
  password_confirmation: "Confirmação da senha",
  title: "Título",
  content: "Descrição",
  price: "Preço",
  category: "Categoria",
  kind: "Tipo",
  condition: "Condição",
  campus: "Campus",
  pickup_location: "Local de retirada",
  image: "Foto",
  images: "Fotos",
  status: "Status",
};

function messages(value: unknown): string[] {
  if (typeof value === "string") return [value];
  if (Array.isArray(value)) return value.flatMap(messages);
  if (isObject(value)) return Object.values(value).flatMap(messages);
  return [];
}

function toApiError(status: number, data: unknown): ApiError {
  if (status >= 500 || data === null)
    return new ApiError(
      status,
      "O servidor encontrou um erro. Tente novamente em instantes.",
    );
  if (isObject(data) && typeof data.detail === "string")
    return new ApiError(status, data.detail);
  if (isObject(data)) {
    const fields: Record<string, string[]> = {};
    const lines: string[] = [];
    for (const [field, value] of Object.entries(data)) {
      const found = messages(value);
      if (!found.length) continue;
      fields[field] = found;
      const label = fieldLabels[field];
      lines.push(label ? `${label}: ${found.join(" ")}` : found.join(" "));
    }
    if (lines.length) return new ApiError(status, lines.join(" "), fields);
  }
  const found = messages(data);
  return new ApiError(
    status,
    found.length ? found.join(" ") : "Não foi possível concluir a operação.",
  );
}

export async function api<T>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const useAuth = options.auth !== false;
  let response: Response;
  try {
    response = await send(path, options, useAuth ? session?.access : undefined);
    if (response.status === 401 && useAuth && session) {
      const access = await refreshAccess();
      if (access) response = await send(path, options, access);
    }
  } catch {
    throw new ApiError(
      0,
      "Não foi possível conectar ao servidor. Verifique se a API está em execução.",
    );
  }
  if (response.status === 401 && useAuth) {
    setSession(null);
    throw new ApiError(401, "Sua sessão expirou. Entre novamente.");
  }
  if (response.status === 204) return undefined as T;
  const data: unknown = await response.json().catch(() => null);
  if (!response.ok) throw toApiError(response.status, data);
  return data as T;
}

export function errorMessage(error: unknown, fallback: string) {
  return error instanceof Error && error.message ? error.message : fallback;
}
