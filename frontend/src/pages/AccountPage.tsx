import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { api, errorMessage, getSession, setSession } from '../lib/api';
import { RequestForm } from '../components/RequestForm';
import type { Ticket } from '../data/community';
import './account.css';

export function AccountPage({ support = false, onNotify }: { support?: boolean; onNotify: (message: string) => void }) {
  const [name, setName] = useState(getSession()?.user.name ?? '');
  const [current, setCurrent] = useState('');
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [profileLoaded, setProfileLoaded] = useState(false);
  const loadTickets = () => api<Ticket[]>('/me/tickets/').then(setTickets).catch(failure => setError(errorMessage(failure, 'Não foi possível carregar os chamados.')));
  useEffect(() => {
    if (support) { void loadTickets(); return; }
    const owner = getSession()?.user.id;
    let cancelled = false;
    void api<{ id: number; name: string; email: string }>('/me/').then(user => {
      const session = getSession();
      if (cancelled || !session || session.user.id !== owner) return;
      setName(user.name); setSession({ ...session, user });
    }).catch(failure => { if (!cancelled) setError(errorMessage(failure, 'Não foi possível carregar o perfil.')); })
      .finally(() => { if (!cancelled) setProfileLoaded(true); });
    return () => { cancelled = true; };
  }, [support]);
  async function saveProfile(event: FormEvent) {
    event.preventDefault(); if (busy) return; setBusy(true); setError('');
    try {
      const user = await api<{ id: number; name: string; email: string }>('/me/', { method: 'PATCH', body: { name } });
      const session = getSession(); if (session) setSession({ ...session, user });
      onNotify('Perfil atualizado.');
    } catch (failure) { setError(errorMessage(failure, 'Não foi possível salvar o perfil.')); }
    finally { setBusy(false); }
  }
  async function changePassword(event: FormEvent) {
    event.preventDefault(); if (busy) return; setBusy(true); setError('');
    try {
      await api('/auth/password/', { method: 'POST', body: { current_password: current, new_password: password, new_password_confirmation: confirmation } });
      setCurrent(''); setPassword(''); setConfirmation(''); onNotify('Senha alterada com sucesso.');
    } catch (failure) { setError(errorMessage(failure, 'Não foi possível alterar a senha.')); }
    finally { setBusy(false); }
  }
  return <section className="account-page">
    <h1>{support ? 'Ajuda e Suporte' : 'Meu perfil e configurações'}</h1>
    {error && <p role="alert" className="account-error">{error}</p>}
    {!support && !profileLoaded ? <p role="status">Carregando perfil...</p> :
    support ? <>
      <div className="account-panel"><h2>Abrir chamado</h2><RequestForm kind="support" onSuccess={() => { onNotify('Chamado registrado. Acompanhe a resposta abaixo.'); void loadTickets(); }} /></div>
      <div className="account-panel"><h2>Seus chamados e denúncias</h2>{tickets.length === 0 ? <p>Nenhum chamado registrado.</p> : tickets.map(ticket => <article className="account-ticket" key={ticket.id}><h3>{ticket.subject}</h3><p>{ticket.message}</p><p>Status: {ticket.status === 'open' ? 'Aberto' : 'Resolvido'}</p>{ticket.reply && <blockquote>{ticket.reply}</blockquote>}</article>)}</div>
    </> : <>
      <form className="account-form account-panel" onSubmit={saveProfile}><h2>Dados da conta</h2><label>Nome<input required maxLength={150} value={name} onChange={event => setName(event.target.value)} /></label><label>E-mail institucional<input type="email" value={getSession()?.user.email ?? ''} readOnly /></label><button className="primary-button" disabled={busy}>Salvar perfil</button></form>
      <form className="account-form account-panel" onSubmit={changePassword}><h2>Alterar senha</h2><label>Senha atual<input type="password" required autoComplete="current-password" value={current} onChange={event => setCurrent(event.target.value)} /></label><label>Nova senha<input type="password" required autoComplete="new-password" value={password} onChange={event => setPassword(event.target.value)} /></label><label>Confirme a nova senha<input type="password" required autoComplete="new-password" value={confirmation} onChange={event => setConfirmation(event.target.value)} /></label><button className="primary-button" disabled={busy}>Alterar senha</button></form>
    </>}
  </section>;
}
