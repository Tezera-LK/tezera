import Link from "next/link";
import { routes } from "@/lib/routes";
import Dialog from "../events/Dialog";
import forms from "../forms.module.css";
import tables from "../tables.module.css";
import ui from "../ui.module.css";
import styles from "./Verification.module.css";

const TEXT = {
  text: "Providers only take requests from verified organisers. Upload your documents and an admin reviews them, usually in 1 to 2 working days.",
  locked: "Locked until you're verified",
  items: ["Opening stall slots", "Posting jobs", "Sending booking requests"],
  notNow: "Not now",
  getVerified: "Get verified",
  close: "Close",
} as const;

// "Get verified to send booking requests" (Figma O41): shown instead of a form that needs the
// Verified badge. `title` says what was tried; `closeHref` goes back to where they were.
export default function LockedDialog({ title, closeHref }: { title: string; closeHref: string }) {
  return (
    <Dialog title={title} closeHref={closeHref} closeLabel={TEXT.close} narrow>
      <span className={styles.bang} aria-hidden="true">
        !
      </span>
      <p className={tables.panelText}>{TEXT.text}</p>
      <section className={styles.lockedCard} aria-label={TEXT.locked}>
        <p className={ui.rowTitle}>{TEXT.locked}</p>
        <ul className={styles.lockedList}>
          {TEXT.items.map((item) => (
            <li key={item} className={styles.lockedItem}>
              <span className={styles.lockIcon} aria-hidden="true" />
              {item}
            </li>
          ))}
        </ul>
      </section>
      <div className={tables.dialogActions}>
        <Link href={closeHref} scroll={false} className={`${forms.bigButton} ${forms.bigButtonQuiet}`}>
          {TEXT.notNow}
        </Link>
        <Link href={routes.verification} className={`${forms.bigButton} ${forms.bigButtonPrimary}`}>
          {TEXT.getVerified}
        </Link>
      </div>
    </Dialog>
  );
}
