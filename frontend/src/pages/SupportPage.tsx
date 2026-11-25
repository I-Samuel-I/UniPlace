import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { Icon } from "../components/Icon";
import { api, errorMessage } from "../lib/api";
import type { Ticket } from "../data/community";
import {
  buildSupportMessage,
  supportCategories,
  supportWhatsAppUrl,
  SUPPORT_PHONE,
  type SupportCategoryId,
} from "../data/support";
import "./support.css";

const questions = [
  {
    title: "Como funciona o atendimento pelo WhatsApp?",
    answer: "Escolha uma categoria e o motivo do contato. Ao continuar, o WhatsApp abre com a mensagem preparada. Você pode revisar o texto e tocar em enviar para iniciar a conversa com o suporte UniPlace.",
  },
  {
    title: "Posso enviar prints ou fotos do problema?",
    answer: "Sim! Depois de abrir a conversa no WhatsApp, você pode anexar prints, fotos e outros detalhes que ajudem a entender o que aconteceu. Para denúncias, inclua também o link do anúncio, perfil ou conversa.",
  },
  {
    title: "Onde acompanho a resposta à minha solicitação?",
    answer: "Os contatos iniciados por esta página são acompanhados na própria conversa do WhatsApp. Se você já registrou um chamado ou uma denúncia dentro da plataforma, consulte a seção de chamados e denúncias anteriores abaixo.",
  },
];

export function SupportPage() {
  const [categoryId, setCategoryId] = useState<SupportCategoryId>("support");
  const [reasonId, setReasonId] = useState("");
  const [details, setDetails] = useState("");
  const [reference, setReference] = useState("");
  const category = supportCategories.find(item => item.id === categoryId)!;
  const custom = categoryId === "other" || reasonId === "other";
  const message = buildSupportMessage({ categoryId, reasonId, details, reference });

  function chooseCategory(next: SupportCategoryId) {
    setCategoryId(next);
    setReasonId("");
  }

  function contact(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (message) window.open(supportWhatsAppUrl(message), "_blank", "noopener,noreferrer");
  }

  return (
    <section className="support-page" aria-labelledby="support-title">
      <header className="support-hero" data-reveal>
        <div className="support-hero-copy">
          <span className="support-eyebrow"><span /> CENTRAL DE AJUDA</span>
          <h1 id="support-title">Ajuda e suporte<span>Conte com a gente.</span></h1>
          <p>Uma dúvida, um imprevisto ou uma sugestão? Escolha o assunto e vamos conversar.</p>
          <span className="support-hero-channel"><Icon name="whatsapp" size={18} /> Atendimento pelo WhatsApp</span>
        </div>
        <div className="support-hero-art" aria-hidden="true">
          <span className="support-art-orbit" />
          <span className="support-art-headphones"><Icon name="headphones" size={65} /></span>
          <span className="support-art-chat"><Icon name="chat" size={28} /></span>
          <span className="support-art-check"><Icon name="check" size={19} /></span>
        </div>
      </header>

      <form onSubmit={contact} className="support-request">
        <fieldset className="support-categories">
          <legend><span className="support-step">1</span> Sobre o que você quer falar?</legend>
          <p className="support-section-description">Selecione a categoria que combina com o seu pedido.</p>
          <div className="support-category-grid">
            {supportCategories.map((item, index) => (
              <label className={`support-category support-category--${item.id}`} key={item.id} data-reveal data-reveal-delay={index * 55}>
                <input type="radio" name="support-category" value={item.id} checked={categoryId === item.id} onChange={() => chooseCategory(item.id)} />
                <span className="support-category-content">
                  <span className="support-category-icon"><Icon name={item.icon} size={25} /></span>
                  <span className="support-category-check"><Icon name="check" size={13} /></span>
                  <strong>{item.label}</strong>
                  <span>{item.description}</span>
                </span>
              </label>
            ))}
          </div>
        </fieldset>

        <div className="support-workspace">
          <section className="support-compose support-panel" aria-labelledby="support-compose-title" data-reveal>
            <header className="support-panel-heading">
              <h2 id="support-compose-title"><span className="support-step">2</span> Vamos entender melhor</h2>
              <p>{categoryId === "other" ? "Este espaço é seu. Conte qual assunto você quer tratar." : "Escolha o motivo e acrescente os detalhes que quiser."}</p>
            </header>

            {category.reasons.length > 0 && (
              <fieldset className="support-reasons" key={categoryId}>
                <legend>Qual é o motivo do contato?</legend>
                <div className="support-reason-list">
                  {category.reasons.map(reason => (
                    <label className="support-reason" key={reason.id}>
                      <input type="radio" name="support-reason" value={reason.id} checked={reasonId === reason.id} onChange={() => setReasonId(reason.id)} required />
                      <span>{reason.label}</span>
                      <Icon name="check" size={16} />
                    </label>
                  ))}
                </div>
              </fieldset>
            )}

            <label className="support-field" htmlFor="support-details">
              <span>{custom ? "Conte o que você precisa" : "Quer contar um pouco mais?"}<small>{custom ? "Obrigatório" : "Opcional"}</small></span>
              <textarea id="support-details" value={details} onChange={event => setDetails(event.target.value)} required={custom} maxLength={1500} rows={5} placeholder={categoryId === "report" ? "Descreva o que aconteceu e quem está envolvido…" : categoryId === "issue" ? "O que aconteceu? Em qual tela você estava?" : "Escreva aqui os detalhes do seu pedido…"} aria-describedby="support-details-hint" />
            </label>
            <div className="support-field-footer" id="support-details-hint"><span>{custom ? "Descreva o assunto para preparar sua mensagem." : "Os detalhes ajudam a gente a entender seu pedido."}</span><span>{details.length}/1500</span></div>

            <label className="support-field support-reference" htmlFor="support-reference">
              <span>Link relacionado<small>Opcional</small></span>
              <input id="support-reference" type="url" inputMode="url" value={reference} onChange={event => setReference(event.target.value)} maxLength={500} placeholder="Link do anúncio, perfil ou conversa" />
            </label>
            {categoryId === "report" && <p className="support-context-note"><Icon name="info" size={18} />Se tiver prints, você pode anexá-los na conversa pelo WhatsApp.</p>}
          </section>

          <aside className="support-preview support-panel" aria-labelledby="support-preview-title" data-reveal data-reveal-delay="100">
            <div className="support-preview-heading"><span className="support-whatsapp-icon"><Icon name="whatsapp" size={26} /></span><div><h2 id="support-preview-title">Vamos conversar?</h2><p>Suporte UniPlace</p></div></div>
            <div className="support-message-area">
              <span className="support-preview-label">PRÉVIA DA SUA MENSAGEM</span>
              <div className={`support-message${message ? " is-ready" : ""}`}>
                {message ? <p>{message}</p> : <><Icon name="chat" size={26} /><p>{custom ? "Escreva sobre o seu assunto para preparar a mensagem." : "Escolha um motivo ao lado para preparar sua mensagem."}</p></>}
              </div>
              <span className="support-message-note"><Icon name="check-check" size={16} /> Você revisa antes de enviar.</span>
            </div>
            <div className="support-preview-action">
              <button className="support-whatsapp-button" type="submit" disabled={!message} aria-describedby="support-send-hint"><Icon name="whatsapp" size={22} /> Continuar no WhatsApp</button>
              <p id="support-send-hint">A conversa abre no WhatsApp com sua mensagem pronta para enviar.</p>
              <span className="support-phone">{SUPPORT_PHONE}</span>
            </div>
          </aside>
        </div>
      </form>

      <section className="support-faq" aria-labelledby="support-faq-title" data-reveal>
        <div className="support-faq-heading"><span className="support-faq-icon"><Icon name="help" size={25} /></span><div><h2 id="support-faq-title">Antes de chamar, uma ajudinha</h2><p>Respostas rápidas para seguir com tranquilidade.</p></div></div>
        <div className="support-faq-list">{questions.map(question => <details key={question.title}><summary>{question.title}<Icon name="plus" size={20} /></summary><p>{question.answer}</p></details>)}</div>
      </section>
      <SupportHistory />
      <p className="support-footer"><Icon name="heart" size={16} /> Feito para aproximar a nossa comunidade.</p>
    </section>
  );
}

