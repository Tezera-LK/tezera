"use client";

import Link from "next/link";
import { routes } from "@/lib/routes";
import { BellIcon } from "./icons";
import MaybeLink from "./MaybeLink";
import Thumb from "./Thumb";
import { usePopover } from "./usePopover";
import styles from "./PortalShell.module.css";
import ui from "./ui.module.css";

// One row of the dropdown, already worded and formatted on the server (so the time is in Sri Lanka
// time whatever the viewer's clock says).
export type NotificationPreview = {
  id: string;
  title: string;
  detail: string;
  // "4:12" today, "Mon" this week, "2 Oct" before that
  when: string;
  href?: string;
};

type NotificationsMenuProps = {
  latest: NotificationPreview[];
  unread: number;
  text: { title: string; markAllRead: string; seeAll: string; empty: string; unread: string };
};

// The bell in the top bar and the dropdown it opens (Figma O81): the three newest notifications
// and a link to the full list. The red dot shows while anything is unread.
export default function NotificationsMenu({ latest, unread, text }: NotificationsMenuProps) {
  const { open, buttonProps, panelProps } = usePopover();

  return (
    <div className={styles.popoverAnchor}>
      <button {...buttonProps} className={`${styles.iconButton} ${open ? styles.iconButtonOpen : ""}`}>
        <BellIcon />
        {unread > 0 && <span className={styles.badge} aria-hidden="true" />}
        <span className={styles.srOnly}>
          {text.title}
          {unread > 0 && `, ${unread} ${text.unread}`}
        </span>
      </button>

      <div {...panelProps} className={`${styles.popover} ${styles.notificationsPopover}`}>
        <div className={styles.popoverHead}>
          <h2 className={styles.popoverTitle}>{text.title}</h2>
          {/* marking as read needs the backend (EN-09); shown, not wired up */}
          <MaybeLink className={ui.textLink}>{text.markAllRead}</MaybeLink>
        </div>

        {latest.length > 0 ? (
          <ul className={styles.popoverList}>
            {latest.map((item) => (
              <li key={item.id}>
                <MaybeLink href={item.href} className={`${ui.row} ${styles.popoverRow}`}>
                  <Thumb size={32} />
                  <span className={ui.rowText}>
                    <span className={ui.rowTitle}>{item.title}</span>
                    <span className={ui.muted}>{item.detail}</span>
                  </span>
                  <span className={styles.popoverTime}>{item.when}</span>
                </MaybeLink>
              </li>
            ))}
          </ul>
        ) : (
          <p className={styles.popoverEmpty}>{text.empty}</p>
        )}

        <Link href={routes.notifications} className={`${ui.wideButton} ${styles.popoverSeeAll}`}>
          {text.seeAll}
        </Link>
      </div>
    </div>
  );
}
