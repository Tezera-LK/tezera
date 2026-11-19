"use client";

import { usePathname } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";

// Open and close behaviour for the top bar's two panels (the notifications dropdown and the profile
// menu). It's a disclosure, not an ARIA menu: a button that shows and hides a panel of ordinary links.
// The panel closes on Escape (focus goes back to the button), on a click outside it, and when the
// page changes.
export function usePopover() {
  const [open, setOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const panelId = useId();
  const pathname = usePathname();

  // a link inside the panel was followed: close it on the new page
  const [openedOn, setOpenedOn] = useState(pathname);
  if (open && openedOn !== pathname) {
    setOpen(false);
    setOpenedOn(pathname);
  }

  useEffect(() => {
    if (!open) return;

    function onPointerDown(event: PointerEvent) {
      const target = event.target as Node;
      if (!panelRef.current?.contains(target) && !buttonRef.current?.contains(target)) setOpen(false);
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      setOpen(false);
      buttonRef.current?.focus();
    }

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  // Spread `buttonProps` on the toggle button and `panelProps` on the panel.
  return {
    open,
    buttonProps: {
      ref: buttonRef,
      type: "button" as const,
      "aria-expanded": open,
      "aria-controls": panelId,
      onClick: () => {
        setOpenedOn(pathname);
        setOpen((isOpen) => !isOpen);
      },
    },
    panelProps: { ref: panelRef, id: panelId, hidden: !open },
  };
}
