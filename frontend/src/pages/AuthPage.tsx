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
  const [showPassword, setShowPassword] = useState(false);

  function changeMode(next: Mode) {
    setMode(next);
    setError("");
    setPassword("");
    setPasswordConfirmation("");
    setShowPassword(false);
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
      <section className="auth-side" aria-labelledby="auth-welcome-title">
        <AuthBrand />
        <div className="auth-side-content">
          <h2 id="auth-welcome-title" className="auth-welcome-title">
            Conectando pessoas
            <span>a boas oportunidades.</span>
          </h2>
          <p className="auth-welcome-description">
            Compre, venda e encontre o que você precisa de forma simples e segura.
          </p>
          <img
            className="auth-illustration"
            src="/images/marketplace-student-transparent.png"
            alt="Estudante explorando livros, eletrônicos e materiais no marketplace acadêmico"
            width="1671"
            height="941"
            fetchPriority="high"
          />
        </div>
      </section>

      <section className="auth-form-side" aria-labelledby="auth-title">
        <div className="auth-form-header">
          <AuthBrand mobile />
          <p className="auth-switch">
            {mode === "login" ? "Não tem uma conta?" : "Já tem uma conta?"}
            <button
              type="button"
              className="auth-switch-button"
              disabled={sending}
              onClick={() => changeMode(mode === "login" ? "register" : "login")}
            >
              {mode === "login" ? "Cadastre-se" : "Entrar"}
              <Icon name="arrow-right" size={16} />
            </button>
          </p>
        </div>
        <div className="auth-card">
          <h1 id="auth-title">
            {mode === "login" ? "Bem-vindo de volta!" : "Crie sua conta"}
          </h1>
          <p className="auth-intro">
            {mode === "login"
              ? "Faça login para continuar explorando o UniPlace."
              : "Use seu e-mail institucional para fazer parte do UniPlace."}
          </p>
          <form className="auth-form" onSubmit={submit} aria-busy={sending}>
            {mode === "register" && (
              <label className="auth-field">
                <span className="auth-field-label">Nome</span>
                <Icon name="user" size={20} />
                <input
                  required
                  name="name"
                  maxLength={150}
                  autoComplete="name"
                  placeholder="Seu nome"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                />
              </label>
            )}
            <label className="auth-field">
              <span className="auth-field-label">E-mail institucional</span>
              <Icon name="mail" size={20} />
              <input
                required
                name="email"
                type="email"
                autoComplete="email"
                placeholder="nome@ads.fiponline.edu.br"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
            </label>
            <div className="auth-field">
              <label className="auth-field-label" htmlFor="auth-password">
                Senha
              </label>
              <PasswordIcon />
              <input
                required
                id="auth-password"
                name="password"
                type={showPassword ? "text" : "password"}
                placeholder="Senha"
                autoComplete={
                  mode === "login" ? "current-password" : "new-password"
                }
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
              <button
                className="auth-password-toggle"
                type="button"
                aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                aria-pressed={showPassword}
                onClick={() => setShowPassword((visible) => !visible)}
              >
                <Icon name="eye" size={20} />
              </button>
            </div>
            {mode === "register" && (
              <label className="auth-field">
                <span className="auth-field-label">Confirme a senha</span>
                <PasswordIcon />
                <input
                  required
                  name="password_confirmation"
                  type={showPassword ? "text" : "password"}
                  placeholder="Confirme a senha"
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
            <button className="auth-submit" type="submit" disabled={sending}>
              {sending
                ? "Aguarde..."
                : mode === "login"
                  ? "Entrar"
                  : "Criar conta"}
            </button>
          </form>
        </div>
        <p className="auth-footer">
          © 2026 UniPlace. Todos os direitos reservados.
        </p>
      </section>
    </main>
  );
}

function AuthBrand({ mobile = false }: { mobile?: boolean }) {
  return (
    <div className={`auth-brand${mobile ? " auth-brand--mobile" : ""}`}>
      <span className="auth-brand-icon"><Icon name="bag" size={22} /></span>
      <span>Uni<span className="auth-brand-accent">Place</span></span>
    </div>
  );
}

function PasswordIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="5" y="11" width="14" height="10" rx="2" />
      <path d="M8 11V8a4 4 0 0 1 8 0v3" />
    </svg>
  );
}
