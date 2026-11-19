"use client";

import type { Target } from "@/lib/data/portal-types";
import MaybeLink from "./MaybeLink";
import Thumb from "./Thumb";
import { usePopover } from "./usePopover";
import styles from "./PortalShell.module.css";

type ProfileMenuProps = {
  // null while the account has no role (nothing to show but the links)
  account: { name: string; email: string; roleLabel: string } | null;
  items: Target[];
  // the avatar button's name for screen readers
  label: string;
};

// The avatar in the top bar and the menu it opens (Figma O82): who you are, then My profile,
// Edit profile, Payments, Settings and Log out. Their pages come from later slices; until each
// exists its row is shown but not a link.
export default function ProfileMenu({ account, items, label }: ProfileMenuProps) {
  const { open, buttonProps, panelProps } = usePopover();

  return (
    <div className={styles.popoverAnchor}>
      <button
        {...buttonProps}
        className={`${styles.iconButton} ${styles.avatar} ${open ? styles.iconButtonOpen : ""}`}
      >
        <span className={styles.srOnly}>{label}</span>
      </button>

      <div {...panelProps} className={`${styles.popover} ${styles.profilePopover}`}>
        {account && (
          <div className={styles.profileHead}>
            <Thumb size={48} shape="round" />
            <div className={styles.profileWho}>
              <p className={styles.profileName}>{account.name}</p>
              <p className={styles.profileMeta}>{`${account.email} · ${account.roleLabel}`}</p>
            </div>
          </div>
        )}
        <ul className={styles.popoverList}>
          {items.map((item) => (
            <li key={item.label}>
              <MaybeLink href={item.href} className={styles.profileItem}>
                {item.label}
              </MaybeLink>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
