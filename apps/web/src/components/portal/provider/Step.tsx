import Chip from "@/components/portal/Chip";
import hiring from "@/components/portal/hiring/Hiring.module.css";
import ui from "@/components/portal/ui.module.css";
import styles from "./Provider.module.css";

// One step of a timeline (V13, V51): done shows a tick, next shows a chip, the rest show nothing.
// Put it inside an <ol className={styles.steps}>.
export default function Step({ title, sub, done, next }: { title: string; sub: string; done?: boolean; next?: string }) {
  return (
    <li className={styles.tintRow}>
      <span className={ui.rowText}>
        <span className={ui.rowTitle}>{title}</span>
        <span className={hiring.sub}>{sub}</span>
      </span>
      {done && (
        <span className={styles.tick} aria-label="done">
          ✓
        </span>
      )}
      {next && <Chip tone="warn">{next}</Chip>}
    </li>
  );
}
