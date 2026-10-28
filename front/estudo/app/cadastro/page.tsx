'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Montserrat } from 'next/font/google';
import styles from './cadastro.module.css';
import Image from 'next/image';
import { useRouter } from 'next/navigation';

const montserrat = Montserrat({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
});

function IconeOlho({ aberto }: { aberto: boolean }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {aberto ? (
        <>
          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
          <circle cx="12" cy="12" r="3" />
        </>
      ) : (
        <>
          <path d="M17.94 17.94A10.94 10.94 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
          <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
          <path d="M14.12 14.12a3 3 0 1 1-4.24-4.24" />
          <line x1="1" y1="1" x2="23" y2="23" />
        </>
      )}
    </svg>
  );
}

export default function Cadastro() {
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [confirmar, setConfirmar] = useState('');
  const [verSenha, setVerSenha] = useState(false);
  const [verConfirmar, setVerConfirmar] = useState(false);
  const [erro, setErro] = useState('');
  const router = useRouter();
  function enviar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    
    
    if (senha.length < 6) {
      setErro('A senha precisa ter pelo menos 6 caracteres.');
      return;
    }
    if (senha !== confirmar) {
      setErro('As senhas não conferem.');
      return;
    }

    router.push('/login')

    setErro('');
    // Aqui entra a chamada à sua API de cadastro
    console.log('Cadastrar:', { email, senha });
  }

  return (
    <main className={`${styles.pagina} ${montserrat.className}`}>
      <section className={styles.lado_form}>
        <div className={styles.card}>
          <span className={styles.logo}>UniPlace</span>
          <h1 className={styles.titulo}>Cadastre-se</h1>

          <form className={styles.form} onSubmit={enviar} noValidate>
            <div className={styles.campo}>
              <label htmlFor="email">Email</label>
              <input
                id="email"
                type="email"
                value={email}
                placeholder="email@gmail.com"
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                required
              />
            </div>

            <div className={styles.campo}>
              <label htmlFor="senha">Senha</label>
              <div className={styles.senha}>
                <input
                  id="senha"
                  type={verSenha ? 'text' : 'password'}
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                  autoComplete="new-password"
                  required
                />
                <button
                  type="button"
                  className={styles.olho}
                  onClick={() => setVerSenha(!verSenha)}
                  aria-label={verSenha ? 'Ocultar senha' : 'Mostrar senha'}
                >
                  <IconeOlho aberto={verSenha} />
                </button>
              </div>
            </div>

            <div className={styles.campo}>
              <label htmlFor="confirmar">Confirmar Senha</label>
              <div className={styles.senha}>
                <input
                  id="confirmar"
                  type={verConfirmar ? 'text' : 'password'}
                  value={confirmar}
                  onChange={(e) => setConfirmar(e.target.value)}
                  autoComplete="new-password"
                  required
                />
                <button
                  type="button"
                  className={styles.olho}
                  onClick={() => setVerConfirmar(!verConfirmar)}
                  aria-label={verConfirmar ? 'Ocultar senha' : 'Mostrar senha'}
                >
                  <IconeOlho aberto={verConfirmar} />
                </button>
              </div>
            </div>

            {erro && <p className={styles.erro} role="alert">{erro}</p>}

            <button type="submit" className={styles.botao}>
              CADASTRAR
            </button>
          </form>

          <p className={styles.login}>
            Já possui uma conta? <Link href="/login">Login</Link>
          </p>
        </div>
      </section>
      
      <aside className={styles.lado_ilustracao} aria-hidden="true">
        <Image src="/foto_redefinir.png" alt="" width={520} height={420} priority/>
      </aside>
    </main>
  );
}
