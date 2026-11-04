// ─────────────────────────────────────────────────────────────
// /<role> on its own (e.g. /vendor) -> that role's log in page
// File: src/app/(auth)/[role]/page.tsx
// ─────────────────────────────────────────────────────────────

import { redirect } from "next/navigation";

export default async function RoleHome({ params }: { params: Promise<{ role: string }> }) {
  const { role } = await params;
  redirect(`/${role}/login`);
}