function SupportHistory() {
  const [open, setOpen] = useState(false);
  const [tickets, setTickets] = useState<Ticket[] | null>(null);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setError("");
    void api<Ticket[]>("/me/tickets/").then(data => {
      if (!cancelled) setTickets(data);
    }).catch(failure => {
      if (!cancelled) setError(errorMessage(failure, "Não foi possível carregar os chamados."));
    });
    return () => { cancelled = true; };
  }, [open, retry]);

  return (
    <details className="support-history support-panel" onToggle={event => setOpen(event.currentTarget.open)} data-reveal>
      <summary><span className="support-history-icon"><Icon name="file" size={21} /></span><span><strong>Chamados e denúncias anteriores</strong><small>Consulte solicitações registradas dentro da plataforma.</small></span><Icon name="chevron-down" size={20} /></summary>
      {open && <div className="support-history-body">
        {error ? <div role="alert"><p>{error}</p><button className="support-retry" type="button" onClick={() => setRetry(value => value + 1)}>Tentar novamente</button></div> : tickets === null ? <p role="status">Carregando suas solicitações…</p> : tickets.length === 0 ? <p>Você ainda não tem chamados ou denúncias registrados na plataforma.</p> : tickets.map(ticket => <article className="support-ticket" key={ticket.id}><div><h3>{ticket.subject}</h3><span className={`support-ticket-status${ticket.status === "resolved" ? " is-resolved" : ""}`}>{ticket.status === "open" ? "Aberto" : "Resolvido"}</span></div><p>{ticket.message}</p>{ticket.reply && <blockquote><strong>Resposta da equipe</strong><p>{ticket.reply}</p></blockquote>}</article>)}
      </div>}
    </details>
  );
}
