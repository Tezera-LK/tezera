import type { Metadata } from "next";
import PageHeader from "@/components/portal/PageHeader";
import EmptyState from "@/components/states/EmptyState";
import { requireRole } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Admin tools" };

export default async function AdminToolsPage() {
  // this page's own check: the layout's check doesn't re-run when you move between pages inside it
  await requireRole("admin");

  return (
    <>
      <PageHeader
        title="Admin tools"
        description="Verification requests, reports, moderation and users."
      />
      <EmptyState
        title="Nothing here yet"
        description="Each tool in the sidebar comes from its own ticket and will appear here once it's built."
      />
    </>
  );
}
