import { requireRole } from "@/lib/auth/session";

// Gate for everything under /admin. Pages inside check again with requireRole().
export default async function AdminToolsLayout({ children }: { children: React.ReactNode }) {
  await requireRole("admin");
  return <>{children}</>;
}
