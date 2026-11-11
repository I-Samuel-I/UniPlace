"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import Image from "next/image";
import Link from "next/link";
import { Poppins } from "next/font/google";
import styles from "./login.module.css";

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export default function Login() {
  const [email, setEmail] = useState<string>("");
  const [senha, setSenha] = useState<string>("");
  const [lembrar, setLembrar] = useState<boolean>(false);
  const [mostrarSenha, setMostrarSenha] = useState<boolean>(false);

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    // TODO: chamar a API de login aqui
    console.log({ email, senha, lembrar });
  }

  return (
    <div className={`${styles.container} ${poppins.className}`}>
      {/* Lado esquerdo */}
      <section className={styles.lado}>
        <div className={styles.logo}>
          <span className={styles.logoIcone}>
            <svg viewBox="0 0 24 24">
              <path d="M6 8h12l1 12H5z" />
              <path d="M9 8a3 3 0 0 1 6 0" />
            </svg>
          </span>
          <span>
            Uni<span className={styles.logoDestaque}>Place</span>
          </span>
        </div>

        <div className={styles.ladoConteudo}>
          <h2 className={styles.titulo}>
            Conectando pessoas
            <span className={styles.tituloDestaque}>a boas oportunidades.</span>
          </h2>
          <p className={styles.subtitulo}>
            Compre, venda e encontre o que você precisa de forma simples e
            segura.
          </p>

          <div className={styles.ilustracao}>
            <Image
              src="/login.svg"
              alt="Ilustração de uma pessoa usando o UniPlace"
              width={300}
              height={220}
            />
          </div>
        </div>
      </section>

      {/* Lado direito */}
      <section className={styles.formLado}>
        <p className={styles.cadastro}>
          Não tem uma conta?
          <Link href="/cadastro" className={styles.cadastroLink}>
            Cadastre-se
            <svg viewBox="0 0 24 24">
              <path d="M5 12h14M13 6l6 6-6 6" />
            </svg>
          </Link>
        </p>

        <div className={styles.formArea}>
          <h1 className={styles.formTitulo}>Bem-vindo de volta!</h1>
          <p className={styles.formSub}>
            Faça login para continuar explorando o UniPlace.
          </p>

          <form className={styles.form} onSubmit={handleSubmit}>
            <label className={styles.campo}>
              <svg viewBox="0 0 24 24">
                <rect x="3" y="5" width="18" height="14" rx="2" />
                <path d="M3 7l9 6 9-6" />
              </svg>
              <input
                type="text"
                placeholder="E-mail ou usuário"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="username"
                required
              />
            </label>

            <label className={styles.campo}>
              <svg viewBox="0 0 24 24">
                <rect x="5" y="11" width="14" height="10" rx="2" />
                <path d="M8 11V8a4 4 0 0 1 8 0v3" />
              </svg>
              <input
                type={mostrarSenha ? "text" : "password"}
                placeholder="Senha"
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                autoComplete="current-password"
                required
              />
              <button
                type="button"
                className={styles.olho}
                onClick={() => setMostrarSenha(!mostrarSenha)}
                aria-label={mostrarSenha ? "Ocultar senha" : "Mostrar senha"}
              >
                {mostrarSenha ? (
                  <svg viewBox="0 0 24 24">
                    <path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                ) : (
                  <svg viewBox="0 0 24 24">
                    <path d="M3 3l18 18" />
                    <path d="M10.6 6.1A9.8 9.8 0 0 1 12 6c6 0 10 6 10 6a17 17 0 0 1-3.2 3.9M6.6 7.6C3.9 9.3 2 12 2 12s4 7 10 7a9.6 9.6 0 0 0 4-.9" />
                  </svg>
                )}
              </button>
            </label>

            <div className={styles.opcoes}>
              <label className={styles.lembrar}>
                <input
                  type="checkbox"
                  checked={lembrar}
                  onChange={(e) => setLembrar(e.target.checked)}
                />
                Lembrar-me
              </label>
              <Link href="/recuperar-senha" className={styles.esqueci}>
                Esqueceu a senha?
              </Link>
            </div>

            <button type="submit" className={`${styles.btn} ${styles.btnEntrar}`}>
              Entrar
            </button>

            <div className={styles.divisor}>ou</div>

            <button type="button" className={`${styles.btn} ${styles.btnGoogle}`}>
              <svg viewBox="0 0 48 48">
                <path fill="#FFC107" d="M43.6 20.1H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 8 3l5.7-5.7C34 6.1 29.3 4 24 4 13 4 4 13 4 24s9 20 20 20 20-9 20-20c0-1.3-.1-2.7-.4-3.9z" />
                <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 8 3l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
                <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z" />
                <path fill="#1976D2" d="M43.6 20.1H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.7-.4-3.9z" />
              </svg>
              Entrar com o Google
            </button>
          </form>
        </div>

        <p className={styles.rodape}>
          © 2026 UniPlace. Todos os direitos reservados.
        </p>
      </section>
    </div>
  );
}