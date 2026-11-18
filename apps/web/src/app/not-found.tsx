import styles from "@/components/public/Public.module.css";
import EmptyState from "@/components/states/EmptyState";
import { STATE_TEXT } from "@/components/states/text";
import { routes } from "@/lib/routes";

// For any address the app doesn't have. Event and profile pages have their own, more specific versions.
export default function NotFound() {
  return (
    <main className={styles.standalone}>
      <EmptyState
        headingLevel={1}
        title="Page not found"
        description="The link may be wrong, or the page may have moved."
        action={{ label: STATE_TEXT.goHome, href: routes.home }}
      />
    </main>
  );
}
