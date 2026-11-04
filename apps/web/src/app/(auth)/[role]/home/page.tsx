// ─────────────────────────────────────────────────────────────
// HOME PAGE: /<role>/home, where people land after logging in
// File: src/app/(auth)/[role]/home/page.tsx
//
// A stand-in until the real home pages exist (attendee feed, organiser
// dashboard, vendor home). It shows who's logged in, links back to setup
// and verification, and a Log out button, so the whole flow can be tested.
// ─────────────────────────────────────────────────────────────

import HomePanel from "@/components/auth/HomePanel";
import { ROLE_INFO, type Role } from "@/lib/roles";

type Props = { params: Promise<{ role: string }> };

export async function generateMetadata({ params }: Props) {
  const role = (await params).role as Role;
  return { title: `${ROLE_INFO[role].name} home` };
}

export default async function HomePage({ params }: Props) {
  const role = (await params).role as Role;
  return <HomePanel role={role} />;
}
