import Link from "next/link";
import type { Session } from "@/lib/auth/session";
import { ROLE_LABEL } from "@/lib/portal-roles";
import { routes } from "@/lib/routes";
import AccountMenu from "./AccountMenu";
import { BellIcon, MessageIcon, SearchIcon } from "./icons";
import {
  ACCOUNT_TEXT,
  NAV_TEXT,
  TOP_BAR,
  TOP_BAR_TEXT,
  accountLinks,
  logOutDestination,
  searchHint,
  type NavItem,
} from "./nav";
import styles from "./PortalShell.module.css";

// The bar across the top of every signed-in page (both wireframes): logo, search, messages,
// notifications, the role and the account. Their pages come from other tickets (search US-C01,
// the bell EN-09-T4); until one is built, its control is shown but doesn't do anything.
// The wireframes' avatar opens the profile; until the profile page exists it opens the account menu.
export default function TopBar({ session }: { session: Session }) {
  const { role } = session;
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
        <AccountMenu
          name={session.name || ACCOUNT_TEXT.loggedIn}
          roleLabel={role ? ROLE_LABEL[role] : undefined}
          links={accountLinks(role)}
          logOutTo={logOutDestination(role)}
        />
      </div>
    </header>
  );
}

// A round icon button: a link once its page exists, plain until then (the sidebar's "Soon" rule).
function Shortcut({ item, children }: { item: NavItem; children: React.ReactNode }) {
  if (item.href) {
    return (
      <Link href={item.href} className={styles.iconButton}>
        {children}
        <span className={styles.srOnly}>{item.label}</span>
      </Link>
    );
  }
  return (
    <span className={`${styles.iconButton} ${styles.iconSoon}`} title={`${item.label}: ${NAV_TEXT.soon}`}>
      {children}
      <span className={styles.srOnly}>{`${item.label}, ${NAV_TEXT.soon}`}</span>
    </span>
  );
}
