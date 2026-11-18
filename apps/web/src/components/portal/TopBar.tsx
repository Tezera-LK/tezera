import Link from "next/link";
import { ROLE_LABEL, type PortalRole } from "@/lib/portal-roles";
import { routes } from "@/lib/routes";
import { BellIcon, MessageIcon, SearchIcon } from "./icons";
import { NAV_TEXT, TOP_BAR, TOP_BAR_TEXT, searchHint, type NavItem } from "./nav";
import styles from "./PortalShell.module.css";

// The bar across the top of every signed-in page (both wireframes): logo, search, messages,
// notifications, the role and the profile. Their pages come from other tickets (search US-C01,
// the bell EN-09-T4); until one is built, its control is shown but doesn't do anything.
// role picks the search hint and the chip's text; null (no role yet) shows no chip.
export default function TopBar({ role }: { role: PortalRole | null }) {
  // the search page belongs to US-C01; until it exists the box is shown but disabled
  const searchReady = Boolean(TOP_BAR.search.href);

  return (
    <header className={styles.topBar}>
      <Link href={routes.dashboard} className={styles.logo} aria-label={TOP_BAR_TEXT.home}>
        <span className={styles.logoMark} aria-hidden="true" />
        tezera
      </Link>

      <form role="search" className={styles.search} action={TOP_BAR.search.href}>
        <SearchIcon className={styles.searchIcon} />
        <input
          type="search"
          name="q"
          className={styles.searchInput}
          placeholder={searchHint(role)}
          aria-label={searchReady ? TOP_BAR.search.label : `${TOP_BAR.search.label}, ${NAV_TEXT.soon}`}
          disabled={!searchReady}
        />
      </form>

      <div className={styles.topActions}>
        <Shortcut item={TOP_BAR.messages}>
          <MessageIcon />
        </Shortcut>
        <Shortcut item={TOP_BAR.notifications}>
          <BellIcon />
        </Shortcut>
        {role && <span className={styles.roleChip}>{ROLE_LABEL[role]}</span>}
        {/* an empty circle, as in Figma, until profiles have photos */}
        <Shortcut item={{ ...TOP_BAR.profile, label: TOP_BAR_TEXT.profile }} avatar />
      </div>
    </header>
  );
}

// A round icon button: a link once its page exists, plain until then (the sidebar's "Soon" rule).
// item gives the destination and the screen-reader name; avatar switches to the profile circle's colour;
// children is the icon, left out for the avatar.
function Shortcut({ item, avatar, children }: { item: NavItem; avatar?: boolean; children?: React.ReactNode }) {
  const className = avatar ? `${styles.iconButton} ${styles.avatar}` : styles.iconButton;

  if (item.href) {
    return (
      <Link href={item.href} className={className}>
        {children}
        <span className={styles.srOnly}>{item.label}</span>
      </Link>
    );
  }
  return (
    <span className={`${className} ${styles.iconSoon}`} title={`${item.label}: ${NAV_TEXT.soon}`}>
      {children}
      <span className={styles.srOnly}>{`${item.label}, ${NAV_TEXT.soon}`}</span>
    </span>
  );
}
