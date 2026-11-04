// ─────────────────────────────────────────────────────────────
// LOG IN PAGE: /<role>/login, e.g. /organiser/login
// File: src/app/(auth)/[role]/login/page.tsx
//
// Pages are thin: they read the role from the address and show the form.
// The layout one folder up adds the colours and the brand panel.
// ?verified=1 (from the verify page) shows "Your account is verified".
// ─────────────────────────────────────────────────────────────

import LoginForm from "@/components/auth/LoginForm";
import { ROLE_INFO, type Role } from "@/lib/roles";

// The layout has already checked the word is a real role (others 404),
// so "as Role" is safe. searchParams is also a Promise in Next.js 15+.
type Props = {
  params: Promise<{ role: string }>;
  searchParams: Promise<{ verified?: string }>;
};

// generateMetadata: like "export const metadata", but worked out per
// page, so the tab can say "Organiser log in | Tezera".
export async function generateMetadata({ params }: Props) {
  const role = (await params).role as Role;
  return { title: `${ROLE_INFO[role].name} log in` };
}

export default async function LoginPage({ params, searchParams }: Props) {
  const role = (await params).role as Role;
  const { verified } = await searchParams;
  return <LoginForm role={role} verified={verified === "1"} />;
}
