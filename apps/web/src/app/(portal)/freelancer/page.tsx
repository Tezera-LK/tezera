import type { Metadata } from "next";
import PageHeader from "@/components/portal/PageHeader";
import EmptyState from "@/components/states/EmptyState";
import { requireRole } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Freelancer tools" };

export default async function FreelancerToolsPage() {
  // this page's own check: the layout's check doesn't re-run when you move between pages inside it
  await requireRole("freelancer");

  return (
    <>
      <PageHeader
        title="Freelancer tools"
        description="Booking requests, job posts, your bookings and payments."
      />
      <EmptyState
        title="Nothing here yet"
        description="Each tool in the sidebar comes from its own ticket and will appear here once it's built."
      />
    </>
  );
}
