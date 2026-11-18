import type { Metadata } from "next";
import PortalShell from "@/components/portal/PortalShell";
import { requireSession } from "@/lib/auth/session";

// private pages: keep them out of search results
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

// Every signed-in page sits inside this layout: it draws the sidebar and colours for the user's role.
// Signed-in check only; each tools folder below (organiser, vendor, admin) has its own role check.
export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const session = await requireSession();
  return <PortalShell role={session.role}>{children}</PortalShell>;
}
