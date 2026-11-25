import { useCallback, useEffect, useRef, useState } from 'react';
import { api, errorMessage } from '../lib/api';

export type Notice = { id: string; text: string; url: string; created_at: string; read_at: string | null };
export type Ticket = { id: string; kind: 'report' | 'support'; subject: string; message: string; status: 'open' | 'resolved'; reply: string; created_at: string };

export function useCommunity(userId: number | null) {
  const [favorites, setFavorites] = useState<string[]>([]);
  const [notices, setNotices] = useState<{ results: Notice[]; unread: number }>({ results: [], unread: 0 });
  const [error, setError] = useState('');
  const activeUser = useRef(userId);
  activeUser.current = userId;
  const busy = useRef(new Set<string>());
  const requestRef = useRef(0);
  const loadedOwner = useRef<number | null>(null);

  const reload = useCallback(async () => {
    if (userId === null) return;
    const request = ++requestRef.current;
    try {
      const [saved, notifications] = await Promise.all([
        api<string[]>('/me/favorites/'),
        api<{ results: Notice[]; unread: number }>('/me/notifications/'),
      ]);
      if (activeUser.current !== userId || request !== requestRef.current) return;
      loadedOwner.current = userId;
      setFavorites(saved); setNotices(notifications); setError('');
    } catch (failure) {
      if (activeUser.current === userId && request === requestRef.current) setError(errorMessage(failure, 'Não foi possível atualizar seus favoritos e notificações.'));
    }
  }, [userId]);
  useEffect(() => {
    setFavorites([]); setNotices({ results: [], unread: 0 }); setError(''); busy.current.clear();
    void reload();
    const refresh = () => { if (document.visibilityState === 'visible') void reload(); };
    const timer = window.setInterval(refresh, 10_000);
    window.addEventListener('focus', refresh);
    return () => { requestRef.current += 1; clearInterval(timer); window.removeEventListener('focus', refresh); };
  }, [reload]);
  async function toggleFavorite(id: string) {
    if (busy.current.has(id)) return;
    busy.current.add(id);
    const wasFavorite = favorites.includes(id);
    try {
      await api(`/me/favorites/${id}/`, { method: wasFavorite ? 'DELETE' : 'PUT' });
      requestRef.current += 1;
      if (activeUser.current === userId) setFavorites(current => wasFavorite ? current.filter(value => value !== id) : [...new Set([...current, id])]);
    } finally { busy.current.delete(id); }
  }
  async function markNoticesRead() {
    await api('/me/notifications/', { method: 'POST' });
    requestRef.current += 1;
    if (activeUser.current === userId) setNotices(current => ({ unread: 0, results: current.results.map(notice => ({ ...notice, read_at: notice.read_at ?? new Date().toISOString() })) }));
  }
  return { favorites: loadedOwner.current === userId ? favorites : [], notices: loadedOwner.current === userId ? notices : { results: [], unread: 0 }, error, reload, toggleFavorite, markNoticesRead };
}
