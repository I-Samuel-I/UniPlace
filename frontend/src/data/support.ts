export const SUPPORT_PHONE = "(83) 9 9606-7677";
export const SUPPORT_WHATSAPP_URL = "https://wa.me/5583996067677";

export const supportCategories = [
  {
    id: "support",
    label: "Dúvidas e suporte",
    description: "Uma mãozinha para usar o UniPlace.",
    icon: "headphones",
    reasons: [
      { id: "buy", label: "Como comprar e negociar" },
      { id: "publish", label: "Como publicar um anúncio" },
      { id: "account", label: "Minha conta e meus dados" },
      { id: "chat", label: "Como conversar com um vendedor" },
      { id: "other", label: "Outro motivo" },
    ],
  },
  {
    id: "issue",
    label: "Problemas na plataforma",
    description: "Algo não funcionou como deveria?",
    icon: "settings",
    reasons: [
      { id: "access", label: "Não consigo acessar minha conta" },
      { id: "listing", label: "Erro ao publicar ou editar anúncio" },
      { id: "photos", label: "Problema ao enviar fotos" },
      { id: "messages", label: "Mensagens não chegam ou não enviam" },
      { id: "loading", label: "Página lenta ou não carrega" },
      { id: "other", label: "Outro problema" },
    ],
  },
  {
    id: "report",
    label: "Fazer uma denúncia",
    description: "Ajude a cuidar da nossa comunidade.",
    icon: "shield",
    reasons: [
      { id: "scam", label: "Suspeita de golpe ou fraude" },
      { id: "inappropriate", label: "Anúncio ou conteúdo inadequado" },
      { id: "fake", label: "Perfil falso" },
      { id: "harassment", label: "Assédio ou comportamento ofensivo" },
      { id: "spam", label: "Spam ou anúncios repetidos" },
      { id: "other", label: "Outro motivo de denúncia" },
    ],
  },
  {
    id: "other",
    label: "Outros assuntos",
    description: "Sugestões, ideias ou algo diferente.",
    icon: "chat",
    reasons: [],
  },
] as const;

export type SupportCategoryId = (typeof supportCategories)[number]["id"];

export function buildSupportMessage({
  categoryId,
  reasonId,
  details = "",
  reference = "",
}: {
  categoryId: SupportCategoryId;
  reasonId: string;
  details?: string;
  reference?: string;
}): string | null {
  const category = supportCategories.find(item => item.id === categoryId);
  if (!category) return null;
  const reason = category.reasons.find(item => item.id === reasonId);
  const custom = categoryId === "other" || reasonId === "other";
  if (categoryId !== "other" && !reason) return null;
  if (custom && !details.trim()) return null;

  return [
    "Olá! Preciso de ajuda no UniPlace.",
    "",
    `Categoria: ${category.label}`,
    ...(reason ? [`Motivo: ${reason.label}`] : []),
    ...(reference.trim() ? [`Link relacionado: ${reference.trim()}`] : []),
    ...(details.trim() ? ["", "Detalhes:", details.trim()] : []),
  ].join("\n");
}

export function supportWhatsAppUrl(message: string) {
  return `${SUPPORT_WHATSAPP_URL}?text=${encodeURIComponent(message)}`;
}
