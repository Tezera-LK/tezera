// ─────────────────────────────────────────────────────────────
// CONFIGURE AMPLIFY: connects the web app to our AWS backend
// File: src/components/ConfigureAmplify.tsx
//
// amplify_outputs.json is written by `npx ampx sandbox` (your own test
// backend) or by Amplify Hosting when it deploys a branch. It holds the
// user pool's id, region and settings, so the Amplify library knows
// which Cognito to talk to. It's in .gitignore: every developer and
// every branch has its own.
//
// If the file is missing, the build stops with "Module not found:
// amplify_outputs.json". Run the sandbox first (see the notes).
// ─────────────────────────────────────────────────────────────

// Amplify keeps login tokens in the browser, so this is a Client Component.
"use client";

import { Amplify } from "aws-amplify";
// The JSON file sits in apps/web, three folders up from this file:
// components -> src -> web. resolveJsonModule in tsconfig allows importing JSON.
import outputs from "../../amplify_outputs.json";

// Runs once, when this file is first loaded in the browser.
// ssr: true keeps the login tokens in COOKIES instead of the browser's
// localStorage. Cookies go to the server with every request, so the
// portal's server code (src/proxy.ts, lib/auth/session.ts) can see who is
// logged in and which role group they're in (EN-04-T4).
Amplify.configure(outputs, { ssr: true });

// Renders nothing. Its only job is to make sure the line above has run
// before any form calls Amplify. The (auth)/[role] layout and the portal
// (components/portal/PortalShell.tsx, for Log out) include it.
export default function ConfigureAmplify() {
  return null;
}
