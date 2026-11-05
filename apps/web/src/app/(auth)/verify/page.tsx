// ─────────────────────────────────────────────────────────────
// OLD ADDRESS: /verify -> /attendee/verify (keeping ?to=...&via=...)
// File: src/app/(auth)/verify/page.tsx
// ─────────────────────────────────────────────────────────────

import { redirect } from "next/navigation";

type OldVerifyPageProps = {
  searchParams: Promise<Record<string, string>>;
};

export default async function OldVerifyPage({ searchParams }: OldVerifyPageProps) {
  // Carry the search params over, so the code destination isn't lost.
  const params = new URLSearchParams(await searchParams);
  redirect(`/attendee/verify?${params}`);
}
