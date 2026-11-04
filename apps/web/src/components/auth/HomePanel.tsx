// ─────────────────────────────────────────────────────────────
// HOME PANEL: the stand-in home page after logging in
// File: src/components/auth/HomePanel.tsx
//
// Shows who's logged in and their role, links to edit setup (and, for
// organisers, vendors and freelancers, verification), and Log out.
// Replace with the real home pages when they're built.
// ─────────────────────────────────────────────────────────────

"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signOut } from "aws-amplify/auth";

import Button from "./Button";
import formStyles from "./Form.module.css";
import { useSignedInUser } from "./RequireUser";
import { ROLE_INFO, type Role } from "@/lib/roles";
import { roleWithArticle } from "@/lib/session";

export default function HomePanel({ role }: { role: Role }) {
  const router = useRouter();
  // The logged-in user, or null while checking (or redirecting to log in).
  const user = useSignedInUser(role);
  const [busy, setBusy] = useState(false);

  async function handleLogOut() {
    setBusy(true);
    await signOut();
    router.push(`/${role}/login`);
  }

  if (!user) {
    return (
      <p className={formStyles.hint} role="status">
        Checking your account…
      </p>
    );
  }

  const isVerifiedRole = !!ROLE_INFO[role].verification;

  return (
    <div>
      <h2 className={formStyles.title}>You&apos;re logged in</h2>
      <p className={formStyles.subtitle}>
        {user.name}, as {roleWithArticle(role)}. Your home page comes next; for now you can check your setup here.
      </p>

      <div className={formStyles.form}>
        <div className={formStyles.card}>
          <h3 className={formStyles.cardTitle}>Your account</h3>
          <p className={formStyles.hint}>
            Setup: {user.setup === "done" ? "finished" : user.setup === "profile" ? "profile saved, verification next" : "not started"}
          </p>
          <p className={formStyles.metaRow}>
            <Link href={`/${role}/setup`}>{role === "attendee" ? "Edit your feed" : "Edit your profile"}</Link>
            {isVerifiedRole && (
              <>
                <span aria-hidden="true">·</span>
                <Link href={`/${role}/verification`}>Verification documents</Link>
              </>
            )}
          </p>
        </div>

        <Button variant="outline" onClick={handleLogOut} disabled={busy}>
          Log out
        </Button>
      </div>
    </div>
  );
}
