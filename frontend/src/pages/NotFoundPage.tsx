import { useEffect } from "react";
import { Icon } from "../components/Icon";
import { useScrollReveal } from "../lib/scrollReveal";
import "./not-found.css";

export function NotFoundPage() {
  const contentRef = useScrollReveal();
  useEffect(() => {
    document.title = "404 · Página não encontrada | UniPlace";
  }, []);

  return (
    <div className="not-found-page">
      <a className="skip-link" href="#not-found-main">
        Ir para o conteúdo
      </a>
      <header className="not-found-topbar">
        <a className="not-found-brand" href="/" aria-label="UniPlace — Início">
          <span className="not-found-brand-icon">
            <Icon name="bag" size={23} />
          </span>
          <span>
            Uni<span>Place</span>
          </span>
        </a>
        <a className="not-found-top-help" href="/suporte">
          <Icon name="help" size={19} /> Precisa de ajuda?
        </a>
      </header>

      <main
        className="not-found-main"
        id="not-found-main"
        tabIndex={-1}
        ref={contentRef}
      >
        <div className="not-found-art" aria-hidden="true" data-reveal>
          <span className="not-found-orbit" />
          <span className="not-found-number">4</span>
          <span className="not-found-zero">
            <Icon name="bag" size={57} />
      
          </span>
          <span className="not-found-number">4</span>
        </div>

        <div className="not-found-copy" data-reveal data-reveal-delay="70">
     
          <h1>
            Ops, esse caminho
            <br />
            não existe.
          </h1>
          <p>
            O endereço pode estar incorreto ou a página pode ter mudado de
            lugar. Vamos encontrar o seu próximo achado?
          </p>
          <div className="not-found-actions">
            <a className="primary-button" href="/">
              <Icon name="home" size={19} /> Voltar ao início
            </a>
            <a className="not-found-secondary" href="/explorar">
              <Icon name="search" size={19} /> Explorar anúncios
            </a>
          </div>
          <p className="not-found-support">
            Se precisar, <a href="/suporte">a gente te ajuda por aqui.</a>
          </p>
        </div>
      </main>

      <footer className="not-found-footer">
        <span>© 2026 UniPlace</span>
        <span>Conectando a comunidade do campus.</span>
        <nav aria-label="Documentos da plataforma">
          <a href="/termos-de-uso">Termos de uso</a>
          <a href="/politica-de-privacidade">Privacidade</a>
        </nav>
      </footer>
    </div>
  );
}
