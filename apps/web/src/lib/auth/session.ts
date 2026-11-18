import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { runWithAmplifyServerContext } from "@/lib/amplify/server";
import { VIEW_AS, readSession, type Session } from "@/lib/auth/cognito";
import { DEV_ROLE_COOKIE, DEV_ROLE_DEFAULT, VIEW_AS_NAME } from "@/lib/auth/dev-role";
import { isPortalRole, type PortalRole } from "@/lib/portal-roles";
import { routes } from "@/lib/routes";

export type { Session };
export { VIEW_AS };

// Who is signed in, or null for a visitor. React cache(): many calls during one request = one lookup.
//
// Reads the Cognito tokens that Amplify keeps in cookies (EN-04-T4; docs/learning/web-portal-shell.md,
// Decision 1c). src/proxy.ts has already checked them and refreshed them if they had expired, and
// Next.js hands the refreshed cookies on to this render.
// `next dev` without a user pool (CI's placeholder amplify_outputs.json): the role picked in the
// "View as" box, bottom-right, instead (organiser by default). Never in production builds.
export const getSession = cache(async (): Promise<Session | null> => {
  if (VIEW_AS) {
    const picked = (await cookies()).get(DEV_ROLE_COOKIE)?.value ?? DEV_ROLE_DEFAULT;
    return { userId: "view-as", role: isPortalRole(picked) ? picked : null, name: VIEW_AS_NAME };
  }

  return runWithAmplifyServerContext({
    nextServerContext: { cookies },
    operation: readSession,
  });
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
