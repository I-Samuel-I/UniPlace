import { useCallback, useEffect, useRef, useState } from "react";
import type { Product } from "./catalog";
import { getProductDetails, getSeller } from "./productDetails";
import { currentUser } from "./account";

export type ChatMessage = {
  id: string;
  sender: "me" | "contact";
  text: string;
  createdAt: string;
  attachment?: { name: string; url: string; type: string };
};

export type Conversation = {
  id: string;
  contact: {
    id: string;
    name: string;
    avatar: string;
    online: boolean;
    email: string;
    institution: string;
    memberSince: string;
    rating: number;
    reviewCount: number;
  };
  productId: string;
  messages: ChatMessage[];
  unread: number;
  favorite: boolean;
  updatedAt: string;
};

const fixtureMessage = (
  id: string,
  sender: ChatMessage["sender"],
  text: string,
  time: string,
  day = "2026-11-11",
): ChatMessage => ({ id, sender, text, createdAt: `${day}T${time}:00-03:00` });
const firstMessages: ChatMessage[] = [
  fixtureMessage(
    "matheus-1",
    "contact",
    "Olá! Ainda está disponível o notebook?",
    "10:12",
  ),
  fixtureMessage(
    "matheus-2",
    "me",
    "Sim! Ainda está disponível. É só me chamar por aqui que combinamos.",
    "10:16",
  ),
  fixtureMessage(
    "matheus-3",
    "contact",
    "Qual o menor valor que você aceita?",
    "10:17",
  ),
  fixtureMessage(
    "matheus-4",
    "me",
    "Eu consigo fazer por R$ 2.500,00. Está em ótimo estado, só estou vendendo porque vou mudar de campus.",
    "10:20",
  ),
  fixtureMessage(
    "matheus-5",
    "contact",
    "Show! Consigo pegar ainda hoje. Você aceita PIX?",
    "10:22",
  ),
  fixtureMessage(
    "matheus-6",
    "me",
    "Sim! Pode ser via PIX. Se quiser, posso te enviar mais fotos por aqui para combinarmos.",
    "10:24",
  ),
];

const contacts = [
  {
    id: "matheus-freitas",
    name: "Matheus Freitas",
    avatar: "/images/seller-lucas.jpg",
    online: true,
    productId: "macbook-air-m1-8gb-256gb",
    unread: 2,
    favorite: false,
    preview: "Ainda está disponível?",
    time: "10:24",
    day: "2026-11-11",
  },
  {
    id: "camila-santos",
    name: "Camila Santos",
    avatar: "/images/seller-lucas.jpg",
    online: true,
    productId: "iphone-13-128gb",
    unread: 1,
    favorite: true,
    preview: "Blz, vou te chamar aqui!",
    time: "09:47",
    day: "2026-11-11",
  },
  {
    id: "lucas-oliveira",
    sellerId: "lucas-almeida",
    name: "Lucas Almeida",
    avatar: "/images/seller-lucas.jpg",
    online: false,
    productId: "notebook-acer-aspire-5",
    unread: 0,
    favorite: false,
    preview: "Consegui pegar aqui, valeu!",
    time: "17:30",
    day: "2026-11-10",
  },
  {
    id: "ana-clara",
    name: "Ana Clara",
    avatar: "/images/seller-lucas.jpg",
    online: false,
    productId: "cadeira-escritorio",
    unread: 0,
    favorite: false,
    preview: "Pode ser sim! Qual o horário?",
    time: "15:20",
    day: "2026-11-10",
  },
  {
    id: "gabriel-lima",
    name: "Gabriel Lima",
    avatar: "/images/seller-matheus.jpg",
    online: false,
    productId: "mochila-nike",
    unread: 1,
    favorite: false,
    preview: "Opa, ainda está disponível?",
    time: "16:12",
    day: "2026-11-07",
  },
  {
    id: "julia-martins",
    name: "Júlia Martins",
    avatar: "/images/seller-lucas.jpg",
    online: false,
    productId: "guyton-fisiologia",
    unread: 0,
    favorite: true,
    preview: "Perfeito, obrigado!",
    time: "11:15",
    day: "2026-11-07",
  },
  {
    id: "rafael-costa",
    name: "Rafael Costa",
    avatar: "/images/seller-matheus.jpg",
    online: false,
    productId: "ipad-9-geracao",
    unread: 0,
    favorite: false,
    preview: "Boa tarde! Qual o valor mínimo?",
    time: "14:30",
    day: "2026-11-06",
  },
  {
    id: "fernanda-alves",
    name: "Fernanda Alves",
    avatar: "/images/seller-lucas.jpg",
    online: false,
    productId: "monitor-dell-24",
    unread: 0,
    favorite: false,
    preview: "Ok, vou verificar aqui",
    time: "10:20",
    day: "2026-11-06",
  },
  {
    id: "thiago-pereira",
    name: "Thiago Pereira",
    avatar: "/images/seller-matheus.jpg",
    online: false,
    productId: "controle-ps5",
    unread: 0,
    favorite: false,
    preview: "Pode me mandar mais fotos?",
    time: "13:45",
    day: "2026-11-05",
  },
];

