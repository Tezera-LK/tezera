import { requireRole } from "@/lib/auth/session";

// Gate for everything under /organiser. Pages inside check again with requireRole().
export default async function OrganiserToolsLayout({ children }: { children: React.ReactNode }) {
  await requireRole("organiser");
  return <>{children}</>;
}
