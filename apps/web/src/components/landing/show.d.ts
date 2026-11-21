// The stage script's one export (show.js stays plain JS; see its header).
import type Lenis from "lenis";

export interface ShowOptions {
  // the page's smooth-scroll instance, when it exists; the stage pauses it during the opening
  getLenis?: () => Lenis | null;
}

// starts the stage on the landing page's root element; returns a cleanup that stops everything
export function startShow(root: HTMLElement, opts?: ShowOptions): () => void;
