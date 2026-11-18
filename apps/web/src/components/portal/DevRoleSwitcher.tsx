"use client";

import { useRouter } from "next/navigation";
import { DEV_ROLE_COOKIE, type DevRole } from "@/lib/auth/dev-role";
import { PORTAL_ROLES, ROLE_LABEL } from "@/lib/portal-roles";
import styles from "./PortalShell.module.css";

// Development only: PortalShell renders it only in `next dev` without a user pool (VIEW_AS in
// lib/auth/cognito.ts), where nobody can sign in. It picks the role lib/auth/session.ts gives you.
// With a real amplify_outputs.json (`pnpm sandbox`) you sign in for real and this box disappears.
export default function DevRoleSwitcher({ current }: { current: DevRole }) {
  const router = useRouter();

  function viewAs(role: DevRole) {
    document.cookie = `${DEV_ROLE_COOKIE}=${role}; path=/; SameSite=Lax`;
    // re-render the server side with the new role; a tools page you can no longer use sends you to the dashboard
    router.refresh();
  }

  return (
    <label className={styles.devSwitch}>
      View as (development only)
      <select value={current} onChange={(event) => viewAs(event.target.value as DevRole)}>
        {PORTAL_ROLES.map((role) => (
          <option key={role} value={role}>
            {ROLE_LABEL[role]}
          </option>
        ))}
        <option value="none">No role yet</option>
      </select>
    </label>
  );
}
