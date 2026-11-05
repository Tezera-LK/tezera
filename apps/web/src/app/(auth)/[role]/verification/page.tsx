// ─────────────────────────────────────────────────────────────
// VERIFICATION PAGE: /<role>/verification (organisers, vendors, freelancers)
// File: src/app/(auth)/[role]/verification/page.tsx
//
// Attendees aren't verified, so /attendee/verification is a 404.
// Only for someone logged in with this role (<RequireUser>).
// Later this page can also live inside the dashboard (designs O28, V18).
// ─────────────────────────────────────────────────────────────

import { notFound } from "next/navigation";

import RequireUser from "@/components/auth/RequireUser";
import VerificationForm from "@/components/auth/VerificationForm";
import { ROLE_INFO, type Role } from "@/lib/roles";

export const metadata = { title: "Get verified" };

type Props = { params: Promise<{ role: string }> };

export default async function VerificationPage({ params }: Props) {
  const role = (await params).role as Role;

  // No verification settings for this role (attendees) = no page.
  if (!ROLE_INFO[role].verification) notFound();

  return (
    <div data-wide>
      <RequireUser role={role}>
        <VerificationForm role={role} />
      </RequireUser>
    </div>
  );
}
