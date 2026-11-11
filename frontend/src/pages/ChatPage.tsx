import { useEffect, useMemo, useRef, useState } from "react";
import type { ChangeEvent, ReactNode } from "react";
import type { Product } from "../data/catalog";
import type { ChatMessage, Conversation } from "../data/chat";
import { Icon } from "../components/Icon";
import { formatPrice } from "../components/ProductCard";
import { followLink, productPath } from "../lib/navigation";
import "./chat.css";

type ChatPageProps = {
  conversations: Conversation[];
  conversationId?: string;
  products: Product[];
  onSelectConversation: (id: string) => void;
  onBack: () => void;
  onSendMessage: (
    id: string,
    text: string,
    attachment?: ChatMessage["attachment"],
  ) => void;
  onMarkRead: (id: string) => void;
  onToggleFavorite: (id: string) => void;
  onSelectProduct: (product: Product) => void;
  onNotify: (message: string) => void;
};

type ConversationFilter = "all" | "unread" | "favorites";
const timezone = "America/Fortaleza";
const normalize = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("pt-BR");
const validDate = (value: string) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};
const dateKey = (value: string) => {
  const date = validDate(value);
  return date
    ? new Intl.DateTimeFormat("en-CA", { timeZone: timezone }).format(date)
    : "";
};
function messageTime(value: string) {
  const date = validDate(value);
  return date
    ? new Intl.DateTimeFormat("pt-BR", {
        hour: "2-digit",
        minute: "2-digit",
        timeZone: timezone,
      }).format(date)
    : "";
}
function listTime(value: string) {
  const date = validDate(value);
  if (!date) return "";
  const today = dateKey(new Date().toISOString());
  if (dateKey(value) === today) return messageTime(value);
  const yesterday = new Date();
  yesterday.setUTCDate(yesterday.getUTCDate() - 1);
  if (dateKey(value) === dateKey(yesterday.toISOString())) return "Ontem";
  return new Intl.DateTimeFormat("pt-BR", {
    weekday: "short",
    timeZone: timezone,
  })
    .format(date)
    .replace(".", "");
}
function dayLabel(value: string) {
  const date = validDate(value);
  if (!date) return "Mensagens";
  const label = new Intl.DateTimeFormat("pt-BR", {
    day: "numeric",
    month: "long",
    timeZone: timezone,
  }).format(date);
  return dateKey(value) === dateKey(new Date().toISOString())
    ? `Hoje, ${label}`
    : label;
}

