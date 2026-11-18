import Link from "next/link";
import HeaderAction from "@/components/public/HeaderAction";
import styles from "@/components/public/Public.module.css";
import { routes } from "@/lib/routes";

// Pages anyone can open without logging in: teasers of events and of organiser, vendor and freelancer
// profiles, for shared links. They are built on the server and cached as one copy for every visitor, so
// nothing here may depend on who is looking. Only the browser adapts the buttons for someone logged in.
export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <Link href={routes.home} className={styles.wordmark}>
          tezera
        </Link>
        <HeaderAction />
      </header>
      <main className={styles.main}>{children}</main>
    </div>
  );
}
