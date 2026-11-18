import Link from "next/link";
import { routes } from "@/lib/routes";
import styles from "./Public.module.css";

// An organiser's contact details are only for people who are logged in (decided 3 Nov).
// Public pages are cached as one copy for every visitor, so the details can't be part of that HTML.
// Phase B: make this a Client Component that loads the details in the browser for a logged-in viewer
// (the backend locks the fields with a field-level rule, EN-04-T2).
export default function ContactDetails() {
  return (
    <section className={`${styles.section} ${styles.locked}`} aria-labelledby="contact-details">
      <h2 id="contact-details" className={styles.sectionTitle}>
        Contact details
      </h2>
      <p>Log in to see how to contact this organiser.</p>
      <Link href={routes.logIn} className={styles.button}>
        Log in
      </Link>
    </section>
  );
}
