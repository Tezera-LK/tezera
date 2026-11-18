import Link from "next/link";
import styles from "@/components/public/Public.module.css";
import { routes } from "@/lib/routes";

// Pages anyone can open without logging in: events and organiser and vendor profiles.
// They are built on the server as a guest and cached, so nothing here may depend on who is looking.
// Phase B: the "Log in" link becomes a small Client Component that says "Go to dashboard" when you're signed in.
export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <Link href={routes.home} className={styles.wordmark}>
          tezera
        </Link>
        <Link href={routes.logIn} className={styles.headerLink}>
          Log in
        </Link>
      </header>
      <main className={styles.main}>{children}</main>
    </div>
  );
}
