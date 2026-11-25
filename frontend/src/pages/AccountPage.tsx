import { useEffect, useRef, useState } from "react";
import type { ChangeEvent, FormEvent, ReactNode } from "react";
import { api, errorMessage, getSession, setSession } from "../lib/api";
import type { Session, SessionUser } from "../lib/api";
import { logout } from "../data/session";
import { DEFAULT_AVATAR } from "../data/productDetails";
import { RequestForm } from "../components/RequestForm";
import { Icon } from "../components/Icon";
import type { Ticket } from "../data/community";
import "./account.css";

type Props = { support?: boolean; onNotify: (message: string) => void; onProfileChange?: () => void };
type Busy = "profile" | "avatar" | "password" | "export" | "sessions" | "delete" | null;

export function AccountPage({ support = false, ...props }: Props) {
  return support ? <SupportPage onNotify={props.onNotify} /> : <SettingsPage {...props} />;
}

function SettingsPage({ onNotify, onProfileChange }: Omit<Props, "support">) {
  const owner = getSession()?.user.id;
  const [profile, setProfile] = useState<SessionUser | null>(null);
  const [name, setName] = useState("");
  const [current, setCurrent] = useState("");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [showPasswords, setShowPasswords] = useState(false);
  const [busy, setBusy] = useState<Busy>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [retry, setRetry] = useState(0);
  const [activeSection, setActiveSection] = useState("perfil");
  const [modal, setModal] = useState<"delete" | "sessions" | null>(null);
  const [modalPassword, setModalPassword] = useState("");
  const [deleteConfirmation, setDeleteConfirmation] = useState("");
  const photoInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let cancelled = false;
    setErrors({});
    void api<SessionUser>("/me/").then(user => {
      const session = getSession();
      if (cancelled || !session || session.user.id !== owner) return;
      setProfile(user);
      setName(user.name);
      setSession({ ...session, user: { ...session.user, ...user } });
    }).catch(error => {
      if (!cancelled) setErrors({ load: errorMessage(error, "Não foi possível carregar suas configurações.") });
    });
    return () => { cancelled = true; };
  }, [owner, retry]);

  function clearError(section: string) {
    setErrors(previous => ({ ...previous, [section]: "" }));
  }

  function updateProfile(user: SessionUser) {
    const session = getSession();
    if (!session || session.user.id !== owner || user.id !== owner) return;
    setProfile(previous => ({ ...previous, ...user }));
    setSession({ ...session, user: { ...session.user, ...user } });
    onProfileChange?.();
  }

  function updateSession(session: Session) {
    if (getSession()?.user.id !== owner || session.user.id !== owner) return;
    setSession({ ...session, user: { ...profile, ...session.user } });
  }

  async function saveProfile(event: FormEvent) {
    event.preventDefault();
    if (busy) return;
    setBusy("profile");
    clearError("profile");
    try {
      const user = await api<SessionUser>("/me/", { method: "PATCH", body: { name: name.trim() } });
      updateProfile(user);
      setName(user.name);
      onNotify("Seu perfil foi atualizado.");
    } catch (error) {
      setErrors(previous => ({ ...previous, profile: errorMessage(error, "Não foi possível salvar o perfil.") }));
    } finally { setBusy(null); }
  }

  async function changePhoto(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || busy) return;
    clearError("avatar");
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type) || file.size > 5 * 1024 * 1024) {
      setErrors(previous => ({ ...previous, avatar: "Escolha uma foto JPG, PNG ou WebP de até 5 MB." }));
      return;
    }
    setBusy("avatar");
    try {
      const form = new FormData();
      form.append("avatar", file);
      const user = await api<SessionUser>("/me/avatar/", { method: "PUT", form });
      updateProfile(user);
      onNotify("Sua foto de perfil foi atualizada.");
    } catch (error) {
      setErrors(previous => ({ ...previous, avatar: errorMessage(error, "Não foi possível enviar a foto.") }));
    } finally { setBusy(null); }
  }

  async function removePhoto() {
    if (busy) return;
    setBusy("avatar");
    clearError("avatar");
    try {
      updateProfile(await api<SessionUser>("/me/avatar/", { method: "DELETE" }));
      onNotify("Foto de perfil removida.");
    } catch (error) {
      setErrors(previous => ({ ...previous, avatar: errorMessage(error, "Não foi possível remover a foto.") }));
    } finally { setBusy(null); }
  }

  async function changePassword(event: FormEvent) {
    event.preventDefault();
    if (busy) return;
    clearError("password");
    if (password !== confirmation) {
      setErrors(previous => ({ ...previous, password: "A confirmação deve ser igual à nova senha." }));
      return;
    }
    setBusy("password");
    try {
      const session = await api<Session>("/auth/password/", { method: "POST", body: { current_password: current, new_password: password, new_password_confirmation: confirmation } });
      updateSession(session);
      setCurrent(""); setPassword(""); setConfirmation("");
      onNotify("Senha alterada. As outras sessões foram encerradas.");
    } catch (error) {
      setErrors(previous => ({ ...previous, password: errorMessage(error, "Não foi possível alterar a senha.") }));
    } finally { setBusy(null); }
  }

  async function downloadData() {
    if (busy) return;
    setBusy("export");
    clearError("export");
    try {
      const data = await api<Record<string, unknown>>("/me/export/");
      if (getSession()?.user.id !== owner) return;
      const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }));
      const link = document.createElement("a");
      link.href = url;
      link.download = "uniplace-meus-dados.json";
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      onNotify("O download dos seus dados foi iniciado.");
    } catch (error) {
      setErrors(previous => ({ ...previous, export: errorMessage(error, "Não foi possível baixar seus dados.") }));
    } finally { setBusy(null); }
  }

  function openModal(kind: "delete" | "sessions") {
    setModalPassword(""); setDeleteConfirmation(""); clearError("modal"); setModal(kind);
  }

  async function confirmAction(event: FormEvent) {
    event.preventDefault();
    if (!modal || busy) return;
    if (modal === "delete" && deleteConfirmation !== "EXCLUIR") return;
    setBusy(modal);
    clearError("modal");
    try {
      if (modal === "sessions") {
        updateSession(await api<Session>("/me/sessions/revoke/", { method: "POST", body: { current_password: modalPassword } }));
        setModal(null);
        setModalPassword("");
        onNotify("As outras sessões foram encerradas. Este navegador continua conectado.");
      } else {
        await api("/me/", { method: "DELETE", body: { current_password: modalPassword, confirmation: deleteConfirmation } });
        if (getSession()?.user.id !== owner) return;
        try { sessionStorage.setItem("uniplace:auth-notice", "Sua conta foi excluída e o acesso foi encerrado."); } catch { /* A exclusão também funciona sem armazenamento do navegador. */ }
        logout();
      }
    } catch (error) {
      setErrors(previous => ({ ...previous, modal: errorMessage(error, "Não foi possível concluir a operação.") }));
    } finally { setBusy(null); }
  }

  const joined = profile?.date_joined && Number.isFinite(Date.parse(profile.date_joined))
    ? new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric", timeZone: "America/Fortaleza" }).format(new Date(profile.date_joined)) : null;

  if (!profile) return (
    <section className="settings-page">
      <SettingsHeading />
      <div className="account-panel settings-load" role={errors.load ? "alert" : "status"}>
        <p>{errors.load || "Carregando suas configurações..."}</p>
        {errors.load && <button className="primary-button" onClick={() => setRetry(value => value + 1)}>Tentar novamente</button>}
      </div>
    </section>
  );

  return (
    <section className="settings-page">
      <SettingsHeading />
      <div className="settings-layout">
        <aside className="settings-sidebar">
          <div className="settings-identity">
            <img className="settings-identity-avatar" src={profile.avatar || DEFAULT_AVATAR} alt="Sua foto de perfil" width="72" height="72" />
            <strong>{profile.name}</strong>
            <span>{profile.email}</span>
            <span className="settings-institution"><Icon name="graduation" size={16} /> Conta institucional</span>
            {joined && <small>Membro desde {joined}</small>}
          </div>
          <nav className="settings-navigation" aria-label="Seções das configurações">
            {[["perfil", "user", "Meu perfil"], ["seguranca", "shield", "Segurança"], ["privacidade", "file", "Privacidade"], ["excluir", "trash", "Excluir conta"]].map(([id, icon, label]) => (
              <a key={id} href={`#${id}`} className={`${activeSection === id ? "is-active" : ""}${id === "excluir" ? " settings-navigation-danger" : ""}`} onClick={() => setActiveSection(id)} aria-current={activeSection === id ? "location" : undefined}>
                <Icon name={icon} size={19} /> {label}
              </a>
            ))}
          </nav>
          <a className="settings-help" href="/suporte"><Icon name="help" size={18} /><span>Precisa de ajuda?<strong>Fale com o suporte</strong></span><Icon name="arrow-right" size={16} /></a>
        </aside>

        <div className="settings-sections">
          <section id="perfil" className="account-panel settings-section" aria-labelledby="settings-profile-title">
            <SectionHeading icon="user" id="settings-profile-title" title="Meu perfil" description="Como você aparece para a comunidade UniPlace." />
            <div className="settings-photo-row">
              <img className="settings-photo" src={profile.avatar || DEFAULT_AVATAR} alt="Sua foto de perfil" width="88" height="88" />
              <div className="settings-photo-actions">
                <div className="settings-button-group">
                  <button className="settings-secondary-button" type="button" onClick={() => photoInput.current?.click()} disabled={Boolean(busy)}><Icon name="upload" size={18} />{busy === "avatar" ? "Enviando foto..." : "Alterar foto"}</button>
                  {profile.avatar && <button className="settings-text-button" type="button" onClick={() => void removePhoto()} disabled={Boolean(busy)}>Remover foto</button>}
                </div>
                <p>JPG, PNG ou WebP. Até 5 MB.</p>
                <p>Sua foto aparece nos anúncios e nas conversas.</p>
                <input ref={photoInput} className="settings-file-input" tabIndex={-1} type="file" aria-label="Escolher foto de perfil" accept="image/jpeg,image/png,image/webp" onChange={event => void changePhoto(event)} disabled={Boolean(busy)} />
              </div>
            </div>
            <InlineError message={errors.avatar} />
            <form className="account-form settings-profile-form" onSubmit={saveProfile} aria-busy={busy === "profile"}>
              <div className="settings-form-grid">
                <label htmlFor="settings-name">Nome completo<input id="settings-name" name="name" required maxLength={150} autoComplete="name" value={name} onChange={event => setName(event.target.value)} disabled={Boolean(busy)} /></label>
                <label htmlFor="settings-email"><span className="settings-label-with-icon">E-mail institucional <Icon name="lock" size={15} /></span><input id="settings-email" name="email" type="email" value={profile.email} readOnly aria-describedby="settings-email-hint" /><span className="settings-field-hint" id="settings-email-hint">O e-mail identifica sua conta e não pode ser alterado.</span></label>
              </div>
              <InlineError message={errors.profile} />
              <div className="settings-form-footer"><span>Seu nome e sua foto são públicos na comunidade.</span><button className="primary-button" disabled={Boolean(busy) || name.trim() === profile.name}>{busy === "profile" ? "Salvando..." : "Salvar alterações"}</button></div>
            </form>
          </section>

          <section id="seguranca" className="account-panel settings-section" aria-labelledby="settings-security-title">
            <SectionHeading icon="shield" id="settings-security-title" title="Segurança" description="Proteja sua senha e mantenha o controle dos seus acessos." />
            <form className="account-form" onSubmit={changePassword} aria-busy={busy === "password"}>
              <label htmlFor="settings-current-password">Senha atual<input id="settings-current-password" type={showPasswords ? "text" : "password"} required autoComplete="current-password" value={current} onChange={event => setCurrent(event.target.value)} disabled={Boolean(busy)} /></label>
              <div className="settings-form-grid">
                <label htmlFor="settings-new-password">Nova senha<input id="settings-new-password" type={showPasswords ? "text" : "password"} required minLength={8} autoComplete="new-password" value={password} onChange={event => setPassword(event.target.value)} disabled={Boolean(busy)} /></label>
                <label htmlFor="settings-confirm-password">Confirme a nova senha<input id="settings-confirm-password" type={showPasswords ? "text" : "password"} required minLength={8} autoComplete="new-password" value={confirmation} onChange={event => setConfirmation(event.target.value)} disabled={Boolean(busy)} /></label>
              </div>
              <div className="settings-password-help"><p>Use pelo menos 8 caracteres e evite senhas comuns ou parecidas com seus dados.</p><button type="button" className="settings-text-button" aria-pressed={showPasswords} onClick={() => setShowPasswords(value => !value)}><Icon name="eye" size={18} />{showPasswords ? "Ocultar senhas" : "Mostrar senhas"}</button></div>
              <InlineError message={errors.password} />
              <div className="settings-form-footer"><span>Ao trocar a senha, as outras sessões serão encerradas.</span><button className="primary-button" disabled={Boolean(busy)}>{busy === "password" ? "Alterando..." : "Atualizar senha"}</button></div>
            </form>
            <div className="settings-session-row"><span className="settings-device-icon"><Icon name="monitor" size={22} /></span><div><strong>Este navegador</strong><p><span className="settings-session-dot" /> Sessão atual ativa</p></div><button className="settings-secondary-button" disabled={Boolean(busy)} onClick={() => openModal("sessions")}>Encerrar outras sessões</button></div>
            <button type="button" className="settings-text-button" onClick={logout} disabled={Boolean(busy)}><Icon name="logout" size={18} /> Sair da conta neste navegador</button>
          </section>

          <section id="privacidade" className="account-panel settings-section" aria-labelledby="settings-privacy-title">
            <SectionHeading icon="file" id="settings-privacy-title" title="Privacidade e seus dados" description="Consulte as regras da comunidade e acesse suas informações." />
            <a className="settings-document-row" href="/termos-de-uso" target="_blank" rel="noreferrer" aria-label="Ler termos de uso em nova aba"><span className="settings-document-icon"><Icon name="file" size={21} /></span><span><strong>Termos de uso</strong><small>Regras de uso, anúncios e convivência.</small></span><Icon name="arrow-right" size={19} /></a>
            <a className="settings-document-row" href="/politica-de-privacidade" target="_blank" rel="noreferrer" aria-label="Ler política de privacidade em nova aba"><span className="settings-document-icon"><Icon name="shield" size={21} /></span><span><strong>Política de privacidade</strong><small>Como seus dados são utilizados e protegidos.</small></span><Icon name="arrow-right" size={19} /></a>
            <div className="settings-export-row"><div><strong>Uma cópia dos seus dados</strong><p>Baixe perfil, anúncios, mensagens enviadas e chamados em JSON. As imagens são referenciadas por link.</p></div><button className="settings-secondary-button" onClick={() => void downloadData()} disabled={Boolean(busy)}><Icon name="download" size={18} />{busy === "export" ? "Preparando..." : "Baixar meus dados"}</button></div>
            <InlineError message={errors.export} />
            <p className="settings-example-note"><Icon name="info" size={17} /> Os documentos são exemplos para a apresentação acadêmica do projeto.</p>
          </section>

          <section id="excluir" className="account-panel settings-section settings-danger-zone" aria-labelledby="settings-delete-title">
            <SectionHeading icon="trash" id="settings-delete-title" title="Excluir minha conta" description="Encerre sua participação no UniPlace de forma permanente." />
            <p>Seu perfil, seus anúncios e suas mensagens enviadas serão removidos. O acesso à conta será encerrado em todos os dispositivos.</p>
            <div className="settings-danger-footer"><span>Essa ação não pode ser desfeita.</span><button className="settings-danger-button" disabled={Boolean(busy)} onClick={() => openModal("delete")}><Icon name="trash" size={18} /> Excluir minha conta</button></div>
          </section>
          <p className="settings-bottom-note">UniPlace · Suas configurações são salvas na sua conta.</p>
        </div>
      </div>

      {modal && <SettingsDialog title={modal === "delete" ? "Excluir sua conta?" : "Encerrar outras sessões?"} onClose={() => { if (!busy) setModal(null); }} busy={Boolean(busy)}>
        <form className="account-form settings-confirm-form" onSubmit={confirmAction}>
          <p>{modal === "delete" ? "Seu nome, e-mail, foto, anúncios e mensagens enviadas serão removidos. Mensagens enviadas por outras pessoas continuam disponíveis para elas, associadas a Conta excluída. Você não poderá reativar esta conta." : "Você sairá do UniPlace nos outros dispositivos. Este navegador continuará conectado com uma sessão renovada."}</p>
          <label htmlFor="settings-action-password">Confirme sua senha atual<input id="settings-action-password" type="password" required autoComplete="current-password" value={modalPassword} onChange={event => setModalPassword(event.target.value)} disabled={Boolean(busy)} /></label>
          {modal === "delete" && <label htmlFor="settings-delete-confirmation">Digite EXCLUIR para confirmar<input id="settings-delete-confirmation" required autoComplete="off" spellCheck={false} placeholder="EXCLUIR" value={deleteConfirmation} onChange={event => setDeleteConfirmation(event.target.value)} disabled={Boolean(busy)} /></label>}
          <InlineError message={errors.modal} />
          <div className="settings-dialog-actions"><button type="button" className="settings-secondary-button" onClick={() => setModal(null)} disabled={Boolean(busy)}>Cancelar</button><button className={modal === "delete" ? "settings-danger-button" : "primary-button"} disabled={Boolean(busy) || !modalPassword || (modal === "delete" && deleteConfirmation !== "EXCLUIR")}>{busy ? "Aguarde..." : modal === "delete" ? "Excluir conta permanentemente" : "Encerrar outras sessões"}</button></div>
        </form>
      </SettingsDialog>}
    </section>
  );
}

