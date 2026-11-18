import { requireRole } from "@/lib/auth/session";

// Gate for everything under /vendor. "vendor" is the URL word for vendors AND freelancers
// (decided 3 Nov); their Cognito groups stay separate, so both are listed. Don't narrow it to "vendor".
// Pages inside check again with requireRole().
export default async function VendorToolsLayout({ children }: { children: React.ReactNode }) {
  await requireRole("vendor", "freelancer");
  return <>{children}</>;
}
