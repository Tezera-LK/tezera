// Account roles as the signed-in portal sees them. Each account holds exactly one (PRD section 3).
//
// lib/roles.ts (the auth screens, EN-04) lists the four roles people can sign up as. The portal also
// needs admins, who are added by hand and never sign up, so this file adds "admin" on top of that list.
// The words match the Cognito groups in amplify/auth/resource.ts; group names are case-sensitive.
import { ROLES, ROLE_INFO } from "@/lib/roles";

export const PORTAL_ROLES = [...ROLES, "admin"] as const;

export type PortalRole = (typeof PORTAL_ROLES)[number];

export function isPortalRole(value: unknown): value is PortalRole {
  return typeof value === "string" && (PORTAL_ROLES as readonly string[]).includes(value);
}

// Shown in the portal header. The four sign-up roles reuse the auth screens' names, so both agree.
export const ROLE_LABEL: Record<PortalRole, string> = {
  attendee: ROLE_INFO.attendee.name,
  organiser: ROLE_INFO.organiser.name,
  vendor: ROLE_INFO.vendor.name,
  freelancer: ROLE_INFO.freelancer.name,
  admin: "Admin",
};

// Which brand palette (Palette.module.css) each role uses: att = attendee, org = organiser,
// ven = vendor + freelancer. Admins use the organiser palette (proposed).
export type Palette = "att" | "org" | "ven";

export const ROLE_PALETTE: Record<PortalRole, Palette> = {
  attendee: "att",
  organiser: "org",
  vendor: "ven",
  freelancer: "ven",
  admin: "org",
};
