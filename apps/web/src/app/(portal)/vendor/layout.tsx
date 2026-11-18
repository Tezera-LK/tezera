import { requireRole } from "@/lib/auth/session";

// Gate for everything under /vendor. Pages inside check again with requireRole().
// Vendors only: freelancers have their own tools at /freelancer (since 18 Nov), matching /freelancer/login.
export default async function VendorToolsLayout({ children }: { children: React.ReactNode }) {
  await requireRole("vendor");
  return <>{children}</>;
}
