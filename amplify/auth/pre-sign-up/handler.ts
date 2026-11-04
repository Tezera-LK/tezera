// ─────────────────────────────────────────────────────────────
// PRE-SIGN-UP FUNCTION: runs in AWS just BEFORE an account is created
// File: amplify/auth/pre-sign-up/handler.ts
//
// The web form already checks these things, but anyone could skip the
// browser and call Cognito directly. This is the check that can't be
// skipped. Throwing an error stops the sign-up, and the message reaches
// the app as "PreSignUp failed with error <message>".
// ─────────────────────────────────────────────────────────────

// Types for Cognito trigger events, from the @types/aws-lambda package.
import type { PreSignUpTriggerHandler } from "aws-lambda";

// The four roles people may sign up as. "admin" is deliberately missing.
// Must match ROLES in apps/web/src/lib/roles.ts.
const PUBLIC_ROLES = ["attendee", "organiser", "vendor", "freelancer"];

// Age rules (PRD AC-01, proposed). Must match apps/web/src/lib/validation.ts.
const MIN_AGE = 16;
const ADULT_AGE = 18;

// Same calculation as getAge() in the web app: whole years, taking one
// off if this year's birthday hasn't happened yet. null = not a real date.
function getAge(dob: string, today = new Date()): number | null {
  const [year, month, day] = dob.split("-").map(Number);
  if (!year || !month || !day) return null;
  let age = today.getFullYear() - year;
  const monthNow = today.getMonth() + 1;
  if (monthNow < month || (monthNow === month && today.getDate() < day)) age -= 1;
  return age >= 0 ? age : null;
}

// A handler is the function AWS calls. "event" holds what Cognito sends,
// including the attributes from the sign-up form. Returning the event
// means "carry on".
export const handler: PreSignUpTriggerHandler = async (event) => {
  // Google sign-ups (triggerSource "PreSignUp_ExternalProvider") don't send
  // a role or birthday; they answer those on a setup screen later.
  if (event.triggerSource === "PreSignUp_ExternalProvider") return event;

  const attributes = event.request.userAttributes;

  // 1. The role must be one of the public four.
  const role = attributes["custom:role"];
  if (!role || !PUBLIC_ROLES.includes(role)) {
    throw new Error("Pick an account type to sign up.");
  }

  // 2. Age: 16 or over; 16 and 17 need the guardian tick.
  const age = attributes.birthdate ? getAge(attributes.birthdate) : null;
  if (age === null) throw new Error("Enter your date of birth.");
  if (age < MIN_AGE) throw new Error(`You need to be ${MIN_AGE} or older to join Tezera.`);
  if (age < ADULT_AGE && attributes["custom:guardian"] !== "yes") {
    throw new Error("A parent or guardian needs to agree before you can join.");
  }

  return event;
};
