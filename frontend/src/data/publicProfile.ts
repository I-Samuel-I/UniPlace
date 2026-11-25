import { useCallback, useEffect, useState } from "react";
import { api, ApiError, errorMessage } from "../lib/api";

export type PublicProfile = {
  id: number;
  name: string;
  avatar: string | null;
  member_since: string;
  active_posts: number;
  campuses: Array<{ id: string; name: string; city: string; state: string }>;
};

export function usePublicProfile(profileId: string) {
  const [retry, setRetry] = useState(0);
  const [state, setState] = useState<{ key: string; profile: PublicProfile | null; loaded: boolean; error: string; notFound: boolean }>({ key: profileId, profile: null, loaded: false, error: "", notFound: false });
  useEffect(() => {
    let cancelled = false;
    setState({ key: profileId, profile: null, loaded: false, error: "", notFound: false });
    void api<PublicProfile>(`/profiles/${encodeURIComponent(profileId)}/`).then(profile => {
      if (!cancelled) setState({ key: profileId, profile, loaded: true, error: "", notFound: false });
    }).catch(failure => {
      if (!cancelled) setState({ key: profileId, profile: null, loaded: true, error: errorMessage(failure, "Não foi possível carregar este perfil."), notFound: failure instanceof ApiError && failure.status === 404 });
    });
    return () => { cancelled = true; };
  }, [profileId, retry]);
  const reload = useCallback(() => setRetry(value => value + 1), []);
  return { ...(state.key === profileId ? state : { profile: null, loaded: false, error: "", notFound: false }), reload };
}
