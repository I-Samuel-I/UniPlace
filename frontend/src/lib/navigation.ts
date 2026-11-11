import type { MouseEvent } from "react";

export function productPath(id: string) {
  return `/anuncios/${encodeURIComponent(id)}`;
}

export function followLink(
  event: MouseEvent<HTMLAnchorElement>,
  navigate: () => void,
) {
  if (
    event.button !== 0 ||
    event.metaKey ||
    event.ctrlKey ||
    event.shiftKey ||
    event.altKey
  )
    return;
  event.preventDefault();
  navigate();
}
