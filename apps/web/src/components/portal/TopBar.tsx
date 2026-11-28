import Link from "next/link";
import { ROLE_LABEL, type PortalRole } from "@/lib/portal-roles";
import { routes } from "@/lib/routes";
import { MessageIcon, SearchIcon } from "./icons";
import { NAV_TEXT, NOTIFICATIONS_TEXT, TOP_BAR, TOP_BAR_TEXT, profileMenu, searchHint, type NavItem } from "./nav";
import NotificationsMenu, { type NotificationPreview } from "./NotificationsMenu";
import ProfileMenu from "./ProfileMenu";
import styles from "./PortalShell.module.css";

export type TopBarProps = {
  // picks the search hint and the chip's text; null (no role yet) shows no chip
  role: PortalRole | null;
  // the bell's dropdown: the newest three, already formatted, and the unread count
  notifications: { latest: NotificationPreview[]; unread: number };
  // the profile menu's header; null when there's no account to show
  account: { name: string; email: string } | null;
};

// Where the messages button goes for each role; undefined while that role has no Messages page.
function messagesFor(role: PortalRole | null): string | undefined {
  if (role === "organiser") return routes.messages;
  if (role === "vendor" || role === "freelancer") return routes.vendorArea.messages;
  return undefined;
}

// The bar across the top of every signed-in page (Figma O05): logo, search, messages,
// notifications, the role and the profile. The messages button opens the organiser's or the
// provider's conversations; other roles get theirs with their own pages (EP-09).

export default function TopBar({ role, notifications, account }: TopBarProps) {
  return (
    <header className={styles.topBar}>
      <Link href={routes.dashboard} className={styles.logo} aria-label={TOP_BAR_TEXT.home}>
        <span className={styles.logoMark} aria-hidden="true" />
        tezera
      </Link>

      {/* a plain GET form: it opens /search?q=… with or without JavaScript */}
      <form role="search" className={styles.search} action={TOP_BAR.search.href}>
        <SearchIcon className={styles.searchIcon} />
        <input
          type="search"
          name="q"
          className={styles.searchInput}
          placeholder={searchHint(role)}
          aria-label={TOP_BAR.search.label}
          required
        />
      </form>

      <div className={styles.topActions}>
        <Shortcut item={{ ...TOP_BAR.messages, href: messagesFor(role) }}>
          <MessageIcon />
        </Shortcut>
        <NotificationsMenu {...notifications} text={NOTIFICATIONS_TEXT} />
        {role && <span className={styles.roleChip}>{ROLE_LABEL[role]}</span>}
        <ProfileMenu
          account={account && role ? { ...account, roleLabel: ROLE_LABEL[role] } : null}
          items={profileMenu(role)}
          label={TOP_BAR_TEXT.profile}
        />
      </div>
    </header>
  );
}

// A round icon button: a link once its page exists, plain until then (the sidebar's "Soon" rule).
// item gives the destination and the screen-reader name; children is the icon.
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
