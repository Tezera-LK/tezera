// ─────────────────────────────────────────────────────────────
// DIVIDER: the "──── or ────" line between Google and the form
// File: src/components/auth/Divider.tsx
// The lines are drawn in CSS (.divider::before and ::after).
// ─────────────────────────────────────────────────────────────

import styles from "./Form.module.css";

// { label = "or" } takes the label prop with a default of "or";
// { label?: string } is its type ("an optional piece of text").
export default function Divider({ label = "or" }: { label?: string }) {
  return (
    <div className={styles.divider} role="separator">
      {label}
    </div>
  );
}
