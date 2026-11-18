import Link from "next/link";
import styles from "./States.module.css";

type EmptyStateProps = {
  title: string;
  description?: string;
  // optional next step, e.g. { label: "Create your first event", href: ... }
  action?: { label: string; href: string };
  // 1 when it is the whole page (e.g. "Event not found"), 2 or 3 when it sits inside one
  headingLevel?: 1 | 2 | 3;
};

// Shown when there is nothing to list yet, or nothing at this address. Ships no JavaScript.
export default function EmptyState({ title, description, action, headingLevel = 2 }: EmptyStateProps) {
  const Heading = `h${headingLevel}` as const;

  return (
    <div className={styles.panel}>
      <Heading className={styles.title}>{title}</Heading>
      {description && <p className={styles.description}>{description}</p>}
      {action && (
        <Link href={action.href} className={styles.action}>
          {action.label}
        </Link>
      )}
    </div>
  );
}
