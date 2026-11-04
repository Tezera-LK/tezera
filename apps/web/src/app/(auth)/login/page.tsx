// ─────────────────────────────────────────────────────────────
// OLD ADDRESS: /login -> /attendee/login
// File: src/app/(auth)/login/page.tsx
//
// Log in now lives at /<role>/login (e.g. /vendor/login). This page
// keeps old links working by sending people to the attendee version.
// redirect() stops this page and tells the browser to go elsewhere.
// ─────────────────────────────────────────────────────────────

import { redirect } from "next/navigation";

export default function OldLoginPage() {
  redirect("/attendee/login");
}
