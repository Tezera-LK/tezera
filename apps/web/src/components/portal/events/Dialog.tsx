"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useId, useRef } from "react";
import styles from "./EventPages.module.css";

type DialogProps = {
  title: string;
  subtitle?: string;
  // where closing goes: the page under the dialog, without ?dialog=
  closeHref: string;
  closeLabel: string;
  // 560px wide instead of 600, as the stall dialogs are (O72–O76)
  narrow?: boolean;
  children: React.ReactNode;
};

// A dialog over the page (Figma O10, O53, O56). It's opened by a link with ?dialog=…, so it
// works without JavaScript and the back button closes it. With JavaScript it also takes focus,
// keeps Tab inside it, and closes on Escape or a click on the dimmed page.
export default function Dialog({ title, subtitle, closeHref, closeLabel, narrow, children }: DialogProps) {
  const router = useRouter();
  const panelRef = useRef<HTMLDivElement>(null);
  const titleId = useId();

  useEffect(() => {
    const panel = panelRef.current;
    if (!panel) return;
    const opener = document.activeElement as HTMLElement | null;
    // the first field, or the panel itself when there's none
    (panel.querySelector<HTMLElement>("input, textarea, select") ?? panel).focus();

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        router.push(closeHref, { scroll: false });
        return;
      }
      if (event.key !== "Tab" || !panel) return;
      // keep Tab and Shift+Tab inside the dialog
      const focusable = [...panel.querySelectorAll<HTMLElement>("a[href], button:not([disabled]), input, textarea, select")];
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first?.focus();
      }
    }

    document.addEventListener("keydown", onKeyDown);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = "";
      opener?.focus?.();
    };
  }, [closeHref, router]);

  return (
    <div className={styles.overlay} onClick={() => router.push(closeHref, { scroll: false })}>
      <div
        ref={panelRef}
        className={`${styles.dialog} ${narrow ? styles.dialogNarrow : ""}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        // clicks inside the dialog shouldn't reach the dimmed page behind it
        onClick={(event) => event.stopPropagation()}
      >
        <div className={styles.dialogHead}>
          <div>
            <h2 id={titleId} className={styles.dialogTitle}>
              {title}
            </h2>
            {subtitle && <p className={styles.dialogSubtitle}>{subtitle}</p>}
          </div>
          <Link href={closeHref} scroll={false} className={styles.dialogClose} aria-label={closeLabel}>
            ×
          </Link>
        </div>
        {children}
      </div>
    </div>
  );
}
