// Development-only "view as" switch for the portal, used until real sign-in (EN-04) exists.
// Shared by the server (lib/auth/session.ts) and the switcher in the sidebar, so it must not import server-only code.
import type { PortalRole } from "@/lib/portal-roles";

export const DEV_ROLE_COOKIE = "tezera-dev-role";

// "none" = signed in but not in any group yet (what a failed sign-up trigger would look like)
export type DevRole = PortalRole | "none";

export const DEV_ROLE_DEFAULT: DevRole = "organiser";
