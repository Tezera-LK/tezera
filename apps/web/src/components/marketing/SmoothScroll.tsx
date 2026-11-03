"use client";

import { ReactLenis } from "lenis/react";
import { useState } from "react";

export default function SmoothScroll({ children }: { children: React.ReactNode }) {
  const [reduce] = useState(() => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );

  return (
    <ReactLenis
      root
      options={{
        autoRaf: true,
        lerp: reduce ? 1 : 0.1,
        smoothWheel: !reduce,
        syncTouch: false,
        anchors: false
      }}
    >
      {children}
    </ReactLenis>
  )
}