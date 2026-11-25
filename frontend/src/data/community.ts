import { useCallback, useEffect, useRef, useState } from 'react';
import { api, errorMessage } from '../lib/api';

export type Ticket = { id: string; kind: 'report' | 'support'; subject: string; message: string; status: 'open' | 'resolved'; reply: string; created_at: string };

export function useCommunity(userId: number | null) {
  const [favorites, setFavorites] = useState<string[]>([]);
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
      const saved = await api<string[]>('/me/favorites/');
      if (activeUser.current !== userId || request !== requestRef.current) return;
      loadedOwner.current = userId;
      setFavorites(saved); setError('');
    } catch (failure) {
      if (activeUser.current === userId && request === requestRef.current) setError(errorMessage(failure, 'Não foi possível atualizar seus favoritos.'));
    }
  }, [userId]);
  useEffect(() => {
    setFavorites([]); setError(''); busy.current.clear();
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
  return { favorites: loadedOwner.current === userId ? favorites : [], error, reload, toggleFavorite };
}
