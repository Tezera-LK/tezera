import localFont from "next/font/local";
import palette from "@/components/Palette.module.css";
import { ROLE_PALETTE, type PortalRole } from "@/lib/portal-roles";
import { previewMode } from "@/lib/preview";
import DevRoleSwitcher from "./DevRoleSwitcher";
import PortalNav from "./PortalNav";
import TopBar, { type TopBarProps } from "./TopBar";
import { NAV_TEXT, navFor } from "./nav";
import styles from "./PortalShell.module.css";

// The Figma files set body text in Instrument Sans and headings in Bricolage Grotesque (the site font).
// Loaded here, not in the root layout, so only portal pages download it. Bundled like Bricolage
// (app/layout.tsx), so builds don't depend on Google Fonts. One variable file, weights 400-700, latin.
const instrumentSans = localFont({
  src: "../../app/fonts/InstrumentSans-Latin.woff2",
  weight: "400 700",
  variable: "--font-instrument",
  display: "swap",
});

type PortalShellProps = {
  // null = signed in without a role yet: shared pages only, organiser colours
  role: PortalRole | null;
  // what the top bar's bell and profile menu show (TopBar.tsx)
  notifications: TopBarProps["notifications"];
  account: TopBarProps["account"];
  // the page, from the (portal) layout
  children: React.ReactNode;
};

// The frame around every signed-in page, laid out like the team's wireframes: a top bar, the sidebar
// card in the role's colour, and the page. It only draws. The security checks are requireSession()
// and requireRole() in lib/auth/session.ts.
export default function PortalShell({ role, notifications, account, children }: PortalShellProps) {
  return (
    <div
      className={`${palette.root} ${instrumentSans.variable} ${styles.shell}`}
      data-palette={role ? ROLE_PALETTE[role] : "org"}
    >
      <a href="#portal-main" className={styles.skip}>
        {NAV_TEXT.skip}
      </a>
      <TopBar role={role} notifications={notifications} account={account} />
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
      {previewMode && <DevRoleSwitcher current={role ?? "none"} />}
    </div>
  );
}