// These are local examples. No message is sent to another person.
export const initialConversations: Conversation[] = contacts.map((person) => {
  const messages =
    person.id === "matheus-freitas"
      ? firstMessages
      : [
          fixtureMessage(
            `${person.id}-1`,
            "contact",
            person.preview,
            person.time,
            person.day,
          ),
        ];
  return {
    id: person.id,
    contact: {
      id: person.sellerId ?? person.id,
      name: person.name,
      avatar: person.avatar,
      online: person.online,
      email: `${(person.sellerId ?? person.id).split("-")[0]}@alunos.unifip.edu.br`,
      institution: "UNIFIP",
      memberSince: "2025",
      rating: person.id === "matheus-freitas" ? 4.8 : 4.9,
      reviewCount: person.id === "matheus-freitas" ? 24 : 12,
    },
    productId: person.productId,
    messages,
    unread: person.unread,
    favorite: person.favorite,
    updatedAt: messages[messages.length - 1].createdAt,
  };
});

export const CHAT_STORAGE_KEY = "uniplace:chat:v1";
const MAX_CONVERSATIONS = 500;
const MAX_MESSAGES = 2000;
const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);
const isString = (
  value: unknown,
  max: number,
  empty = false,
): value is string =>
  typeof value === "string" &&
  value.length <= max &&
  (empty || Boolean(value.trim()));
const isId = (value: unknown): value is string =>
  typeof value === "string" &&
  /^[a-zA-Z0-9][a-zA-Z0-9._:-]{0,127}$/.test(value);
const isDate = (value: unknown): value is string =>
  typeof value === "string" &&
  value.length <= 40 &&
  Number.isFinite(Date.parse(value));
const isCounter = (value: unknown): value is number =>
  typeof value === "number" && Number.isSafeInteger(value) && value >= 0;