function SettingsHeading() {
  return <header className="settings-page-heading"><span className="settings-eyebrow">SUA CONTA, DO SEU JEITO</span><h1>Configurações</h1><p>Seu perfil, sua segurança e seus dados em um só lugar.</p></header>;
}

function SectionHeading({ icon, id, title, description }: { icon: string; id: string; title: string; description: string }) {
  return <header className="settings-section-heading"><span><Icon name={icon} size={22} /></span><div><h2 id={id}>{title}</h2><p>{description}</p></div></header>;
}

function InlineError({ message }: { message?: string }) {
  return message ? <p role="alert" className="settings-inline-error">{message}</p> : null;
}

function SettingsDialog({ title, children, onClose, busy }: { title: string; children: ReactNode; onClose: () => void; busy: boolean }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => { const dialog = ref.current; dialog?.showModal(); dialog?.querySelector<HTMLInputElement>("input")?.focus(); return () => dialog?.close(); }, []);
  return <dialog ref={ref} className="settings-dialog" aria-labelledby="settings-dialog-title" onCancel={event => { event.preventDefault(); if (!busy) onClose(); }}><div className="settings-dialog-header"><h2 id="settings-dialog-title">{title}</h2><button type="button" className="icon-button" aria-label="Fechar confirmação" onClick={onClose} disabled={busy}><Icon name="x" size={22} /></button></div>{children}</dialog>;
}

function SupportPage({ onNotify }: Pick<Props, "onNotify">) {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [error, setError] = useState("");
  function loadTickets() { return api<Ticket[]>("/me/tickets/").then(setTickets).catch(failure => setError(errorMessage(failure, "Não foi possível carregar os chamados."))); }
  useEffect(() => { void loadTickets(); }, []);
  return <section className="account-page"><h1>Ajuda e Suporte</h1>{error && <p role="alert" className="account-error">{error}</p>}<div className="account-panel"><h2>Abrir chamado</h2><RequestForm kind="support" onSuccess={() => { onNotify("Chamado registrado. Acompanhe a resposta abaixo."); void loadTickets(); }} /></div><div className="account-panel"><h2>Seus chamados e denúncias</h2>{tickets.length === 0 ? <p>Nenhum chamado registrado.</p> : tickets.map(ticket => <article className="account-ticket" key={ticket.id}><h3>{ticket.subject}</h3><p>{ticket.message}</p><p>Status: {ticket.status === "open" ? "Aberto" : "Resolvido"}</p>{ticket.reply && <blockquote>{ticket.reply}</blockquote>}</article>)}</div></section>;
}
