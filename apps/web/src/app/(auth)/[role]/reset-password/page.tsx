// ─────────────────────────────────────────────────────────────
// RESET PASSWORD PAGE: /<role>/reset-password
// File: src/app/(auth)/[role]/reset-password/page.tsx
// Linked from "Forgot password?" on that role's log in page.
// ─────────────────────────────────────────────────────────────

import ResetPasswordForm from "@/components/auth/ResetPasswordForm";
import type { Role } from "@/lib/roles";

export const metadata = { title: "Reset your password" };

type Props = { params: Promise<{ role: string }> };

export default async function ResetPasswordPage({ params }: Props) {
  const role = (await params).role as Role;
  return <ResetPasswordForm role={role} />;
}
