// Hand-off between the opening cover and the page.
// Opening calls markRevealed() while its tiles are still clearing; the nav and hero
// key their entrance off the `is-revealed` class on <html>, so they start moving
// underneath the cover instead of after it has gone.

const CLASS = "is-revealed";
const EVENT = "tezera:revealed";

export function markRevealed() {
  const root = document.documentElement;
  if (root.classList.contains(CLASS)) return;
  root.classList.add(CLASS);
  window.dispatchEvent(new Event(EVENT));
}

export function isRevealed() {
  return document.documentElement.classList.contains(CLASS);
}

// calls fn once the page is revealed (straight away if it already is); returns an unsubscribe
export function onRevealed(fn: () => void) {
  if (isRevealed()) {
    fn();
    return () => {};
  }
  window.addEventListener(EVENT, fn, { once: true });
  return () => window.removeEventListener(EVENT, fn);
}
