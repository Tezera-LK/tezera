// Development-only "View as" switch for the portal. It only exists in `next dev` while there is no user
// pool to sign in to (CI's placeholder amplify_outputs.json; see VIEW_AS in lib/auth/cognito.ts).
// Once `pnpm sandbox` has written a real amplify_outputs.json, you sign in for real instead.
// Shared by the server (lib/auth/session.ts) and the switcher in the corner, so it must not import server-only code.
import type { PortalRole } from "@/lib/portal-roles";

export const DEV_ROLE_COOKIE = "tezera-dev-role";

// "none" = signed in but not in any group yet (what a failed sign-up trigger would look like)
export type DevRole = PortalRole | "none";

export const DEV_ROLE_DEFAULT: DevRole = "organiser";

// shown in the account menu instead of an email address
export const VIEW_AS_NAME = "View as (development only)";
