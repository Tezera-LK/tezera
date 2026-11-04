// ─────────────────────────────────────────────────────────────
// PRE-SIGN-UP FUNCTION: settings
// File: amplify/auth/pre-sign-up/resource.ts
//
// defineFunction tells Amplify to deploy handler.ts as an AWS Lambda
// function. resourceGroupName: "auth" deploys it together with the auth
// resources, which avoids a "circular dependency" error (auth needs the
// function, and the function belongs to auth).
// ─────────────────────────────────────────────────────────────

import { defineFunction } from "@aws-amplify/backend";

export const preSignUp = defineFunction({
  name: "pre-sign-up",
  resourceGroupName: "auth",
});
