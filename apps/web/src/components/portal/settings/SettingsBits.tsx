"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { signOut } from "aws-amplify/auth";
import { routes } from "@/lib/routes";
import forms from "../forms.module.css";
import shell from "../PortalShell.module.css";

// The two parts of Settings (O32, O98) that need the browser.

// A form whose switches save as soon as they change; without JavaScript its own button saves.
export function AutoSaveForm({ action, children, saveLabel }: { action: (form: FormData) => Promise<void>; children: React.ReactNode; saveLabel: string }) {
  const ref = useRef<HTMLFormElement>(null);
  return (
    <form ref={ref} action={action} onChange={() => ref.current?.requestSubmit()}>
      {children}
      <button type="submit" className={shell.srOnly}>
        {saveLabel}
      </button>
    </form>
  );
}

// "Log out" in the confirm dialog (O98): signs out of Amplify and goes to the log-in page.
// In `next dev` with the "View as" box there's no Amplify session, so signing out has nothing to
// end and the box still picks the role.
export function LogOutButton({ label }: { label: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  return (
    <button
      type="button"
      className={`${forms.bigButton} ${forms.bigButtonPrimary}`}
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        try {
          await signOut();
        } catch {
          // Amplify isn't set up in this browser (the dev stand-in session); nothing to end
        }
        router.push(routes.logIn);
      }}
    >
      {label}
    </button>
  );
}
