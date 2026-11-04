// ─────────────────────────────────────────────────────────────
// BRAND PANEL: the coloured panel on the left of every auth page
// File: src/components/auth/BrandPanel.tsx
//
// Its colours, including the tiles, come from the role class on the
// page (CSS variables), so every role gets tiles in its own palette.
// Its WORDING depends on the role AND the screen: e.g. vendors see
// "Welcome back." on log in but "Locked out? It happens." on reset.
// ─────────────────────────────────────────────────────────────

// A Client Component because usePathname() (below) reads the web
// address in the browser. It still shows on the server's first draw.
"use client";

// usePathname: the current web address path, e.g. "/vendor/login".
import { usePathname } from "next/navigation";
import Link from "next/link";

import styles from "./AuthLayout.module.css";
import { panelCopy, type Role, type Screen } from "@/lib/roles";

// The tile pattern. 6 strings x 6 letters = 36 grid cells (6 columns).
// Each letter is a colour from the role's palette (AuthLayout.module.css):
//   a accent, s secondary, l light, d dark, w pale, . empty
// Same pattern for every role; only the colours change.
const ROWS = ["....ad", "...ls.", "..lssl", ".dsaa.", "lssaad", "ssslaw"];

export default function BrandPanel({ role }: { role: Role }) {
  const pathname = usePathname();

  // "/vendor/reset-password".split("/") -> ["", "vendor", "reset-password"]
  // so item [2] is the screen. "as Screen" tells TypeScript to treat it
  // as one of our screen names; panelCopy() falls back to the default
  // wording for anything unexpected.
  const screen = (pathname.split("/")[2] ?? "login") as Screen;
  const copy = panelCopy(role, screen);

  return (
    <aside className={styles.panel}>
      {/* Link (not <a>): moves to the home page without reloading the site. */}
      <Link href="/" className={styles.logo}>
        <span className={styles.dots} aria-hidden="true" />
        tezera
      </Link>

      {/* The page's only <h1>. Form titles are <h2>. */}
      <h1 className={styles.headline}>{copy.title}</h1>
      <p className={styles.sub}>{copy.text}</p>

      {/* Decorative tiles (the brand manual's tile system), for every role.
          ROWS.join("").split("") = 36 single letters; each becomes a <span>.
          "." = empty cell (no class); any other letter = a tile + its colour. */}
      <div className={styles.tiles} aria-hidden="true">
        {ROWS.join("").split("").map((c, i) => (
          <span key={i} className={c === "." ? undefined : `${styles.tile} ${styles[c]}`} />
        ))}
      </div>
    </aside>
  );
}