function isImageUrl(value: unknown): value is string {
  return (
    typeof value === "string" &&
    value.length <= 2_800_000 &&
    (/^\/(?!\/)/.test(value) ||
      /^https?:\/\//i.test(value) ||
      /^data:image\/(?:jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(value))
  );
}

function isAttachment(
  value: unknown,
): value is NonNullable<ChatMessage["attachment"]> {
  return (
    isObject(value) &&
    isString(value.name, 200) &&
    isString(value.type, 100) &&
    typeof value.url === "string" &&
    value.url.length <= 2_800_000 &&
    (isImageUrl(value.url) ||
      /^data:application\/pdf;base64,[A-Za-z0-9+/=]+$/.test(value.url)) &&
    /^(?:image\/(?:jpeg|png|webp)|application\/pdf)$/.test(value.type)
  );
}

export function isChatMessage(value: unknown): value is ChatMessage {
  return (
    isObject(value) &&
    isId(value.id) &&
    ["me", "contact"].includes(String(value.sender)) &&
    isString(value.text, 5000, true) &&
    isDate(value.createdAt) &&
    (value.attachment === undefined || isAttachment(value.attachment)) &&
    (Boolean(value.text.trim()) || value.attachment !== undefined)
  );
}

export function isConversation(value: unknown): value is Conversation {
  if (!isObject(value) || !isObject(value.contact)) return false;
  const contact = value.contact;
  if (
    !isId(value.id) ||
    !isId(value.productId) ||
    !isId(contact.id) ||
    !isString(contact.name, 120) ||
    !isImageUrl(contact.avatar)
  )
    return false;
  if (
    typeof contact.online !== "boolean" ||
    !isString(contact.email, 254) ||
    !isString(contact.institution, 120) ||
    !isString(contact.memberSince, 40)
  )
    return false;
  if (
    typeof contact.rating !== "number" ||
    !Number.isFinite(contact.rating) ||
    contact.rating < 0 ||
    contact.rating > 5 ||
    !isCounter(contact.reviewCount)
  )
    return false;
  if (
    !Array.isArray(value.messages) ||
    value.messages.length > MAX_MESSAGES ||
    !value.messages.every(isChatMessage)
  )
    return false;
  if (
    new Set(value.messages.map((message) => message.id)).size !==
    value.messages.length
  )
    return false;
  return (
    isCounter(value.unread) &&
    typeof value.favorite === "boolean" &&
    isDate(value.updatedAt)
  );
}

function cloneExamples() {
  return initialConversations.map((conversation) => ({
    ...conversation,
    contact: { ...conversation.contact },
    messages: conversation.messages.map((message) => ({ ...message })),
  }));
}

function readConversations(): {
  conversations: Conversation[];
  error: string | null;
} {
  try {
    if (typeof localStorage === "undefined")
      return { conversations: cloneExamples(), error: null };
    const raw = localStorage.getItem(CHAT_STORAGE_KEY);
    if (raw === null) return { conversations: cloneExamples(), error: null };
    const value: unknown = JSON.parse(raw);
    if (
      !isObject(value) ||
      value.version !== 1 ||
      !Array.isArray(value.conversations) ||
      value.conversations.length > MAX_CONVERSATIONS ||
      !value.conversations.every(isConversation)
    )
      throw new Error("Invalid saved chat data");
    if (
      new Set(value.conversations.map((conversation) => conversation.id))
        .size !== value.conversations.length
    )
      throw new Error("Duplicate saved conversation IDs");
    return {
      conversations: value.conversations as Conversation[],
      error: null,
    };
  } catch {
    return {
      conversations: cloneExamples(),
      error:
        "Não foi possível recuperar as conversas salvas neste navegador. Os exemplos foram restaurados.",
    };
  }
}

function newId(prefix: string) {
  const suffix =
    globalThis.crypto?.randomUUID?.() ??
    `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  return `${prefix}-${suffix}`;
}

export function useChat() {
  const [loaded] = useState(readConversations);
  const [conversations, setConversations] = useState<Conversation[]>(
    loaded.conversations,
  );
  const [storageError, setStorageError] = useState<string | null>(loaded.error);
  const conversationsRef = useRef(conversations);
  const dirty = useRef(false);
  conversationsRef.current = conversations;

  const update = useCallback(
    (change: (previous: Conversation[]) => Conversation[]) => {
      const previous = conversationsRef.current;
      const next = change(previous);
      if (next === previous) return;
      dirty.current = true;
      conversationsRef.current = next;
      setConversations(next);
    },
    [],
  );

  useEffect(() => {
    if (loaded.error && !dirty.current) return;
    try {
      if (typeof localStorage === "undefined") return;
      localStorage.setItem(
        CHAT_STORAGE_KEY,
        JSON.stringify({ version: 1, conversations }),
      );
      setStorageError(null);
    } catch {
      setStorageError(
        "As mensagens ficam disponíveis nesta sessão, mas o navegador não conseguiu salvá-las. Libere espaço para manter o histórico após recarregar.",
      );
    }
  }, [conversations, loaded.error]);

  const markRead = useCallback(
    (id: string) => {
      update((previous) => {
        if (
          !previous.some(
            (conversation) => conversation.id === id && conversation.unread > 0,
          )
        )
          return previous;
        return previous.map((conversation) =>
          conversation.id === id
            ? { ...conversation, unread: 0 }
            : conversation,
        );
      });
    },
    [update],
  );

  const toggleFavorite = useCallback(
    (id: string) => {
      update((previous) => {
        if (!previous.some((conversation) => conversation.id === id))
          return previous;
        return previous.map((conversation) =>
          conversation.id === id
            ? { ...conversation, favorite: !conversation.favorite }
            : conversation,
        );
      });
    },
    [update],
  );

  const sendMessage = useCallback(
    (
      conversationId: string,
      text: string,
      attachment?: ChatMessage["attachment"],
    ) => {
      const trimmed = text.trim();
      if (!trimmed && !attachment) return;
      if (trimmed.length > 5000)
        throw new Error("A mensagem deve ter até 5.000 caracteres.");
      if (attachment && !isAttachment(attachment))
        throw new Error(
          "Escolha uma imagem JPEG, PNG ou WebP ou um PDF válido para anexar.",
        );
      const message: ChatMessage = {
        id: newId("message"),
        sender: "me",
        text: trimmed,
        createdAt: new Date().toISOString(),
        ...(attachment ? { attachment } : {}),
      };
      update((previous) => {
        const target = previous.find(
          (conversation) => conversation.id === conversationId,
        );
        if (!target) return previous;
        if (target.messages.length >= MAX_MESSAGES)
          throw new Error(
            "Esta conversa atingiu o limite de 2.000 mensagens neste navegador. O histórico foi mantido e a nova mensagem não foi enviada.",
          );
        return previous.map((conversation) =>
          conversation.id === conversationId
            ? {
                ...conversation,
                messages: [...conversation.messages, message],
                updatedAt: message.createdAt,
                unread: 0,
              }
            : conversation,
        );
      });
    },
    [update],
  );

  const startConversation = useCallback(
    (product: Product) => {
      const seller = getSeller(getProductDetails(product).sellerId);
      if (seller.id === currentUser.id || product.id.startsWith("meu-")) {
        const buyerConversation = conversationsRef.current.find(
          (conversation) =>
            conversation.productId === product.id &&
            conversation.contact.id !== currentUser.id,
        );
        return buyerConversation?.id ?? "";
      }
      const existing = conversationsRef.current.find(
        (conversation) =>
          conversation.productId === product.id &&
          conversation.contact.id === seller.id,
      );
      if (existing) return existing.id;
      const createdAt = new Date().toISOString();
      const conversation: Conversation = {
        id: newId("conversation"),
        contact: {
          id: seller.id,
          name: seller.name,
          avatar: seller.avatar,
          online: seller.online,
          email: `${seller.id.split("-")[0]}@alunos.unifip.edu.br`,
          institution: "UNIFIP",
          memberSince: seller.memberSince,
          rating: seller.rating,
          reviewCount: seller.reviewCount,
        },
        productId: product.id,
        messages: [],
        unread: 0,
        favorite: false,
        updatedAt: createdAt,
      };
      update((previous) => {
        if (previous.length >= MAX_CONVERSATIONS)
          throw new Error(
            "Você atingiu o limite de 500 conversas neste navegador. Não foi possível iniciar outra conversa.",
          );
        return [conversation, ...previous];
      });
      return conversation.id;
    },
    [update],
  );

  return {
    conversations,
    sendMessage,
    markRead,
    toggleFavorite,
    startConversation,
    storageError,
  };
}
