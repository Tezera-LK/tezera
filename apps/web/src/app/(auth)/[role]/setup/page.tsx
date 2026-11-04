// ─────────────────────────────────────────────────────────────
// SETUP PAGE: /<role>/setup, the step after verifying
// File: src/app/(auth)/[role]/setup/page.tsx
//
// Each role sets up something different, so this page picks the form:
//   attendee            -> interests, district, organisers to follow
//   organiser           -> organiser profile
//   vendor / freelancer -> business or personal profile and services
// Only for someone logged in with this role (<RequireUser>).
// ─────────────────────────────────────────────────────────────

import RequireUser from "@/components/auth/RequireUser";
import AttendeeSetupForm from "@/components/auth/setup/AttendeeSetupForm";
import OrganiserSetupForm from "@/components/auth/setup/OrganiserSetupForm";
import ProviderSetupForm from "@/components/auth/setup/ProviderSetupForm";
import type { Role } from "@/lib/roles";

export const metadata = { title: "Set up your account" };

type Props = { params: Promise<{ role: string }> };

export default async function SetupPage({ params }: Props) {
  const role = (await params).role as Role;

  // data-wide asks the layout for the wider form column (see
  // AuthLayout.module.css). The conditions pick one form per role.
  return (
    <div data-wide>
      <RequireUser role={role}>
        {role === "attendee" && <AttendeeSetupForm />}
        {role === "organiser" && <OrganiserSetupForm />}
        {(role === "vendor" || role === "freelancer") && <ProviderSetupForm role={role} />}
      </RequireUser>
    </div>
  );
}
