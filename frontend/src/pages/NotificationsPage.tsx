import { Icon } from "../components/Icon";
import {
  noticeDestination,
  noticeKinds,
  noticeTime,
  useNotificationFeed,
} from "../data/notifications";
import type {
  Notice,
  NoticeKind,
  NotificationsState,
} from "../data/notifications";
import { errorMessage } from "../lib/api";
import { followLink } from "../lib/navigation";
import "./notifications.css";

type Props = {
  userId: number;
  notifications: NotificationsState;
  onOpen: (notice: Notice) => Promise<void>;
  onNotify: (message: string) => void;
};

function dayGroup(date: string) {
  const value = new Date(date).toDateString();
  const now = new Date();
  if (value === now.toDateString()) return "Hoje";
  now.setDate(now.getDate() - 1);
  return value === now.toDateString() ? "Ontem" : "Mais antigas";
}

export function NotificationsPage({
  userId,
  notifications,
  onOpen,
  onNotify,
}: Props) {
  const feed = useNotificationFeed(userId, notifications.revision);
  const summary = notifications.loaded ? notifications.data : feed.data;
  const groups = new Map<string, Notice[]>();
  feed.data?.results.forEach((notice) => {
    const group = dayGroup(notice.created_at);
    groups.set(group, [...(groups.get(group) ?? []), notice]);
  });
  const filtered = feed.filter.status !== "all" || feed.filter.kind !== "all";
  const act = (action: Promise<boolean>, success?: string) => {
    void action
      .then((changed) => {
        if (changed && success) onNotify(success);
      })
      .catch((error) =>
        onNotify(
          errorMessage(error, "Não foi possível atualizar a notificação."),
        ),
      );
  };
  return (
    <section className="notices-page" aria-labelledby="notices-title">
      <header className="notices-header" data-reveal>
        <div>
          <span className="notices-eyebrow">FIQUE POR DENTRO</span>
          <h1 id="notices-title">Notificações</h1>
          <p>
            Mensagens, novidades dos seus anúncios e respostas do suporte em um
            só lugar.
          </p>
        </div>
        <button
          className="notice-button notice-button--primary"
          disabled={!summary?.unread || !!notifications.busy}
          onClick={() =>
            act(
              notifications.markAllRead(),
              "Todas as notificações foram marcadas como lidas.",
            )
          }
        >
          <Icon name="check-check" size={20} />
          {notifications.busy === "all"
            ? "Marcando..."
            : "Marcar todas como lidas"}
        </button>
      </header>
      <div className="notices-overview">
        <span className="notices-overview-icon">
          <Icon name="bell" size={28} />
        </span>
        <div>
          <h2>
            {!summary
              ? "Acompanhe suas atualizações"
              : summary.unread === 0
                ? "Tudo em dia por aqui!"
                : `${summary.unread} ${summary.unread === 1 ? "notificação não lida" : "notificações não lidas"}`}
          </h2>
          <p>
            {summary?.unread
              ? "Confira o que aconteceu e continue de onde parou."
              : "Seus próximos avisos vão aparecer aqui."}
          </p>
        </div>
        <span className="notices-total">
          <strong>{summary?.total ?? "—"}</strong> no histórico
        </span>
      </div>
      <div className="notices-toolbar">
        <div
          className="notices-tabs"
          role="group"
          aria-label="Filtrar por leitura"
        >
          {(["all", "unread", "read"] as const).map((status, index) => (
            <button
              key={status}
              aria-pressed={feed.filter.status === status}
              onClick={() => feed.setStatus(status)}
            >
              {["Todas", "Não lidas", "Lidas"][index]}
              {status === "unread" && !!summary?.unread && (
                <span>{summary.unread}</span>
              )}
            </button>
          ))}
        </div>
        <div className="notices-tools">
          <label className="notices-category">
            <span>Categoria</span>
            <select
              aria-label="Filtrar por categoria"
              value={feed.filter.kind}
              onChange={(event) =>
                feed.setKind(event.target.value as NoticeKind | "all")
              }
            >
              <option value="all">Todas as categorias</option>
              {Object.entries(noticeKinds).map(([kind, meta]) => (
                <option key={kind} value={kind}>
                  {meta.label}
                </option>
              ))}
            </select>
          </label>
          <button
            className="notice-button notice-button--refresh"
            disabled={feed.pending}
            onClick={() => {
              void feed.reload();
              void notifications.reload();
            }}
            aria-label="Atualizar notificações"
            title="Atualizar notificações"
          >
            <Icon name="refresh" size={20} />
          </button>
        </div>
      </div>
      {feed.error && (
        <div className="notices-error" role="alert">
          <Icon name="info" size={20} />
          <p>{feed.error}</p>
          <button
            className="notice-button"
            onClick={() => void feed.reload()}
            disabled={feed.pending}
          >
            Tentar novamente
          </button>
        </div>
      )}
      <div className="notices-feed" aria-busy={feed.pending}>
        {!feed.data && !feed.error ? (
          <div className="notices-loading" role="status">
            <Icon name="clock" size={26} />
            <p>Carregando notificações...</p>
          </div>
        ) : feed.data?.results.length === 0 ? (
          <div className="notices-empty">
            <span>
              <Icon name={filtered ? "check-check" : "bell"} size={32} />
            </span>
            <h2>
              {filtered
                ? "Nenhuma notificação neste filtro"
                : "Suas novidades chegam por aqui"}
            </h2>
            <p>
              {filtered
                ? "Altere os filtros para ver outras atualizações do seu histórico."
                : "Quando você receber mensagens, publicar anúncios ou tiver uma resposta do suporte, avisaremos aqui."}
            </p>
            {filtered && (
              <button
                className="notice-button"
                onClick={() => {
                  feed.setStatus("all");
                  feed.setKind("all");
                }}
              >
                Ver todas as notificações
              </button>
            )}
          </div>
        ) : (
          [...groups].map(([group, notices]) => (
            <section className="notices-group" key={group} aria-label={group}>
              <h2>{group}</h2>
              <ul>
                {notices.map((notice) => {
                  const meta = noticeKinds[notice.kind] ?? noticeKinds.system;
                  const destination = noticeDestination(notice.url);
                  return (
                    <li key={notice.id}>
                      <article
                        className={`notice-card${notice.read_at ? "" : " notice-card--unread"}`}
                        data-reveal
                      >
                        <span
                          className={`notice-kind-icon notice-kind-icon--${notice.kind}`}
                        >
                          <Icon name={meta.icon} size={23} />
                        </span>
                        <div className="notice-card-body">
                          <div className="notice-card-top">
                            <h3>
                              {meta.title}
                              {!notice.read_at && (
                                <span className="notice-unread-label">
                                  Não lida
                                </span>
                              )}
                            </h3>
                            <time
                              dateTime={notice.created_at}
                              title={new Date(notice.created_at).toLocaleString(
                                "pt-BR",
                              )}
                            >
                              {noticeTime(notice.created_at)}
                            </time>
                          </div>
                          <p>{notice.text}</p>
                          <div className="notice-card-footer">
                            <span className="notice-category-label">
                              {meta.label}
                            </span>
                            {destination && (
                              <a
                                href={destination}
                                onClick={(event) =>
                                  followLink(event, () => {
                                    void onOpen(notice);
                                  })
                                }
                              >
                                {meta.action}
                                <Icon name="arrow-right" size={16} />
                              </a>
                            )}
                          </div>
                        </div>
                        <div className="notice-card-actions">
                          <button
                            className="notice-icon-button"
                            disabled={!!notifications.busy}
                            aria-label={
                              notice.read_at
                                ? "Marcar como não lida"
                                : "Marcar como lida"
                            }
                            title={
                              notice.read_at
                                ? "Marcar como não lida"
                                : "Marcar como lida"
                            }
                            onClick={() =>
                              act(
                                notifications.markRead(notice, !notice.read_at),
                              )
                            }
                          >
                            <Icon
                              name={notice.read_at ? "mail" : "check"}
                              size={19}
                            />
                          </button>
                          <button
                            className="notice-icon-button notice-icon-button--delete"
                            disabled={!!notifications.busy}
                            aria-label="Excluir notificação"
                            title="Excluir notificação"
                            onClick={() =>
                              act(
                                notifications.remove(notice),
                                "Notificação excluída.",
                              )
                            }
                          >
                            <Icon name="trash" size={19} />
                          </button>
                        </div>
                      </article>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))
        )}
      </div>
      {feed.data && feed.data.count > 0 && (
        <footer className="notices-pagination">
          <p>
            {(feed.data.page - 1) * feed.data.page_size + 1}–
            {Math.min(feed.data.page * feed.data.page_size, feed.data.count)} de{" "}
            {feed.data.count}{" "}
            {feed.data.count === 1 ? "notificação" : "notificações"}
          </p>
          <nav aria-label="Paginação de notificações">
            <button
              className="notice-button"
              disabled={feed.pending || feed.data.page <= 1}
              onClick={() => feed.setPage(feed.data!.page - 1)}
            >
              <Icon name="chevron-left" size={18} />
              Anterior
            </button>
            <span>Página {feed.data.page}</span>
            <button
              className="notice-button"
              disabled={feed.pending || !feed.data.has_next}
              onClick={() => feed.setPage(feed.data!.page + 1)}
            >
              Próxima
              <Icon name="chevron-right" size={18} />
            </button>
          </nav>
        </footer>
      )}
      <p className="notices-footnote">
        <Icon name="info" size={16} />
        Excluir um aviso remove apenas a notificação. Sua conversa, anúncio ou
        chamado continua disponível.
      </p>
    </section>
  );
}
