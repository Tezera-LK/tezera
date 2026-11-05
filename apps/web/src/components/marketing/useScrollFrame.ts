"use client";

import { useCallback, type RefObject } from "react";
import { useLenis } from "lenis/react";

// Runs ref.current on every Lenis scroll tick (smooth wheel and native/touch scroll both emit),
// so scroll-driven sections share Lenis's one animation frame instead of each adding a window listener.
// The section's own effect sets ref.current to its frame function and clears it on cleanup.
export function useScrollFrame(ref: RefObject<(() => void) | null>) {
  const run = useCallback(() => ref.current?.(), [ref]);
  useLenis(run);
}