export function ChatPage({
  conversations,
  conversationId,
  products,
  onSelectConversation,
  onBack,
  onSendMessage,
  onMarkRead,
  onToggleFavorite,
  onSelectProduct,
  onNotify,
}: ChatPageProps) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<ConversationFilter>("all");
  const [text, setText] = useState("");
  const [attachment, setAttachment] = useState<ChatMessage["attachment"]>();
  const [readingFile, setReadingFile] = useState(false);
  const [fileError, setFileError] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const [showContact, setShowContact] = useState(false);
  const [dialog, setDialog] = useState<"profile" | "report" | null>(null);
  const historyRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const activeIdRef = useRef(conversationId);
  const fileReadRef = useRef<FileReader | null>(null);
  const contactPanelRef = useRef<HTMLElement>(null);
  const conversation = conversations.find((item) => item.id === conversationId);
  const product = products.find((item) => item.id === conversation?.productId);
  const unreadCount = conversations.filter((item) => item.unread > 0).length;

  const filteredConversations = useMemo(() => {
    const query = normalize(search.trim());
    return conversations
      .filter((item) => {
        if (filter === "unread" && item.unread === 0) return false;
        if (filter === "favorites" && !item.favorite) return false;
        const lastMessage = item.messages[item.messages.length - 1];
        return (
          !query ||
          normalize(`${item.contact.name} ${lastMessage?.text ?? ""}`).includes(
            query,
          )
        );
      })
      .sort(
        (first, second) =>
          (validDate(second.updatedAt)?.getTime() ?? 0) -
          (validDate(first.updatedAt)?.getTime() ?? 0),
      );
  }, [conversations, filter, search]);

  useEffect(() => {
    if (conversation && conversation.unread > 0) onMarkRead(conversation.id);
  }, [conversation?.id, conversation?.unread, onMarkRead]);

  useEffect(() => {
    activeIdRef.current = conversationId;
    fileReadRef.current?.abort();
    setText("");
    setAttachment(undefined);
    setReadingFile(false);
    setFileError("");
    setMenuOpen(false);
    setShowContact(false);
    setDialog(null);
  }, [conversationId]);

  useEffect(
    () => () => {
      fileReadRef.current?.abort();
    },
    [],
  );
  useEffect(() => {
    const history = historyRef.current;
    if (history) history.scrollTop = history.scrollHeight;
  }, [conversation?.id, conversation?.messages.length]);

  useEffect(() => {
    if (!menuOpen) return;
    const close = (event: MouseEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) setMenuOpen(false);
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenuOpen(false);
    };
    document.addEventListener("click", close);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("click", close);
      document.removeEventListener("keydown", escape);
    };
  }, [menuOpen]);

  useEffect(() => {
    if (!showContact) return;
    const previousFocus =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    contactPanelRef.current
      ?.querySelector<HTMLButtonElement>("button")
      ?.focus();
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setShowContact(false);
      if (event.key !== "Tab") return;
      const elements = contactPanelRef.current?.querySelectorAll<HTMLElement>(
        'button:not(:disabled), a[href], input:not(:disabled), [tabindex="0"]',
      );
      if (!elements?.length) return;
      const first = elements[0];
      const last = elements[elements.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("keydown", escape);
      previousFocus?.focus();
    };
  }, [showContact]);

  function sendMessage() {
    if (!conversation || readingFile || (!text.trim() && !attachment)) return;
    try {
      onSendMessage(conversation.id, text.trim(), attachment);
      setText("");
      setAttachment(undefined);
      setFileError("");
    } catch (error) {
      onNotify(
        error instanceof Error
          ? error.message
          : "Não foi possível salvar a mensagem. Tente novamente.",
      );
    }
  }

  function readAttachment(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || !conversation) return;
    const accepted = [
      "image/jpeg",
      "image/png",
      "image/webp",
      "application/pdf",
    ];
    if (!accepted.includes(file.type)) {
      setFileError("Escolha uma imagem JPG, PNG, WebP ou um arquivo PDF.");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setFileError("O arquivo deve ter até 2 MB.");
      return;
    }
    fileReadRef.current?.abort();
    const reader = new FileReader();
    fileReadRef.current = reader;
    const selectedId = conversation.id;
    setReadingFile(true);
    setFileError("");
    reader.onload = () => {
      if (activeIdRef.current !== selectedId) return;
      if (typeof reader.result === "string")
        setAttachment({ name: file.name, url: reader.result, type: file.type });
      setReadingFile(false);
    };
    reader.onerror = () => {
      if (activeIdRef.current === selectedId) {
        setReadingFile(false);
        setFileError("Não foi possível abrir o arquivo. Tente novamente.");
      }
    };
    reader.onabort = () => {
      if (activeIdRef.current === selectedId) setReadingFile(false);
    };
    reader.readAsDataURL(file);
  }

  if (conversationId && !conversation)
    return (
      <section className="chat-page chat-missing">
        <Icon name="chat" size={42} />
        <h1>Conversa não encontrada</h1>
        <p>Esta conversa não está disponível neste navegador.</p>
        <button className="primary-button" onClick={onBack}>
          <Icon name="arrow-left" size={17} />
          Voltar para conversas
        </button>
      </section>
    );

  if (!conversation)
    return (
      <section className="chat-page chat-inbox" aria-label="Chat">
        <aside className="chat-conversation-list" aria-label="Suas conversas">
          <div className="chat-list-controls">
            <label className="chat-search">
              <Icon name="search" size={17} />
              <input
                type="search"
                placeholder="Buscar conversas..."
                aria-label="Buscar conversas"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </label>
            <div className="chat-list-tabs" aria-label="Filtrar conversas">
              <button
                className={filter === "all" ? "is-active" : ""}
                aria-pressed={filter === "all"}
                onClick={() => setFilter("all")}
              >
                Todas
              </button>
              <button
                className={filter === "unread" ? "is-active" : ""}
                aria-pressed={filter === "unread"}
                onClick={() => setFilter("unread")}
              >
                Não lidas{unreadCount > 0 && <span>{unreadCount}</span>}
              </button>
              <button
                className={filter === "favorites" ? "is-active" : ""}
                aria-pressed={filter === "favorites"}
                onClick={() => setFilter("favorites")}
              >
                Favoritos
              </button>
            </div>
          </div>
          <div className="chat-contacts">
            {filteredConversations.map((item) => {
              const lastMessage = item.messages[item.messages.length - 1];
              return (
                <a
                  key={item.id}
                  className="chat-conversation-row"
                  href={`/chat/${encodeURIComponent(item.id)}`}
                  onClick={(event) =>
                    followLink(event, () => onSelectConversation(item.id))
                  }
                  aria-label={`Abrir conversa com ${item.contact.name}${item.unread ? `, ${item.unread} ${item.unread === 1 ? "mensagem não lida" : "mensagens não lidas"}` : ""}`}
                >
                  <img
                    src={item.contact.avatar}
                    alt=""
                    width="40"
                    height="40"
                  />
                  <div className="chat-conversation-preview">
                    <strong>{item.contact.name}</strong>
                    <p>
                      {lastMessage?.text ||
                        (lastMessage?.attachment
                          ? `Arquivo: ${lastMessage.attachment.name}`
                          : "Inicie uma conversa")}
                    </p>
                  </div>
                  <div className="chat-conversation-meta">
                    <time dateTime={item.updatedAt}>
                      {listTime(item.updatedAt)}
                    </time>
                    {item.unread > 0 && (
                      <span className="chat-unread-badge">{item.unread}</span>
                    )}
                  </div>
                </a>
              );
            })}
            {filteredConversations.length === 0 && (
              <div className="chat-list-empty">
                <Icon
                  name={filter === "favorites" ? "heart" : "search"}
                  size={25}
                />
                <strong>
                  {filter === "favorites"
                    ? "Nenhuma conversa favorita"
                    : filter === "unread"
                      ? "Tudo em dia!"
                      : "Nenhuma conversa encontrada"}
                </strong>
                <p>
                  {filter === "favorites"
                    ? "Abra uma conversa e use o menu para salvá-la nos favoritos."
                    : filter === "unread"
                      ? "Você não tem mensagens não lidas."
                      : "Tente buscar por outro nome ou mensagem."}
                </p>
              </div>
            )}
          </div>
        </aside>
        <div className="chat-welcome">
          <ChatIllustration />
          <h1>Selecione uma conversa</h1>
          <p>
            Escolha um contato na lista ao lado para ver as
            <br className="chat-welcome-break" /> mensagens ou iniciar uma nova
            conversa.
          </p>
        </div>
      </section>
    );

  const contact = conversation.contact;
  return (
    <section
      className="chat-page chat-open"
      aria-label={`Conversa com ${contact.name}`}
    >
      <div className="chat-thread">
        <header className="chat-thread-header">
          <button
            className="chat-back icon-button"
            aria-label="Voltar para conversas"
            onClick={onBack}
          >
            <Icon name="arrow-left" size={19} />
          </button>
          <button
            className="chat-thread-person"
            onClick={() => setDialog("profile")}
          >
            <img src={contact.avatar} alt="" width="37" height="37" />
            <span>
              <strong>{contact.name}</strong>
              <span
                className={`chat-presence${contact.online ? " is-online" : ""}`}
              >
                <i />
                {contact.online ? "Online" : "Offline"}
              </span>
            </span>
          </button>
          <button
            className="chat-contact-toggle icon-button"
            aria-label="Ver informações do contato"
            aria-expanded={showContact}
            onClick={() => setShowContact(true)}
          >
            <Icon name="user" size={19} />
          </button>
          <div className="chat-menu-anchor" ref={menuRef}>
            <button
              className="icon-button"
              aria-label="Mais opções da conversa"
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen(!menuOpen)}
            >
              <Icon name="more-vertical" size={20} />
            </button>
            {menuOpen && (
              <div className="chat-thread-menu">
                <button
                  onClick={() => {
                    onToggleFavorite(conversation.id);
                    setMenuOpen(false);
                  }}
                >
                  <Icon name="heart" size={16} />
                  {conversation.favorite
                    ? "Remover dos favoritos"
                    : "Favoritar conversa"}
                </button>
                <button
                  onClick={() => {
                    setDialog("profile");
                    setMenuOpen(false);
                  }}
                >
                  <Icon name="user" size={16} />
                  Ver perfil do contato
                </button>
                <button
                  onClick={() => {
                    setDialog("report");
                    setMenuOpen(false);
                  }}
                >
                  <Icon name="alert" size={16} />
                  Denunciar usuário
                </button>
              </div>
            )}
          </div>
        </header>
        <div
          className="chat-message-history"
          ref={historyRef}
          role="log"
          aria-label="Histórico da conversa"
          aria-live="polite"
          aria-relevant="additions text"
        >
          {conversation.messages.length === 0 && (
            <div className="chat-start-message">
              <Icon name="chat" size={27} />
              <strong>Comece a conversa</strong>
              <p>Pergunte sobre o produto e combine os detalhes da retirada.</p>
            </div>
          )}
          {conversation.messages.map((message, index) => {
            const previous = conversation.messages[index - 1];
            const newDay =
              !previous ||
              dateKey(previous.createdAt) !== dateKey(message.createdAt);
            return (
              <div className="chat-message-entry" key={message.id}>
                {newDay && (
                  <div className="chat-date-separator">
                    <time dateTime={message.createdAt}>
                      {dayLabel(message.createdAt)}
                    </time>
                  </div>
                )}
                <div className={`chat-message chat-message--${message.sender}`}>
                  {message.sender === "contact" && (
                    <img
                      className="chat-message-avatar"
                      src={contact.avatar}
                      alt=""
                      width="28"
                      height="28"
                    />
                  )}
                  <div className="chat-message-body">
                    <div className="chat-message-bubble">
                      {message.text && <p>{message.text}</p>}
                      {message.attachment && (
                        <MessageAttachment attachment={message.attachment} />
                      )}{" "}
                      {message.sender === "me" && (
                        <span className="chat-message-time">
                          <time dateTime={message.createdAt}>
                            {messageTime(message.createdAt)}
                          </time>
                          <Icon name="check" size={12} />
                        </span>
                      )}
                    </div>
                    {message.sender === "contact" && (
                      <time
                        className="chat-incoming-time"
                        dateTime={message.createdAt}
                      >
                        {messageTime(message.createdAt)}
                      </time>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        <form
          className="chat-composer"
          onSubmit={(event) => {
            event.preventDefault();
            sendMessage();
          }}
        >
          <p className="chat-local-note">
            Conversa de demonstração · mensagens salvas neste navegador
          </p>
          {(attachment || readingFile) && (
            <div className="chat-pending-attachment">
              <Icon name="paperclip" size={15} />
              <span>
                {readingFile ? "Preparando arquivo..." : attachment?.name}
              </span>
              <button
                type="button"
                aria-label="Remover anexo"
                onClick={() => {
                  fileReadRef.current?.abort();
                  setAttachment(undefined);
                  setReadingFile(false);
                }}
              >
                <Icon name="x" size={15} />
              </button>
            </div>
          )}
          {fileError && (
            <p className="chat-file-error" role="alert">
              {fileError}
            </p>
          )}
          <div className="chat-composer-controls">
            <input
              type="file"
              ref={fileRef}
              className="chat-file-input"
              accept="image/jpeg,image/png,image/webp,application/pdf"
              aria-label="Selecionar anexo"
              onChange={readAttachment}
            />
            <div className="chat-message-input">
              <button
                type="button"
                aria-label="Anexar imagem ou PDF de até 2 MB"
                onClick={() => fileRef.current?.click()}
                disabled={readingFile}
              >
                <Icon name="paperclip" size={19} />
              </button>
              <textarea
                aria-label="Digite sua mensagem"
                placeholder="Digite sua mensagem..."
                rows={1}
                maxLength={4000}
                value={text}
                onChange={(event) => setText(event.target.value)}
                onKeyDown={(event) => {
                  if (
                    event.key === "Enter" &&
                    !event.shiftKey &&
                    !event.nativeEvent.isComposing
                  ) {
                    event.preventDefault();
                    sendMessage();
                  }
                }}
              />
            </div>
            <button
              className="chat-send"
              type="submit"
              disabled={readingFile || (!text.trim() && !attachment)}
              aria-label="Enviar mensagem"
            >
              <Icon name="send" size={21} />
            </button>
          </div>
        </form>
      </div>

      {showContact && (
        <button
          className="chat-contact-backdrop"
          aria-label="Fechar informações do contato"
          onClick={() => setShowContact(false)}
        />
      )}
      <aside
        ref={contactPanelRef}
        className={`chat-contact-panel${showContact ? " chat-contact-panel--open" : ""}`}
        aria-label="Informações do contato"
        role={showContact ? "dialog" : undefined}
        aria-modal={showContact ? true : undefined}
      >
        <button
          className="chat-contact-close icon-button"
          aria-label="Fechar informações do contato"
          onClick={() => setShowContact(false)}
        >
          <Icon name="x" size={20} />
        </button>
        <div className="chat-contact-identity">
          <img
            src={contact.avatar}
            alt={`Foto de ${contact.name}`}
            width="45"
            height="45"
          />
          <div>
            <h2>{contact.name}</h2>
            <span
              className={`chat-presence${contact.online ? " is-online" : ""}`}
            >
              <i />
              {contact.online ? "Online" : "Offline"}
            </span>
          </div>
        </div>
        {contact.rating !== undefined && (
          <div className="chat-contact-rating">
            <Icon name="star" size={14} />
            <strong>
              {contact.rating.toLocaleString("pt-BR", {
                minimumFractionDigits: 1,
              })}
            </strong>
            <span>({contact.reviewCount ?? 0} avaliações)</span>
          </div>
        )}
        <button
          className="chat-outline-button"
          onClick={() => setDialog("profile")}
        >
          <Icon name="user" size={15} />
          Ver perfil completo
        </button>
        <section className="chat-contact-about">
          <h3>Sobre o contato</h3>
          {contact.email && (
            <p>
              <Icon name="mail" size={15} />
              <span>{contact.email}</span>
            </p>
          )}
          <p>
            <Icon name="package" size={15} />
            <span>{contact.institution}</span>
          </p>
          <p>
            <Icon name="calendar" size={15} />
            <span>Entrou em {contact.memberSince}</span>
          </p>
        </section>
        <section className="chat-discussed-product">
          <h3>Anúncio em questão</h3>
          {product ? (
            <a
              className="chat-product-preview"
              href={productPath(product.id)}
              onClick={(event) =>
                followLink(event, () => onSelectProduct(product))
              }
            >
              <img
                src={product.image}
                alt={product.title}
                width="62"
                height="53"
              />
              <span>
                <strong>{product.title}</strong>
                <b>{formatPrice(product.price)}</b>
              </span>
              <Icon name="chevron-right" size={16} />
            </a>
          ) : (
            <p className="chat-product-unavailable">
              Este anúncio não está mais disponível.
            </p>
          )}
          <button
            className="chat-product-button primary-button"
            disabled={!product}
            onClick={() => {
              if (product) onSelectProduct(product);
            }}
          >
            <Icon name="image" size={15} />
            Ver anúncio
          </button>
          <button
            className="chat-outline-button"
            onClick={() => setDialog("report")}
          >
            <Icon name="alert" size={15} />
            Denunciar usuário
          </button>
        </section>
      </aside>

      {dialog === "profile" && (
        <ChatDialog title="Perfil do contato" onClose={() => setDialog(null)}>
          <div className="chat-contact-identity">
            <img
              src={contact.avatar}
              alt={contact.name}
              width="52"
              height="52"
            />
            <div>
              <h3>{contact.name}</h3>
              <span
                className={`chat-presence${contact.online ? " is-online" : ""}`}
              >
                <i />
                {contact.online ? "Online" : "Offline"}
              </span>
            </div>
          </div>
          {contact.rating !== undefined && (
            <div className="chat-contact-rating">
              <Icon name="star" size={15} />
              <strong>
                {contact.rating.toLocaleString("pt-BR", {
                  minimumFractionDigits: 1,
                })}
              </strong>
              <span>({contact.reviewCount ?? 0} avaliações)</span>
            </div>
          )}
          <div className="chat-contact-about">
            {contact.email && (
              <p>
                <Icon name="mail" size={16} />
                <span>{contact.email}</span>
              </p>
            )}
            <p>
              <Icon name="package" size={16} />
              <span>{contact.institution}</span>
            </p>
            <p>
              <Icon name="calendar" size={16} />
              <span>Entrou em {contact.memberSince}</span>
            </p>
          </div>
          <button
            className="primary-button chat-dialog-submit"
            onClick={() => {
              onToggleFavorite(conversation.id);
              setDialog(null);
              onNotify(
                conversation.favorite
                  ? "Conversa removida dos favoritos."
                  : "Conversa salva nos favoritos.",
              );
            }}
          >
            <Icon name="heart" size={17} />
            {conversation.favorite
              ? "Remover dos favoritos"
              : "Favoritar conversa"}
          </button>
        </ChatDialog>
      )}
      {dialog === "report" && (
        <ChatDialog title="Denunciar usuário" onClose={() => setDialog(null)}>
          <p>O envio de denúncias ainda não está disponível nesta versão.</p>
          <p>
            Se uma conversa parecer suspeita, evite pagamentos antecipados e
            combine a conferência do produto em um local público do campus.
          </p>
          <button
            className="primary-button chat-dialog-submit"
            onClick={() => setDialog(null)}
          >
            Entendi
          </button>
        </ChatDialog>
      )}
    </section>
  );
}

function MessageAttachment({
  attachment,
}: {
  attachment: NonNullable<ChatMessage["attachment"]>;
}) {
  const safe =
    ["image/jpeg", "image/png", "image/webp", "application/pdf"].includes(
      attachment.type,
    ) && attachment.url.startsWith(`data:${attachment.type};base64,`);
  if (!safe)
    return (
      <span className="chat-attachment-unavailable">
        <Icon name="paperclip" size={15} />
        {attachment.name} — arquivo indisponível
      </span>
    );
  return (
    <a
      className={`chat-message-attachment${attachment.type.startsWith("image/") ? " is-image" : ""}`}
      href={attachment.url}
      download={attachment.name}
    >
      {attachment.type.startsWith("image/") ? (
        <img src={attachment.url} alt={attachment.name} loading="lazy" />
      ) : (
        <Icon name="paperclip" size={21} />
      )}
      <span>
        {attachment.name}
        <small>Baixar arquivo</small>
      </span>
    </a>
  );
}

function ChatDialog({
  title,
  children,
  onClose,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    dialog?.showModal();
    return () => dialog?.close();
  }, []);
  return (
    <dialog
      className="chat-dialog"
      ref={ref}
      aria-labelledby="chat-dialog-title"
      onCancel={onClose}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="chat-dialog-content">
        <header>
          <h2 id="chat-dialog-title">{title}</h2>
          <button className="icon-button" aria-label="Fechar" onClick={onClose}>
            <Icon name="x" />
          </button>
        </header>
        {children}
      </div>
    </dialog>
  );
}

function ChatIllustration() {
  return (
    <svg
      className="chat-empty-illustration"
      viewBox="0 0 180 165"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M47 14c28-8 75-3 84 23 9 26 8 79-12 99-20 20-72 23-95 6S9 89 18 57 28 20 47 14Z"
        fill="#FFF8EF"
      />
      <path
        d="m105 58 49 4-5 40a15 15 0 0 1-15 13l-8 9-2-11h-13a14 14 0 0 1-14-15l8-40Z"
        fill="#E6EBF2"
      />
      <path
        d="M43 57h56a17 17 0 0 1 17 17v24a17 17 0 0 1-17 17H51l-12 10-1-11a14 14 0 0 1-12-14V74a17 17 0 0 1 17-17Z"
        fill="#FF6535"
      />
      <path d="m43 115-5 10v-12" fill="#F4510B" />
      <circle cx="57" cy="86" r="3.4" fill="white" />
      <circle cx="72" cy="86" r="3.4" fill="white" />
      <circle cx="87" cy="86" r="3.4" fill="white" />
      <path
        d="m135 23 2 3m3-4 1 4m-5-8 2 1"
        stroke="#FF9A64"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}
