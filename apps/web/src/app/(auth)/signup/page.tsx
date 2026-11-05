// ─────────────────────────────────────────────────────────────
// OLD ADDRESS: /signup -> /attendee/signup
// File: src/app/(auth)/signup/page.tsx
// Sign-up now lives at /<role>/signup. Picking a role card there moves
// to that role's page. This keeps old links working.
// ─────────────────────────────────────────────────────────────

import { redirect } from "next/navigation";

export default function OldSignUpPage() {
  redirect("/attendee/signup");
}
