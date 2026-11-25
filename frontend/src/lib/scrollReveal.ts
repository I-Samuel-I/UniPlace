import { useCallback } from "react";

// Progressive enhancement: content stays visible until an observer is available.
export function observeScrollReveals(root: HTMLElement) {
  const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
  if (motion.matches || !("IntersectionObserver" in window)) return;

  const seen = new WeakSet<Element>();
  const pending = new Set<HTMLElement>();
  const animating = new Set<HTMLElement>();
  const reveal = (element: HTMLElement, animate = true) => {
    observer.unobserve(element);
    pending.delete(element);
    element.classList.remove("scroll-reveal-pending");
    if (animate) {
      element.classList.add("scroll-reveal-visible");
      animating.add(element);
    } else {
      element.style.removeProperty("--reveal-delay");
    }
  };
  const observer = new IntersectionObserver(entries => {
    for (const entry of entries) {
      if (entry.isIntersecting) reveal(entry.target as HTMLElement);
    }
  }, { threshold: 0, rootMargin: "0px 0px -24px 0px" });

  const register = (element: HTMLElement) => {
    if (seen.has(element) || motion.matches) return;
    seen.add(element);
    if (element.contains(document.activeElement)) return;
    const delay = Math.min(240, Math.max(0, Number(element.dataset.revealDelay) || 0));
    element.style.setProperty("--reveal-delay", `${delay}ms`);
    element.classList.add("scroll-reveal-pending");
    pending.add(element);
    observer.observe(element);
  };
  const scan = (element: HTMLElement) => {
    if (element.matches("[data-reveal]")) register(element);
    element.querySelectorAll<HTMLElement>("[data-reveal]").forEach(register);
  };
  const finish = (event: AnimationEvent) => {
    if (event.animationName !== "scroll-reveal-enter") return;
    const element = event.target as HTMLElement;
    element.classList.remove("scroll-reveal-visible");
    element.style.removeProperty("--reveal-delay");
    animating.delete(element);
  };
  const focus = (event: FocusEvent) => {
    for (const element of pending) {
      if (element.contains(event.target as Node)) reveal(element, false);
    }
    for (const element of animating) {
      if (element.contains(event.target as Node)) {
        element.classList.remove("scroll-reveal-visible");
        element.style.removeProperty("--reveal-delay");
        animating.delete(element);
      }
    }
  };
  const clear = () => {
    for (const element of pending) reveal(element, false);
    for (const element of animating) {
      element.classList.remove("scroll-reveal-visible");
      element.style.removeProperty("--reveal-delay");
    }
    animating.clear();
  };
  const preferenceChanged = () => { if (motion.matches) clear(); };
  const mutations = new MutationObserver(records => {
    for (const record of records) {
      for (const node of record.addedNodes) {
        if (node instanceof HTMLElement) scan(node);
      }
    }
    // Removed cards should not be retained while filters or routes change.
    for (const element of pending) {
      if (!root.contains(element)) reveal(element, false);
    }
    for (const element of animating) {
      if (!root.contains(element)) {
        element.classList.remove("scroll-reveal-visible");
        element.style.removeProperty("--reveal-delay");
        animating.delete(element);
      }
    }
  });

  scan(root);
  mutations.observe(root, { childList: true, subtree: true });
  root.addEventListener("animationend", finish);
  root.addEventListener("focusin", focus);
  motion.addEventListener("change", preferenceChanged);
  return () => {
    mutations.disconnect();
    observer.disconnect();
    root.removeEventListener("animationend", finish);
    root.removeEventListener("focusin", focus);
    motion.removeEventListener("change", preferenceChanged);
    clear();
  };
}

export function useScrollReveal() {
  return useCallback((root: HTMLElement | null) => root ? observeScrollReveals(root) : undefined, []);
}
