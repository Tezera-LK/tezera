// ─────────────────────────────────────────────────────────────
// REQUIRE USER: only show a page to someone logged in with this role
// File: src/components/auth/RequireUser.tsx
//
//   <RequireUser role="vendor"> ...the page... </RequireUser>
// Wraps the setup and verification pages. While it checks, it
// shows "Checking your account…"; if nobody (or another role) is logged
// in, it sends them to /<role>/login. Also exports useSignedInUser() for
// components that need the user's details.
// ─────────────────────────────────────────────────────────────

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import formStyles from "./Form.module.css";
import { getSignedInUser, type SignedInUser } from "@/lib/session";
import type { Role } from "@/lib/roles";

// A CUSTOM HOOK: a function starting with "use" that uses other hooks.
// It returns the logged-in user once known (null while checking), and
// redirects to log in if there isn't one.
export function useSignedInUser(role: Role): SignedInUser | null {
  const router = useRouter();
  const [user, setUser] = useState<SignedInUser | null>(null);

  useEffect(() => {
    // "cancelled" stops us updating state if the page closed meanwhile.
    let cancelled = false;
    getSignedInUser().then((found) => {
      if (cancelled) return;
      if (found && found.groups.includes(role)) setUser(found);
      else router.replace(`/${role}/login`);
    });
    return () => {
      cancelled = true;
    };
  }, [role, router]);

  return user;
}

export default function RequireUser({ role, children }: { role: Role; children: React.ReactNode }) {
  const user = useSignedInUser(role);

  // Same on the server and in the browser at first, so no hydration error.
  if (!user) {
    return (
      <p className={formStyles.hint} role="status">
        Checking your account…
      </p>
    );
  }
  return <>{children}</>;
}
