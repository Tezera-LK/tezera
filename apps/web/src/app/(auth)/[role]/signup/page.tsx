// ─────────────────────────────────────────────────────────────
// SIGN-UP PAGE: /<role>/signup, e.g. /vendor/signup
// File: src/app/(auth)/[role]/signup/page.tsx
// The role cards on this page move between /attendee/signup,
// /organiser/signup, /vendor/signup and /freelancer/signup.
// ─────────────────────────────────────────────────────────────

import SignUpForm from "@/components/auth/SignUpForm";
import { ROLE_INFO, type Role } from "@/lib/roles";

type Props = { params: Promise<{ role: string }> };

export async function generateMetadata({ params }: Props) {
  const role = (await params).role as Role;
  return { title: `${ROLE_INFO[role].name} sign up` };
}

export default async function SignUpPage({ params }: Props) {
  const role = (await params).role as Role;
  return <SignUpForm role={role} />;
}
