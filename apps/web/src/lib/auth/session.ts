import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { DEV_ROLE_COOKIE, DEV_ROLE_DEFAULT } from "@/lib/auth/dev-role";
import { previewMode } from "@/lib/preview";
import { isPortalRole, type PortalRole } from "@/lib/portal-roles";
import { routes } from "@/lib/routes";

export type Session = {
  userId: string;
  // null = signed in, but not in any role group yet (each account should be in exactly one)
  role: PortalRole | null;
};

// Who is signed in, or null for a visitor. React cache(): many calls during one request = one lookup.
//
// STAND-IN until EN-04 (Cognito) exists. Phase B replaces the body with a real read of the Amplify
// session; the callers below don't change (docs/learning/web-portal-shell.md, Decisions 1c and 6).
// - preview mode (`next dev`, and dev.tezera.lk until sign-in is hosted: lib/preview.ts): you are signed
//   in as the role picked in the "View as" box, bottom-right (organiser by default).
// - other builds: nobody is signed in, so every portal page sends you to the login page.
export const getSession = cache(async (): Promise<Session | null> => {
  // read cookies in every mode, like the real version will, so portal pages always render per request
  const cookieStore = await cookies();
  if (!previewMode) return null;

  const picked = cookieStore.get(DEV_ROLE_COOKIE)?.value ?? DEV_ROLE_DEFAULT;
  return { userId: "dev-user", role: isPortalRole(picked) ? picked : null };
});

// Signed in, any role: the portal shell, /dashboard and pages every role shares.
export async function requireSession(): Promise<Session> {
  const session = await getSession();
  if (!session) redirect(routes.logIn);
  return session;
}

// Signed in with one of these roles: the role-only tools folders.
// Call it in the folder's layout.tsx AND in every page inside it. Layouts don't re-run when you move
// between the pages below them, so a layout check alone is not a security boundary.
export async function requireRole(...allowed: PortalRole[]): Promise<Session & { role: PortalRole }> {
  const session = await requireSession();
  const { role } = session;
  if (!role || !allowed.includes(role)) redirect(routes.dashboard);
  return { ...session, role };
}
