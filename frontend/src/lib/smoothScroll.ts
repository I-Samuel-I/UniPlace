import { useEffect } from "react";

const FRICTION_MS = 85;
const STOP_DISTANCE = 0.75;

// Animate the document itself so sticky elements and scroll reveals stay native.
export function installSmoothScroll() {
  const scrollingElement = document.scrollingElement;
  if (!(scrollingElement instanceof HTMLElement)) return;
  const root = scrollingElement;

  const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
  let frame = 0;
  let position = root.scrollTop;
  let target = position;
  let lastApplied = position;
  let previousTime = 0;

  function stop() {
    window.cancelAnimationFrame(frame);
    frame = 0;
    position = target = lastApplied = root.scrollTop;
  }

  function maximum() {
    return Math.max(0, root.scrollHeight - root.clientHeight);
  }

  function clamp(value: number) {
    return Math.max(0, Math.min(maximum(), value));
  }

  function animate(now: number) {
    // Navigation, keyboard scrolling and other scripts take over immediately.
    if (!root.isConnected || Math.abs(root.scrollTop - lastApplied) > 1) {
      stop();
      return;
    }
    const elapsed = Math.min(64, Math.max(1, now - previousTime));
    previousTime = now;
    target = clamp(target);
    position += (target - position) * (1 - Math.exp(-elapsed / FRICTION_MS));
    const finished = Math.abs(target - position) < STOP_DISTANCE;
    if (finished) position = target;
    window.scrollTo({ top: position, behavior: "instant" });
    lastApplied = root.scrollTop;
    frame = finished ? 0 : window.requestAnimationFrame(animate);
  }

  function nativeScrollArea(element: Element | null) {
    if (element?.closest("select, input[type=number], input[type=range], dialog[open], [data-native-scroll]")) return true;
    for (let current = element; current && current !== root && current !== document.body; current = current.parentElement) {
      const style = window.getComputedStyle(current);
      if (style.overscrollBehaviorY === "contain" || style.overscrollBehaviorY === "none") return true;
      if (/(auto|scroll|overlay)/.test(style.overflowY) && current.scrollHeight > current.clientHeight + 1) return true;
    }
    // Respect modal/menu implementations that temporarily lock the document.
    return [root, document.body].some(element => /^(hidden|clip)$/.test(window.getComputedStyle(element).overflowY));
  }

  function wheel(event: WheelEvent) {
    if (event.defaultPrevented || !event.cancelable || motion.matches || event.ctrlKey || event.metaKey || event.shiftKey || !event.deltaY || Math.abs(event.deltaX) > Math.abs(event.deltaY)) {
      stop();
      return;
    }
    const element = event.target instanceof Element ? event.target : null;
    if (nativeScrollArea(element)) {
      stop();
      return;
    }

    const current = root.scrollTop;
    if (!frame || Math.abs(current - lastApplied) > 1) {
      stop();
    }
    const unit = event.deltaMode === WheelEvent.DOM_DELTA_LINE
      ? parseFloat(window.getComputedStyle(root).lineHeight) || 24
      : event.deltaMode === WheelEvent.DOM_DELTA_PAGE ? root.clientHeight : 1;
    const delta = event.deltaY * unit;
    // A change in direction cancels the old momentum instead of fighting it.
    if (frame && Math.sign(delta) !== Math.sign(target - position)) target = position;
    const backlog = Math.max(240, root.clientHeight * 1.25);
    const next = clamp(Math.max(position - backlog, Math.min(position + backlog, target + delta)));
    if (next === current && !frame) return;

    event.preventDefault();
    target = next;
    if (!frame) {
      previousTime = performance.now();
      frame = window.requestAnimationFrame(animate);
    }
  }

  function scrolled() {
    if (frame && Math.abs(root.scrollTop - lastApplied) > 1) stop();
  }

  window.addEventListener("wheel", wheel, { passive: false });
  window.addEventListener("scroll", scrolled, { passive: true });
  window.addEventListener("keydown", stop);
  window.addEventListener("pointerdown", stop, { passive: true });
  window.addEventListener("touchstart", stop, { passive: true });
  window.addEventListener("resize", stop);
  window.addEventListener("blur", stop);
  window.addEventListener("popstate", stop);
  window.addEventListener("hashchange", stop);
  document.addEventListener("visibilitychange", stop);
  motion.addEventListener("change", stop);
  return () => {
    stop();
    window.removeEventListener("wheel", wheel);
    window.removeEventListener("scroll", scrolled);
    window.removeEventListener("keydown", stop);
    window.removeEventListener("pointerdown", stop);
    window.removeEventListener("touchstart", stop);
    window.removeEventListener("resize", stop);
    window.removeEventListener("blur", stop);
    window.removeEventListener("popstate", stop);
    window.removeEventListener("hashchange", stop);
    document.removeEventListener("visibilitychange", stop);
    motion.removeEventListener("change", stop);
  };
}

export function useSmoothScroll() {
  useEffect(installSmoothScroll, []);
}
