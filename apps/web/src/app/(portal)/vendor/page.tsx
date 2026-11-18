import type { Metadata } from "next";
import PageHeader from "@/components/portal/PageHeader";
import EmptyState from "@/components/states/EmptyState";
import { requireRole } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Vendor tools" };

export default async function VendorToolsPage() {
  // this page's own check: the layout's check doesn't re-run when you move between pages inside it
  const { role } = await requireRole("vendor", "freelancer");
  const isFreelancer = role === "freelancer";

  return (
    <>
      <PageHeader
        title={isFreelancer ? "Freelancer tools" : "Vendor tools"}
        description={
          isFreelancer
            ? "Booking requests, job posts, your bookings and payments."
            : "Booking requests, job posts, stalls, your bookings and payments."
        }
      />
      <EmptyState
        title="Nothing here yet"
        description="Each tool in the sidebar comes from its own ticket and will appear here once it's built."
      />
    </>
  );
}
