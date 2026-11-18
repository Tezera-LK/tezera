"use client";

import { useRouter } from "next/navigation";
import { DEV_ROLE_COOKIE, type DevRole } from "@/lib/auth/dev-role";
import { PORTAL_ROLES, ROLE_LABEL } from "@/lib/portal-roles";
import styles from "./PortalShell.module.css";

// Development only (PortalShell renders it only under `next dev`): choose which role the stand-in
// session in lib/auth/session.ts gives you. Deleted in Phase B, when real sign-in arrives.
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
