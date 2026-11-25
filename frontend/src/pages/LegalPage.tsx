import { useEffect } from "react";
import { Icon } from "../components/Icon";
import { legalDocuments, type LegalKind } from "../data/legal";
import { getSession } from "../lib/api";
import "./legal.css";

export function LegalPage({ kind }: { kind: LegalKind }) {
  const document = legalDocuments[kind];
  const signedIn = Boolean(getSession());
  useEffect(() => { window.document.title = `${document.title} | UniPlace`; }, [document.title]);
  return (
    <div className="legal-page">
      <header className="legal-topbar">
        <a className="legal-brand" href={signedIn ? "/configuracoes" : "/"}>
          <span><Icon name="bag" size={22} /></span>Uni<span className="legal-brand-accent">Place</span>
        </a>
        <a className="legal-back" href={signedIn ? "/configuracoes" : "/"}>
          <Icon name="arrow-left" size={18} /> {signedIn ? "Voltar às configurações" : "Voltar ao início"}
        </a>
      </header>
      <main className="legal-content">
        <header className="legal-heading">
          <span className="legal-example">Exemplo para apresentação acadêmica</span>
          <h1>{document.title}</h1>
          <p>{document.intro}</p>
          <span className="legal-version">Versão de 25 de novembro de 2026</span>
        </header>
        <div className="legal-layout">
          <nav className="legal-index" aria-label="Seções do documento">
            <strong>Neste documento</strong>
            {document.sections.map((section, index) => <a key={section.title} href={`#secao-${index + 1}`}>{index + 1}. {section.title}</a>)}
          </nav>
          <article className="legal-document">
            {document.sections.map((section, index) => (
              <section key={section.title} id={`secao-${index + 1}`}>
                <h2>{index + 1}. {section.title}</h2>
                {section.paragraphs.map(paragraph => <p key={paragraph}>{paragraph}</p>)}
              </section>
            ))}
            {kind === "privacy" && <p className="legal-reference">Referência: <a href="https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709compilado.htm" target="_blank" rel="noreferrer">Lei nº 13.709/2018 — LGPD <Icon name="arrow-right" size={16} /></a></p>}
          </article>
        </div>
        <footer className="legal-footer">
          <a href={kind === "privacy" ? "/termos-de-uso" : "/politica-de-privacidade"}>{kind === "privacy" ? "Ler os termos de uso" : "Ler a política de privacidade"} <Icon name="arrow-right" size={18} /></a>
          <span>© 2026 UniPlace</span>
        </footer>
      </main>
    </div>
  );
}
