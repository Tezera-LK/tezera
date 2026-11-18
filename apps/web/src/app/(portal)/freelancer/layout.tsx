import { requireRole } from "@/lib/auth/session";

// Gate for everything under /freelancer. Pages inside check again with requireRole().
// Freelancers shared /vendor until 18 Nov; their own address now matches their log-in screen, /freelancer/login.
export default async function FreelancerToolsLayout({ children }: { children: React.ReactNode }) {
  await requireRole("freelancer");
  return <>{children}</>;
}
