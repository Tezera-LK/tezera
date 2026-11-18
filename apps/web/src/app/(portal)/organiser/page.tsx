import type { Metadata } from "next";
import PageHeader from "@/components/portal/PageHeader";
import EmptyState from "@/components/states/EmptyState";
import { requireRole } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Organiser tools" };

export default async function OrganiserToolsPage() {
  // this page's own check: the layout's check doesn't re-run when you move between pages inside it
  await requireRole("organiser");

  return (
    <>
      <PageHeader
        title="Organiser tools"
        description="Your events, hiring, promotion and payments."
      />
      <EmptyState
        title="Nothing here yet"
        description="Each tool in the sidebar comes from its own ticket and will appear here once it's built. An event's map, stalls, Q&A and board will open from that event."
      />
    </>
  );
}
