// ─────────────────────────────────────────────────────────────
// SESSION HELPERS: who is logged in, their role, and where they go next
// File: src/lib/session.ts
//
// Used by the log in and verify forms (after a successful log in), and by
// the pages that need someone logged in (setup, verification, home).
// ─────────────────────────────────────────────────────────────

import { fetchAuthSession, fetchUserAttributes, getCurrentUser, updateUserAttributes } from "aws-amplify/auth";
import { ROLE_INFO, isRole, type Role } from "./roles";

// How far through setting up a user is (stored on their Cognito account
// as "custom:setup", see amplify/auth/resource.ts):
//   ""        not started: send them to /<role>/setup
//   "profile" profile saved; organisers, vendors and freelancers still
//             need to upload documents: send them to /<role>/verification
//   "done"    finished (or skipped): send them to /<role>/home
export type SetupStage = "" | "profile" | "done";

// Everything the pages need to know about the logged-in user.
export type SignedInUser = {
  name: string;           // their email or phone number, for showing on screen
  groups: string[];       // Cognito groups, e.g. ["vendor"]
  setup: SetupStage;
};

// The Cognito groups of the logged-in user, e.g. ["vendor"].
// After log in, Cognito gives the browser TOKENS: signed pieces of text
// that prove who the user is. The access token lists the user's groups
// under "cognito:groups". Returns [] if nobody is logged in.
export async function getUserGroups(): Promise<string[]> {
  const session = await fetchAuthSession();
  const groups = session.tokens?.accessToken.payload["cognito:groups"];
  // The payload's values can be many types, so check it really is a list.
  return Array.isArray(groups) ? groups.map(String) : [];
}

// The logged-in user, or null if nobody is logged in on this browser.
export async function getSignedInUser(): Promise<SignedInUser | null> {
  try {
    await getCurrentUser(); // throws if nobody is logged in
    // The account's attributes: email, phone_number, custom:setup ...
    const attributes = await fetchUserAttributes();
    const setup = attributes["custom:setup"];
    return {
      name: attributes.email ?? attributes.phone_number ?? "",
      groups: await getUserGroups(),
      // Only accept the values we expect; anything else counts as "not started".
      setup: setup === "profile" || setup === "done" ? setup : "",
    };
  } catch {
    return null;
  }
}

// Save how far through setup the user is.
export async function saveSetupStage(stage: SetupStage): Promise<void> {
  await updateUserAttributes({ userAttributes: { "custom:setup": stage } });
}

// Where someone should go after logging in, given their setup stage.
export function pathAfterLogin(role: Role, setup: SetupStage): string {
  if (setup === "done") return `/${role}/home`;
  // Profile done but documents not sent yet (only roles that are verified).
  if (setup === "profile" && ROLE_INFO[role].verification) return `/${role}/verification`;
  return `/${role}/setup`;
}

// Run right after a successful log in. Checks the account belongs to this
// page's role, and works out where to go next.
//   { ok: true, path: "/vendor/setup" }             go there
//   { ok: false, actualRole: "vendor" }             wrong role's page
//   { ok: false, actualRole: null }                 no role group at all
export async function checkRoleAfterLogin(
  role: Role,
): Promise<{ ok: true; path: string } | { ok: false; actualRole: Role | null }> {
  const user = await getSignedInUser();
  if (user && user.groups.includes(role)) {
    return { ok: true, path: pathAfterLogin(role, user.setup) };
  }
  // .find(isRole) = the first group that's one of our four roles.
  return { ok: false, actualRole: user?.groups.find(isRole) ?? null };
}

// "an organiser", "an attendee", "a vendor": "an" before a vowel sound.
export function roleWithArticle(role: Role): string {
  const name = ROLE_INFO[role].name.toLowerCase();
  return `${/^[aeiou]/.test(name) ? "an" : "a"} ${name}`;
}
