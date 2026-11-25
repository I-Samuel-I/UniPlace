import { useState } from 'react';
import type { FormEvent } from 'react';
import { api, errorMessage } from '../lib/api';

export function RequestForm({ kind, postId, conversationId, onSuccess }: { kind: 'report' | 'support'; postId?: string; conversationId?: string; onSuccess: () => void }) {
  const [subject, setSubject] = useState(kind === 'report' ? 'Denúncia' : '');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function submit(event: FormEvent) {
    event.preventDefault(); if (busy) return;
    setBusy(true); setError('');
    try {
      await api('/me/tickets/', { method: 'POST', body: { kind, subject, message, ...(postId ? { post_id: postId } : {}), ...(conversationId ? { conversation_id: conversationId } : {}) } });
      onSuccess();
    } catch (failure) { setError(errorMessage(failure, 'Não foi possível enviar o chamado.')); }
    finally { setBusy(false); }
  }
  return <form className="account-form" onSubmit={submit}>
    <label>Assunto<input required maxLength={150} value={subject} onChange={event => setSubject(event.target.value)} /></label>
    <label>{kind === 'report' ? 'Motivo da denúncia' : 'Como podemos ajudar?'}<textarea required maxLength={5000} rows={4} value={message} onChange={event => setMessage(event.target.value)} /></label>
    {error && <p role="alert">{error}</p>}
    <button className="primary-button" disabled={busy}>{busy ? 'Enviando...' : kind === 'report' ? 'Enviar denúncia' : 'Enviar chamado'}</button>
  </form>;
}
