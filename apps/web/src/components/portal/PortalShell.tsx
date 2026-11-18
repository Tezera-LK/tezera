import ConfigureAmplify from "@/components/ConfigureAmplify";
import palette from "@/components/Palette.module.css";
import { VIEW_AS, type Session } from "@/lib/auth/session";
import { ROLE_PALETTE } from "@/lib/portal-roles";
import DevRoleSwitcher from "./DevRoleSwitcher";
import PortalNav from "./PortalNav";
import TopBar from "./TopBar";
import { NAV_TEXT, navFor } from "./nav";
import styles from "./PortalShell.module.css";

type PortalShellProps = {
  // session.role null = signed in without a role yet: shared pages only, organiser colours
  session: Session;
  children: React.ReactNode;
};

// The frame around every signed-in page, laid out like the team's wireframes: a top bar, the sidebar
// card in the role's colour, and the page. It only draws. The security checks are src/proxy.ts and
// requireSession() and requireRole() in lib/auth/session.ts.
export default function PortalShell({ session, children }: PortalShellProps) {
  const { role } = session;

  return (
    <div
      className={`${palette.root} ${styles.shell}`}
      data-palette={role ? ROLE_PALETTE[role] : "org"}
    >
      {/* Amplify in the browser, with the login in cookies: the account menu's Log out needs it */}
      <ConfigureAmplify />
      <a href="#portal-main" className={styles.skip}>
        {NAV_TEXT.skip}
      </a>
      <TopBar session={session} />
      {/* its own grid, so the sticky top bar above isn't held inside a grid cell */}
      <div className={styles.body}>
        <aside className={styles.sidebar}>
          <PortalNav groups={navFor(role)} />
        </aside>
        <main id="portal-main" className={styles.main} tabIndex={-1}>
          {children}
        </main>
      </div>
      {/* `next dev` without a user pool only; floats in the bottom-right corner (lib/auth/dev-role.ts) */}
      {VIEW_AS && <DevRoleSwitcher current={role ?? "none"} />}
    </div>
  );
}
