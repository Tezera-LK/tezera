import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { readVerifiedToken } from "@/lib/auth/amplify-server";
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
// - preview mode (`next dev`, or a build with PORTAL_PREVIEW=1: lib/preview.ts): you are signed in as the
//   role picked in the "View as" box, bottom-right (organiser by default). No Cognito involved.
// - every other build: the Cognito login cookies are read and verified (lib/auth/amplify-server.ts). The
//   role is the account's Cognito group. No valid login = null, so portal pages send you to the login page.
export const getSession = cache(async (): Promise<Session | null> => {
  // read cookies in every mode so portal pages always render per request
  const cookieStore = await cookies();

  if (previewMode) {
    const picked = cookieStore.get(DEV_ROLE_COOKIE)?.value ?? DEV_ROLE_DEFAULT;
    return { userId: "dev-user", role: isPortalRole(picked) ? picked : null };
  }

  const token = await readVerifiedToken();
  if (!token) return null;
  return { userId: token.sub, role: token.groups.find(isPortalRole) ?? null };
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
