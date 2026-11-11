import { useSyncExternalStore } from "react";
import {
  api,
  getSession,
  setSession,
  subscribeSession,
  type Session,
} from "../lib/api";

export function useSession(): Session | null {
  return useSyncExternalStore(subscribeSession, getSession, () => null);
}

export async function login(email: string, password: string) {
  const session = await api<Session>("/auth/login/", {
    method: "POST",
    body: { email: email.trim().toLowerCase(), password },
    auth: false,
  });
  setSession(session);
}

export async function register(data: {
  name: string;
  email: string;
  password: string;
  passwordConfirmation: string;
}) {
  await api("/auth/register/", {
    method: "POST",
    body: {
      name: data.name.trim(),
      email: data.email.trim().toLowerCase(),
      password: data.password,
      password_confirmation: data.passwordConfirmation,
    },
    auth: false,
  });
  await login(data.email, data.password);
}

export function logout() {
  setSession(null);
}
