// ─────────────────────────────────────────────────────────────
// POST-CONFIRMATION FUNCTION: settings
// File: amplify/auth/post-confirmation/resource.ts
// (See pre-sign-up/resource.ts for what defineFunction does.)
// ─────────────────────────────────────────────────────────────

import { defineFunction } from "@aws-amplify/backend";

export const postConfirmation = defineFunction({
  name: "post-confirmation",
  resourceGroupName: "auth",
});
