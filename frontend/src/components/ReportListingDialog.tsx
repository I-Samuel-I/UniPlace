import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import type { Product } from "../data/catalog";
import { buildListingReport, listingReportReasons, REPORT_DETAILS_LIMIT } from "../data/reports";
import { api, errorMessage } from "../lib/api";
import { Icon } from "./Icon";
import { formatPrice } from "./ProductCard";
import "./report-listing.css";

export function ReportListingDialog({
  product,
  onClose,
  onSuccess,
}: {
  product: Product;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const pending = useRef(false);
  const [reasonId, setReasonId] = useState("");
  const [details, setDetails] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const custom = reasonId === "other";
  const report = buildListingReport(reasonId, details);

  useEffect(() => {
    const dialog = dialogRef.current;
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    dialog?.showModal();
    titleRef.current?.focus();
    return () => {
      dialog?.close();
      if (previousFocus?.isConnected) previousFocus.focus({ preventScroll: true });
    };
  }, []);

  function close() {
    if (!pending.current) onClose();
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending.current || !report) return;
    pending.current = true;
    setBusy(true);
    setError("");
    try {
      await api("/me/tickets/", {
        method: "POST",
        body: { kind: "report", post_id: product.id, ...report },
      });
      onSuccess();
    } catch (failure) {
      setError(errorMessage(failure, "Não foi possível enviar a denúncia. Tente novamente."));
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }

  return (
    <dialog
      className="report-listing-dialog"
      ref={dialogRef}
      aria-labelledby="report-listing-title"
      aria-describedby="report-listing-description"
      onCancel={event => { event.preventDefault(); close(); }}
      onClick={event => { if (event.target === event.currentTarget) close(); }}
    >
      <form className="report-listing-form" onSubmit={submit} aria-busy={busy}>
        <header className="report-listing-header">
          <span className="report-listing-icon"><Icon name="shield" size={25} /></span>
          <div>
            <h2 id="report-listing-title" ref={titleRef} tabIndex={-1}>Denunciar anúncio</h2>
            <p id="report-listing-description">Conte para a equipe o que está acontecendo.</p>
          </div>
          <button className="report-listing-close" type="button" onClick={close} disabled={busy} aria-label="Fechar"><Icon name="x" size={20} /></button>
        </header>

        <div className="report-listing-body">
          <div className="report-listing-product">
            <img src={product.image} alt="" width="60" height="60" />
            <div>
              <span>Anúncio selecionado</span>
              <strong title={product.title}>{product.title}</strong>
              <span className="report-listing-price">{formatPrice(product.price)}</span>
            </div>
          </div>

          <fieldset className="report-listing-reasons" disabled={busy}>
            <legend>Qual é o motivo da denúncia?</legend>
            <div>
              {listingReportReasons.map(reason => (
                <label className="report-listing-reason" key={reason.id}>
                  <input type="radio" name="listing-report-reason" value={reason.id} checked={reasonId === reason.id} onChange={() => { setReasonId(reason.id); setError(""); }} required />
                  <span>{reason.label}</span>
                </label>
              ))}
            </div>
          </fieldset>

          <label className="report-listing-details" htmlFor="listing-report-details">
            <span>{custom ? "Descreva o motivo" : "Quer acrescentar algum detalhe?"}<small>{custom ? "Obrigatório" : "Opcional"}</small></span>
            <textarea id="listing-report-details" value={details} onChange={event => { setDetails(event.target.value); setError(""); }} disabled={busy} required={custom} maxLength={REPORT_DETAILS_LIMIT} rows={3} placeholder="Explique o que você percebeu no anúncio…" aria-describedby="listing-report-details-hint" />
          </label>
          <div className="report-listing-field-hint" id="listing-report-details-hint"><span>{custom ? "Conte o que aconteceu para a equipe analisar." : "Os detalhes ajudam a equipe a analisar o anúncio."}</span><span>{details.length}/{REPORT_DETAILS_LIMIT}</span></div>
          <p className="report-listing-note"><Icon name="info" size={17} />Depois do envio, acompanhe a resposta em Ajuda e suporte.</p>
        </div>

        <footer className="report-listing-footer">
          {error && <p className="report-listing-error" role="alert"><Icon name="alert" size={18} /><span>{error}</span></p>}
          <div className="report-listing-actions">
            <button className="report-listing-cancel" type="button" onClick={close} disabled={busy}>Cancelar</button>
            <button className="report-listing-submit" type="submit" disabled={busy || !report}><Icon name={busy ? "clock" : "send"} size={18} />{busy ? "Enviando…" : "Enviar denúncia"}</button>
          </div>
        </footer>
      </form>
    </dialog>
  );
}
