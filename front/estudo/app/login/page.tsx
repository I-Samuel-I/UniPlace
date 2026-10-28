"use client";

import { useState, FormEvent } from "react";
import Image from "next/image";
import Link from "next/link";
import { Poppins } from "next/font/google";
import styles from "./login.module.css";
import { useRouter } from "next/navigation";
const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const router = useRouter();
  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    // TODO: chamar sua API de autenticação aqui
    router.push('/principal')
  }

  return (
    <main className={`${styles.pagina} ${poppins.className}`}>
      <section className={styles.esquerdo}>
        <div className={styles.card}>
          <span className={styles.logo}>UniPlace</span>
          <h1 className={styles.titulo}>Login</h1>

          <form onSubmit={handleSubmit} className={styles.form}>
            <div className={styles.campo}>
              <label htmlFor="email" className={styles.rotulo}>
                Email
              </label>
              <input
                id="email"
                type="email"
                placeholder="email@gmail.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>

            <div className={styles.campo}>
              <div className={styles.linhaSenha}>
                <label htmlFor="senha" className={styles.rotulo}>
                  Senha
                </label>
                <Link href="/redefinir" className={styles.esqueceu}>
                  Esqueceu a senha?
                </Link>
              </div>

              <div className={styles.inputSenha}>
                <input
                  id="senha"
                  type={mostrarSenha ? "text" : "password"}
                  placeholder="••••••••"
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                  required
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  className={styles.olho}
                  onClick={() => setMostrarSenha((v) => !v)}
                  aria-label={mostrarSenha ? "Ocultar senha" : "Mostrar senha"}
                >
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    {mostrarSenha ? (
                      <>
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                        <circle cx="12" cy="12" r="3" />
                      </>
                    ) : (
                      <>
                        <path d="M17.94 17.94A10.94 10.94 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
                        <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
                        <line x1="1" y1="1" x2="23" y2="23" />
                      </>
                    )}
                  </svg>
                </button>
              </div>
            </div>
            
            <button type="submit" className={styles.entrar}>
              Entrar
            </button>
          </form>

          <p className={styles.cadastro}>
            Não tem uma conta? <Link href="/cadastro">Cadastre-se</Link>
          </p>
        </div>
      </section>

      <section className={styles.direito} aria-hidden="true">
        <Image
          src="/94e945e92af0a196c596d0cf2744e85ea91ae9d5.png"
          alt=""
          width={1200}
          height={885}
          priority
          className={styles.ilustracao}
        />
      </section>
    </main>
  );
}