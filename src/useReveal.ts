import { useEffect, useRef, useState } from "react";

/**
 * Reveals an element the first time it scrolls into view.
 *
 * Returns a ref to attach and whether it has been shown yet. Anyone who has
 * asked for reduced motion, or whose browser has no IntersectionObserver, is
 * shown the content immediately rather than being given a degraded animation.
 */
export const useReveal = <T extends HTMLElement>() => {
  const ref = useRef<T>(null);
  const prefersReduced =
    typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

  const [shown, setShown] = useState(
    prefersReduced || typeof IntersectionObserver === "undefined"
  );

  useEffect(() => {
    if (shown) return;
    const element = ref.current;
    if (!element) return;

    /*
     * As soon as any of it is on screen. Waiting until it was well inside the
     * screen - a twentieth of it, clear of the bottom eighth - left a card
     * that began near the foot of a phone's screen hidden, the page looking
     * empty there, until it was scrolled.
     */
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setShown(true);
          observer.disconnect();
        }
      },
      { threshold: 0 }
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, [shown]);

  return { ref, shown };
};
