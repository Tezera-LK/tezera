// ─────────────────────────────────────────────────────────────
// OLD ADDRESS: /<role>/home -> /dashboard
// File: src/app/(auth)/[role]/home/page.tsx
//
// People used to land here after logging in, on a stand-in home page.
// The portal's dashboard (EN-06) is the real one now: log in, setup and
// verification all go there. This keeps old links working.
// ─────────────────────────────────────────────────────────────

import { redirect } from "next/navigation";

import { routes } from "@/lib/routes";

export default function OldHomePage() {
  redirect(routes.dashboard);
}
