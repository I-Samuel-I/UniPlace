import { useCallback, useEffect, useRef, useState } from 'react';
import type { Product } from './catalog';
import { DEFAULT_AVATAR } from './productDetails';
import { api, errorMessage } from '../lib/api';

export type ChatMessage = {
  id: string;
  sender: 'me' | 'contact';
  text: string;
  createdAt: string;
  readAt?: string | null;
  attachment?: { name: string; url: string; type: string };
};
export type Conversation = {
  id: string;
  contact: { id: string; name: string; avatar: string; online: boolean; available?: boolean; email?: string; institution: string; memberSince: string; rating?: number; reviewCount?: number };
  productId: string;
  messages: ChatMessage[];
  unread: number;
  favorite: boolean;
  updatedAt: string;
};
type ApiConversation = {
  id: string;
  contact: { id: string; name: string; member_since: string; avatar?: string | null; is_active?: boolean };
  product_id: string;
  messages: Array<{ id: string; sender: ChatMessage['sender']; text: string; created_at: string; read_at: string | null; attachment: ChatMessage['attachment'] | null }>;
  unread: number; favorite: boolean; updated_at: string;
};
function toConversation(value: ApiConversation): Conversation {
  return {
    id: value.id, productId: value.product_id, unread: value.unread, favorite: value.favorite, updatedAt: value.updated_at,
    contact: { ...value.contact, avatar: value.contact.avatar || DEFAULT_AVATAR, available: value.contact.is_active !== false, online: false, institution: 'UNIFIP', memberSince: new Date(value.contact.member_since).getFullYear().toString() },
    messages: value.messages.map(message => ({ id: message.id, sender: message.sender, text: message.text, createdAt: message.created_at, readAt: message.read_at, attachment: message.attachment ?? undefined })),
  };
}

export function useChat(userId: number | null) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [storageError, setError] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const owner = useRef(userId);
  owner.current = userId;
  const readPending = useRef(new Set<string>());
  const requestRef = useRef(0);
  const loadedOwner = useRef<number | null>(null);
  const reload = useCallback(async () => {
    if (userId === null) return;
    const request = ++requestRef.current;
    try {
      const response = await api<ApiConversation[]>('/conversations/');
      if (owner.current !== userId || request !== requestRef.current) return;
      loadedOwner.current = userId;
      setConversations(response.map(toConversation)); setError(null); setLoaded(true);
    } catch (error) {
      if (owner.current === userId && request === requestRef.current) { loadedOwner.current = userId; setError(errorMessage(error, 'Não foi possível carregar as conversas.')); setLoaded(true); }
    }
  }, [userId]);
  useEffect(() => {
    setConversations([]); setLoaded(false); setError(null);
    void reload();
    const refresh = () => { if (document.visibilityState === 'visible') void reload(); };
    const timer = window.setInterval(refresh, 5_000);
    window.addEventListener('focus', refresh);
    return () => { requestRef.current += 1; clearInterval(timer); window.removeEventListener('focus', refresh); };
  }, [reload]);

  const markRead = useCallback(async (id: string) => {
    if (readPending.current.has(id)) return;
    readPending.current.add(id);
    try {
      await api(`/conversations/${id}/read/`, { method: 'POST' });
      requestRef.current += 1;
      if (owner.current === userId) setConversations(current => current.map(item => item.id === id ? { ...item, unread: 0 } : item));
    } catch (error) { setError(errorMessage(error, 'Não foi possível marcar a conversa como lida.')); }
    finally { readPending.current.delete(id); }
  }, [userId]);
  async function toggleFavorite(id: string) {
    const conversation = conversations.find(item => item.id === id);
    if (!conversation) return;
    await api(`/conversations/${id}/favorite/`, { method: 'PATCH', body: { favorite: !conversation.favorite } });
    await reload();
  }
  async function sendMessage(id: string, text: string, attachment?: ChatMessage['attachment']) {
    await api(`/conversations/${id}/messages/`, { method: 'POST', body: { text, attachment: attachment ?? null } });
    await reload();
  }
  async function startConversation(product: Product, ownProduct = false) {
    if (ownProduct) return conversations.find(item => item.productId === product.id)?.id ?? '';
    const response = await api<ApiConversation>('/conversations/', { method: 'POST', body: { post_id: product.id } });
    await reload();
    return response.id;
  }
  const current = loadedOwner.current === userId;
  return { conversations: current ? conversations : [], loaded: current && loaded, reload, storageError: current ? storageError : null, markRead, toggleFavorite, sendMessage, startConversation };
}
