import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth/session";
import { routes } from "@/lib/routes";

// /vendor on its own: the sidebar has no "tools" page, so the first tool, Booking requests, stands in.
export default async function VendorToolsPage() {
  await requireRole("vendor", "freelancer");
  redirect(routes.vendorArea.requests);
}
