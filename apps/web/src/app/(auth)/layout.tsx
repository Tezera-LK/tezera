// ─────────────────────────────────────────────────────────────
// (auth) LAYOUT: shared by every page in the (auth) route group
// File: src/app/(auth)/layout.tsx
//
// The two-column frame (brand panel + form) now lives one level down,
// in (auth)/[role]/layout.tsx, because it needs to know the ROLE to pick
// the colours. This layout just passes the page through unchanged.
// <>...</> is a FRAGMENT: a wrapper that adds nothing to the page.
// ─────────────────────────────────────────────────────────────

export default function AuthGroupLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
