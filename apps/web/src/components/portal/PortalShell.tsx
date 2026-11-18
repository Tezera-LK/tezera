import palette from "@/components/Palette.module.css";
import { ROLE_PALETTE, type PortalRole } from "@/lib/portal-roles";
import DevRoleSwitcher from "./DevRoleSwitcher";
import PortalNav from "./PortalNav";
import TopBar from "./TopBar";
import { NAV_TEXT, navFor } from "./nav";
import styles from "./PortalShell.module.css";

type PortalShellProps = {
  // null = signed in without a role yet: shared pages only, organiser colours
  role: PortalRole | null;
  children: React.ReactNode;
};

// The frame around every signed-in page, laid out like the team's wireframes: a top bar, the sidebar
// card in the role's colour, and the page. It only draws. The security checks are requireSession()
// and requireRole() in lib/auth/session.ts.
export default function PortalShell({ role, children }: PortalShellProps) {
  return (
    <div
      className={`${palette.root} ${styles.shell}`}
      data-palette={role ? ROLE_PALETTE[role] : "org"}
    >
      <a href="#portal-main" className={styles.skip}>
        {NAV_TEXT.skip}
      </a>
      <TopBar role={role} />
      {/* its own grid, so the sticky top bar above isn't held inside a grid cell */}
      <div className={styles.body}>
        <aside className={styles.sidebar}>
          <PortalNav groups={navFor(role)} />
        </aside>
        <main id="portal-main" className={styles.main} tabIndex={-1}>
          {children}
        </main>
      </div>
      {/* floats in the bottom-right corner, so it's always in reach during a demo */}
      {process.env.NODE_ENV === "development" && <DevRoleSwitcher current={role ?? "none"} />}
    </div>
  );
}
