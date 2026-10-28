"use client";

import { useState, FormEvent } from "react";
import Link from "next/link";
import { Poppins } from "next/font/google";
import styles from "./redefinir.module.css";
import { useRouter } from "next/navigation";

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

function IconeOlho({ aberto }: { aberto: boolean }) {
  return (
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
      {aberto ? (
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
  );
}

export default function RedefinirPage() {
  const [senha, setSenha] = useState("");
  const [confirmar, setConfirmar] = useState("");
  const [verSenha, setVerSenha] = useState(false);
  const [verConfirmar, setVerConfirmar] = useState(false);
  const [erro, setErro] = useState("");
  const router = useRouter();
  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (senha.length < 6) {
      setErro("A senha precisa ter pelo menos 6 caracteres.");
      return;
    }
    if (senha !== confirmar) {
      setErro("As senhas não conferem.");
      return;
    }
    router.push('/login')
    setErro("");
    // TODO: chamar sua API de redefinição de senha aqui
    console.log({ senha });
  }

  return (
    <main className={`${styles.pagina} ${poppins.className}`}>
      <div className={styles.card}>
        <h1 className={styles.titulo}>Redefinir Senha</h1>
        <p className={styles.descricao}>
          Crie uma nova senha forte para proteger sua conta, use letras,
          números e símbolos para mais segurança.
        </p>

        <form onSubmit={handleSubmit} className={styles.form} noValidate>
          <div className={styles.campo}>
            <label htmlFor="senha" className={styles.rotulo}>
              Senha
            </label>
            <div className={styles.inputSenha}>
              <input
                id="senha"
                type={verSenha ? "text" : "password"}
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                autoComplete="new-password"
                required
              />
              <button
                type="button"
                className={styles.olho}
                onClick={() => setVerSenha((v) => !v)}
                aria-label={verSenha ? "Ocultar senha" : "Mostrar senha"}
              >
                <IconeOlho aberto={verSenha} />
              </button>
            </div>
          </div>

          <div className={styles.campo}>
            <label htmlFor="confirmar" className={styles.rotulo}>
              Confirmar Senha
            </label>
            <div className={styles.inputSenha}>
              <input
                id="confirmar"
                type={verConfirmar ? "text" : "password"}
                value={confirmar}
                onChange={(e) => setConfirmar(e.target.value)}
                autoComplete="new-password"
                required
              />
              <button
                type="button"
                className={styles.olho}
                onClick={() => setVerConfirmar((v) => !v)}
                aria-label={verConfirmar ? "Ocultar senha" : "Mostrar senha"}
              >
                <IconeOlho aberto={verConfirmar} />
              </button>
            </div>
          </div>

          {erro && (
            <p className={styles.erro} role="alert">
              {erro}
            </p>
          )}

          <button type="submit" className={styles.salvar}>
            Salvar
          </button>
        </form>

        <Link href="/login" className={styles.voltar}>
          Voltar para o login
        </Link>
      </div>
    </main>
  );
}