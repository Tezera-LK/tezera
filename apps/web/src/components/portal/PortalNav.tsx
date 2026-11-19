"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useId, useState } from "react";
import { NAV_TEXT, type NavGroup } from "./nav";
import styles from "./PortalShell.module.css";

// The sidebar links. A Client Component because it marks the current page and opens and closes on phones.
// groups comes from navFor() in nav.ts.
export default function PortalNav({ groups }: { groups: NavGroup[] }) {
  // the current URL, to mark the matching pill as the current page
  const pathname = usePathname();
  // whether the links are unfolded on a phone; desktop ignores it
  const [open, setOpen] = useState(false);
  // a unique id that ties the Menu button to the list it opens, and each heading to its list
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
                    // looks like the other pills (as in Figma) but isn't a link; screen readers hear "coming soon"
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
