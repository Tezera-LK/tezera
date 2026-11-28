import type { Metadata } from "next";
import PortalShell from "@/components/portal/PortalShell";
import { requireSession } from "@/lib/auth/session";
import { getAccount, getNotificationSummary } from "@/lib/data/portal";
import { formatWhen } from "@/lib/format";

// private pages: keep them out of search results
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

// Every signed-in page sits inside this layout: it draws the sidebar and colours for the user's role.
// Signed-in check only; each tools folder below (organiser, vendor, admin) has its own role check.
export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const session = await requireSession();
  const [summary, account] = await Promise.all([getNotificationSummary(session), getAccount(session)]);

  // Worded and formatted here, on the server, so times are Sri Lanka time and the browser gets
  // plain strings. Rows link where the role has the page (vendors and freelancers so far); the
  // organiser's open screens from later slices (O22, O21, O13).
  const now = new Date();
  const notifications = {
    unread: summary.unread,
    latest: summary.latest.map((n) => ({
      id: n.id,
      title: n.shortTitle,
      detail: n.shortDetail,
      when: formatWhen(n.at, now, true),
      href: n.action.href,
    })),
  };

  return (
    <PortalShell role={session.role} notifications={notifications} account={account}>
      {children}
    </PortalShell>
  );
}
