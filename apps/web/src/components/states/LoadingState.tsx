import styles from "./States.module.css";
import { STATE_TEXT } from "./text";

type LoadingStateProps = {
  // read out by screen readers; the grey skeleton lines are hidden from them
  label?: string;
  // how many skeleton lines to draw
  lines?: number;
};

// Placeholder while a page or section loads. Used by loading.tsx files and inside <Suspense fallback>.
export default function LoadingState({ label = STATE_TEXT.loading, lines = 4 }: LoadingStateProps) {
  return (
    <div className={styles.loading} role="status">
      {Array.from({ length: lines }, (_, i) => (
        <span key={i} className={styles.line} aria-hidden="true" />
      ))}
      {/* after the lines, so the CSS can style the first line as a heading */}
      <span className={styles.srOnly}>{label}</span>
    </div>
  );
}
