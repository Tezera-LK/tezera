import { requireRole } from "@/lib/auth/session";

// Gate for everything under /vendor. "vendor" is the URL word for vendors AND freelancers: the
// Figma freelancer file is the vendor file without stalls, so both share these pages. Their Cognito
// groups stay separate, so both are listed. Pages inside check again with requireRole().
export default async function VendorToolsLayout({ children }: { children: React.ReactNode }) {
  await requireRole("vendor", "freelancer");
  return <>{children}</>;
}
