"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useId, useState } from "react";
import { NAV_TEXT, type NavGroup } from "./nav";
import styles from "./PortalShell.module.css";

// The sidebar links. A Client Component because it marks the current page and opens and closes on phones.
export default function PortalNav({ groups }: { groups: NavGroup[] }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const navId = useId();

  return (
    <>
      {/* only visible on narrow screens, where the links fold away behind it */}
      <button
        type="button"
        className={styles.menuButton}
        aria-expanded={open}
        aria-controls={navId}
        onClick={() => setOpen((isOpen) => !isOpen)}
      >
        {NAV_TEXT.menu}
      </button>
      <nav id={navId} className={styles.nav} data-open={open} aria-label={NAV_TEXT.label}>
        {groups.map((group, index) => (
          <div key={group.title}>
            <p id={`${navId}-${index}`} className={styles.groupTitle}>
              {group.title}
            </p>
            <ul className={styles.list} aria-labelledby={`${navId}-${index}`}>
              {group.items.map((item) => (
                <li key={item.label}>
                  {item.href ? (
                    <Link
                      href={item.href}
                      className={styles.item}
                      aria-current={isCurrent(pathname, item.href) ? "page" : undefined}
                      onClick={() => setOpen(false)}
                    >
                      {item.label}
                    </Link>
                  ) : (
                    // a dashed outline instead of a "Soon" tag, which made longer names wrap in the 224px card
                    <span className={`${styles.item} ${styles.soon}`} title={`${item.label}: ${NAV_TEXT.soon}`}>
                      {item.label}
                      <span className={styles.srOnly}>{`, ${NAV_TEXT.soon}`}</span>
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>
    </>
  );
}

// "/organiser" stays highlighted on "/organiser/anything"
function isCurrent(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}
