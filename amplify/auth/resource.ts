// ─────────────────────────────────────────────────────────────
// AUTH: how Tezera's Cognito user pool is set up
// File: amplify/auth/resource.ts
//
// Amplify turns this into a real Cognito user pool in AWS. The web app
// (and later the Flutter app) talk to it through the Amplify libraries.
//
// IMPORTANT: some settings can't be changed once the user pool exists
// (how people sign in, and the required attributes). Changing them later
// means a new user pool and everyone signing up again. In your own
// sandbox that's fine; in the real one it isn't. So decide them now.
// ─────────────────────────────────────────────────────────────

import { defineAuth } from "@aws-amplify/backend";
import { preSignUp } from "./pre-sign-up/resource";
import { postConfirmation } from "./post-confirmation/resource";

export const auth = defineAuth({
  // ── HOW PEOPLE SIGN IN ─────────────────────────────────────
  // Email OR phone number as the username (PRD AC-01).
  //   email: email + password. A 6-digit code confirms the address at sign-up.
  //   phone: NO password. otpLogin = "one-time password log in": every log
  //          in texts a fresh 6-digit code instead (Cognito's "passwordless"
  //          sign-in, flow USER_AUTH with the SMS_OTP challenge).
  // (Email codes instead of passwords would need Amazon SES set up first.)
  // Google comes in a later step (it needs a Google Cloud project first):
  //   externalProviders: { google: { clientId: secret("GOOGLE_CLIENT_ID"), ... } }
  loginWith: {
    email: true,
    phone: { otpLogin: true },
  },

  // ── EXTRA INFORMATION STORED ON EACH ACCOUNT ──────────────
  // Nothing is "required", on purpose: Google users won't give us a
  // phone number or birthday, and required attributes can never change.
  userAttributes: {
    // Amplify makes BOTH email and phone_number "required" when you log in
    // with either. Then an email sign-up fails, because it has no phone
    // number ("phone_number is required"). Turning that off here means each
    // person only needs the one they signed up with.
    email: { required: false, mutable: true },
    phoneNumber: { required: false, mutable: true },
    // A STANDARD attribute Cognito already knows. "YYYY-MM-DD".
    birthdate: { required: false, mutable: true },

    // CUSTOM attributes always start with "custom:".
    // The role picked at sign-up. mutable: false = can only be set at
    // sign-up, so nobody can change their own role later.
    // The role is only a REQUEST: post-confirmation checks it before
    // adding the user to a group (and never to "admin").
    "custom:role": { dataType: "String", mutable: false, maxLen: 20 },

    // "yes" when a 16 or 17 year old ticked "a parent or guardian agreed".
    "custom:guardian": { dataType: "String", mutable: true, maxLen: 3 },

    // How far through setting up the user is, so log in knows where to send
    // them: "" (not started), "profile" (profile saved, verification next)
    // or "done". The web app writes it. Later our API will track this.
    "custom:setup": { dataType: "String", mutable: true, maxLen: 10 },
  },

  // ── ROLE GROUPS ────────────────────────────────────────────
  // One group per role. Pages and the API check the user's GROUP to
  // decide what they may do. Admins are added by hand in the AWS console.
  groups: ["attendee", "organiser", "vendor", "freelancer", "admin"],

  // ── LAMBDA TRIGGERS: our own code that Cognito runs ───────
  //   preSignUp:        before an account is created (age and role checks)
  //   postConfirmation: after the code is confirmed (adds the role group)
  triggers: {
    preSignUp,
    postConfirmation,
  },

  // Let the post-confirmation function add users to groups. Without
  // this permission AWS would refuse the request.
  access: (allow) => [allow.resource(postConfirmation).to(["addUserToGroup"])],
});
