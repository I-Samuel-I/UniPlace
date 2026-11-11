import { useState } from "react";
import type { FormEvent } from "react";
import { Icon } from "../components/Icon";
import { login, register } from "../data/session";
import { ApiError, errorMessage } from "../lib/api";
import "./auth.css";

type Mode = "login" | "register";

export function AuthPage() {
  const [mode, setMode] = useState<Mode>("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);

  function changeMode(next: Mode) {
    setMode(next);
    setError("");
    setPassword("");
    setPasswordConfirmation("");
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (sending) return;
    if (mode === "register" && password !== passwordConfirmation) {
      setError("As senhas não coincidem.");
      return;
    }
    setSending(true);
    setError("");
    try {
      // Com a sessão criada, o App troca esta tela pelo marketplace.
      if (mode === "login") await login(email, password);
      else await register({ name, email, password, passwordConfirmation });
    } catch (submitError) {
      setError(
        mode === "login" &&
          submitError instanceof ApiError &&
          submitError.status === 401
          ? "E-mail ou senha incorretos."
          : errorMessage(submitError, "Não foi possível concluir. Tente novamente."),
      );
      setSending(false);
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-card" aria-labelledby="auth-title">
        <div className="brand auth-brand">
          <span className="brand-icon">
            <Icon name="bag" size={22} />
          </span>
          <span>
            Uni<span className="brand-accent">Place</span>
          </span>
        </div>
        <h1 id="auth-title">
          {mode === "login" ? "Entre na sua conta" : "Crie sua conta"}
        </h1>
        <p className="auth-intro">
          Compre, venda e conecte-se com outros estudantes da sua faculdade.
        </p>
        <div className="auth-tabs" role="group" aria-label="Acesso">
          <button
            type="button"
            className={mode === "login" ? "is-active" : ""}
            aria-pressed={mode === "login"}
            onClick={() => changeMode("login")}
          >
            Entrar
          </button>
          <button
            type="button"
            className={mode === "register" ? "is-active" : ""}
            aria-pressed={mode === "register"}
            onClick={() => changeMode("register")}
          >
            Criar conta
          </button>
        </div>
        <form className="auth-form" onSubmit={submit}>
          {mode === "register" && (
            <label>
              Nome
              <input
                required
                maxLength={150}
                autoComplete="name"
                value={name}
                onChange={(event) => setName(event.target.value)}
              />
            </label>
          )}
          <label>
            E-mail institucional
            <input
              required
              type="email"
              autoComplete="email"
              placeholder="nome@ads.fiponline.edu.br"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </label>
          <label>
            Senha
            <input
              required
              type="password"
              autoComplete={
                mode === "login" ? "current-password" : "new-password"
              }
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </label>
          {mode === "register" && (
            <label>
              Confirme a senha
              <input
                required
                type="password"
                autoComplete="new-password"
                value={passwordConfirmation}
                onChange={(event) =>
                  setPasswordConfirmation(event.target.value)
                }
              />
            </label>
          )}
          {error && (
            <p className="auth-error" role="alert">
              {error}
            </p>
          )}
          <button className="primary-button" type="submit" disabled={sending}>
            {sending
              ? "Aguarde..."
              : mode === "login"
                ? "Entrar"
                : "Criar conta"}
          </button>
        </form>
      </section>
    </main>
  );
}
