// ─────────────────────────────────────────────────────────────
// THE TEZERA BACKEND: the list of everything Amplify deploys to AWS
// File: amplify/backend.ts (repo root, shared by the web and mobile apps)
//
// Amplify Gen 2 reads this file when you run `npx ampx sandbox` (your own
// test copy in AWS) or when Amplify Hosting deploys a branch. Each
// resource lives in its own folder and is added here.
//
// For now there's one: auth (Amazon Cognito: accounts, codes, log in,
// role groups). Storage for documents and logos comes later.
// ─────────────────────────────────────────────────────────────

import { defineBackend } from "@aws-amplify/backend";
import { auth } from "./auth/resource";

const backend = defineBackend({
  auth,
});

// ── A SETTING AMPLIFY DOESN'T EXPOSE ─────────────────────────
// Phone log in without a password (passwordless, see auth/resource.ts)
// needs Cognito's "Essentials" feature plan. New user pools usually get it
// by default; setting it here makes sure. cfnResources gives access to the
// raw AWS settings Amplify generates (the "escape hatch").
// Essentials is free for the first 10,000 monthly active users (check
// current AWS pricing before the pilot).
backend.auth.resources.cfnResources.cfnUserPool.userPoolTier = "ESSENTIALS";
