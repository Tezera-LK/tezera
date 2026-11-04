// ─────────────────────────────────────────────────────────────
// VERIFY PAGE: /<role>/verify?to=...&via=email|phone&mode=signup|login
// File: src/app/(auth)/[role]/verify/page.tsx
//
// The sign-up and log in forms send people here with SEARCH PARAMS (the
// part of the address after "?"): where the code went, and whether it's
// confirming a new account (signup) or a phone log in (login).
// ─────────────────────────────────────────────────────────────

import VerifyForm from "@/components/auth/VerifyForm";
import type { Role } from "@/lib/roles";

export const metadata = { title: "Verify your account" };

type Props = {
  params: Promise<{ role: string }>;
  searchParams: Promise<{ to?: string; via?: string; mode?: string }>; // also a Promise in Next.js 15+
};

export default async function VerifyPage({ params, searchParams }: Props) {
  const role = (await params).role as Role;
  const { to, via, mode } = await searchParams;

  // Only accept the values we expect; anything else gets the default.
  return (
    <VerifyForm
      role={role}
      destination={to}
      via={via === "phone" ? "phone" : "email"}
      mode={mode === "login" ? "login" : "signup"}
    />
  );
}
