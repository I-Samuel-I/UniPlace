"use client";

import { useState } from "react";
import Image from "next/image";
import { Poppins } from "next/font/google";
import styles from "./detalhes.module.css";

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

type Foto = {
  src: string;
  alt: string;
};

type Produto = {
  nome: string;
  preco: string;
  descricao: string;
  cor: string;
  fotos: Foto[];
};

const produto: Produto = {
  nome: "Nome",
  preco: "R$ 99,99",
  descricao:
    "Descrição do produto. Escreva aqui os detalhes, características e informações importantes para o comprador.",
  cor: "Preto",
  fotos: [
    { src: "/img/fone.png", alt: "Fone de ouvido Bluetooth preto" },
    { src: "/img/foto1.jpg", alt: "Foto 1" },
    { src: "/img/foto2.jpg", alt: "Foto 2" },
    { src: "/img/foto3.jpg", alt: "Foto 3" },
  ],
};

export default function Home() {
  const [atual, setAtual] = useState<number>(0);

  return (
    <div className={`${styles.container} ${poppins.className}`}>
      {/* Menu lateral */}
      <aside className={styles.sidebar}>
        <div className={styles.sidebarLogo}>U</div>

        <nav className={styles.sidebarNav}>
          <a href="#" aria-label="Início">
            <svg viewBox="0 0 24 24">
              <path d="M3 11l9-8 9 8v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1z" />
            </svg>
          </a>
          <a href="#" aria-label="Mensagens">
            <svg viewBox="0 0 24 24">
              <rect x="3" y="5" width="18" height="14" rx="2" />
              <path d="M3 7l9 6 9-6" />
            </svg>
          </a>
          <a href="#" aria-label="Perfil">
            <svg viewBox="0 0 24 24">
              <circle cx="12" cy="8" r="4" />
              <path d="M4 21c0-4 4-6 8-6s8 2 8 6" />
            </svg>
          </a>
        </nav>

        <a href="#" aria-label="Configurações">
          <svg viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="3" />
            <path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M4.9 19.1L7 17M17 7l2.1-2.1" />
          </svg>
        </a>
      </aside>

      <div className={styles.page}>
        {/* Topo */}
        <header className={styles.topbar}>
          <label className={styles.search}>
            <svg viewBox="0 0 24 24">
              <circle cx="11" cy="11" r="7" />
              <path d="M20 20l-4-4" />
            </svg>
            <input type="search" placeholder="Pesquisar..." />
          </label>

          <a href="#" className={styles.topbarLogin}>
            Login/Cadastrar
          </a>
        </header>

        <main className={styles.produto}>
          {/* Galeria */}
          <section>
            <div className={`${styles.card} ${styles.galeriaPrincipal}`}>
              <div className={styles.galeriaFoto}>
                <Image
                  src={produto.fotos[atual].src}
                  alt={produto.fotos[atual].alt}
                  fill
                  sizes="(max-width: 800px) 100vw, 60vw"
                  priority
                />
              </div>
            </div>

            <div className={styles.galeriaMiniaturas}>
              {produto.fotos.slice(1).map((foto, i) => (
                <button
                  key={foto.src}
                  className={`${styles.miniatura} ${
                    atual === i + 1 ? styles.miniaturaAtiva : ""
                  }`}
                  onClick={() => setAtual(i + 1)}
                  aria-label={foto.alt}
                >
                  <Image src={foto.src} alt={foto.alt} width={40} height={40} />
                </button>
              ))}
            </div>
          </section>

          {/* Detalhes */}
          <section className={styles.detalhes}>
            <div className={`${styles.card} ${styles.info}`}>
              <h1 className={styles.infoNome}>{produto.nome}</h1>
              <p className={styles.infoPreco}>{produto.preco}</p>
              <p className={styles.infoDescricao}>{produto.descricao}</p>
              <p className={styles.infoCor}>Cor : {produto.cor}</p>
              <button
                className={`${styles.cor} ${styles.corPreto}`}
                aria-label={produto.cor}
              />
            </div>

            <div className={`${styles.card} ${styles.acoes}`}>
              <button className={`${styles.btn} ${styles.btnPrimario}`}>
                <svg viewBox="0 0 24 24">
                  <path d="M6 8h12l1 12H5z" />
                  <path d="M9 8a3 3 0 0 1 6 0" />
                </svg>
                Comprar Agora
              </button>
              <button className={`${styles.btn} ${styles.btnSecundario}`}>
                <svg viewBox="0 0 24 24">
                  <path d="M4 5h16v11H9l-5 4z" />
                </svg>
                Falar com o vendedor
              </button>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}