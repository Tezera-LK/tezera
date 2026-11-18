// Who is signed in, read from the Cognito tokens that Amplify keeps in cookies.
// Shared by src/proxy.ts (is anyone signed in?) and lib/auth/session.ts (who, and in which role?),
// so it must not import "server-only", which proxy code can't load.
import type { AmplifyContext } from "aws-amplify";
import { hasUserPool } from "@/lib/amplify/server";
import { isPortalRole, type PortalRole } from "@/lib/portal-roles";

export type Session = {
  userId: string;
  // null = signed in, but not in exactly one role group (each account should be in exactly one)
  role: PortalRole | null;
  // the email address or phone number they log in with, for the account menu
  name: string;
};

// `next dev` with CI's placeholder amplify_outputs.json: there is no user pool, so nobody can sign in.
// The development-only "View as" box then picks the role instead (lib/auth/dev-role.ts). It is off in
// production builds, and off as soon as `pnpm sandbox` writes a real amplify_outputs.json.
export const VIEW_AS = process.env.NODE_ENV === "development" && !hasUserPool;

// The portal role from the access token's Cognito groups (amplify/auth/resource.ts).
// Each account should be in exactly one group (EN-04). Two rules for the cases that break that:
// - admin wins: admins are added to "admin" by hand, on top of the group they signed up with;
// - any other mix, or no group at all, gives no role: never "both".
export function roleFromGroups(groups: unknown): PortalRole | null {
  const known = Array.isArray(groups) ? groups.filter(isPortalRole) : [];
  if (known.includes("admin")) return "admin";
  return known.length === 1 ? known[0] : null;
}

// Use inside runWithAmplifyServerContext (lib/amplify/server.ts).
// Tokens only: getTokens() checks their signature, refreshes them once they've expired, and returns
// nothing when nobody is signed in. fetchAuthSession() would also ask the identity pool for AWS
// credentials, which costs a network call on every page and isn't needed to know who's signed in.
export async function readSession(ctx: AmplifyContext): Promise<Session | null> {
  let tokens;
  try {
    tokens = await ctx.getTokens({ forceRefresh: false });
  } catch {
    // the tokens couldn't be refreshed (revoked, user deleted, Cognito unreachable): treat as signed out
    return null;
  }
  if (!tokens) return null;

  const access = tokens.accessToken.payload;
  const id = tokens.idToken?.payload;
  return {
    userId: String(access.sub),
    role: roleFromGroups(access["cognito:groups"]),
    name: typeof id?.email === "string" ? id.email : typeof id?.phone_number === "string" ? id.phone_number : "",
  };
}
