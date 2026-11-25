export const REPORT_DETAILS_LIMIT = 2000;

export const listingReportReasons = [
  { id: "scam", label: "Suspeita de golpe ou fraude" },
  { id: "misleading", label: "Informações incorretas" },
  { id: "inappropriate", label: "Produto ou serviço proibido" },
  { id: "spam", label: "Anúncio duplicado ou spam" },
  { id: "offensive", label: "Conteúdo ofensivo" },
  { id: "other", label: "Outro motivo" },
] as const;

export function buildListingReport(reasonId: string, details: string) {
  const reason = listingReportReasons.find(item => item.id === reasonId);
  const description = details.trim();
  if (!reason || description.length > REPORT_DETAILS_LIMIT || (reason.id === "other" && !description)) return null;
  return {
    subject: `Denúncia de anúncio: ${reason.label}`,
    message: `Motivo: ${reason.label}${description ? `\n\nDetalhes:\n${description}` : ""}`,
  };
}
