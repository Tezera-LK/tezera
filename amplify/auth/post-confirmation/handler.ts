// ─────────────────────────────────────────────────────────────
// POST-CONFIRMATION FUNCTION: runs after someone enters a correct code
// File: amplify/auth/post-confirmation/handler.ts
//
// It puts the new user into the Cognito GROUP for their role, e.g.
// "vendor". From then on, the app and API check the group (inside the
// login token) to decide what the user may do.
// ─────────────────────────────────────────────────────────────

import type { PostConfirmationTriggerHandler } from "aws-lambda";
// The AWS SDK: the official library for calling AWS services from code.
import { AdminAddUserToGroupCommand, CognitoIdentityProviderClient } from "@aws-sdk/client-cognito-identity-provider";

const PUBLIC_ROLES = ["attendee", "organiser", "vendor", "freelancer"];

// Created once, outside the handler, so AWS can reuse it between calls.
const cognito = new CognitoIdentityProviderClient();

export const handler: PostConfirmationTriggerHandler = async (event) => {
  // This trigger also fires after a password reset
  // ("PostConfirmation_ConfirmForgotPassword"). Only act on new sign-ups.
  if (event.triggerSource !== "PostConfirmation_ConfirmSignUp") return event;

  const role = event.request.userAttributes["custom:role"];

  // Check again: only the four public roles, never "admin".
  if (role && PUBLIC_ROLES.includes(role)) {
    await cognito.send(
      new AdminAddUserToGroupCommand({
        UserPoolId: event.userPoolId, // Cognito tells us which user pool
        Username: event.userName,     // and which user
        GroupName: role,
      }),
    );
  }

  return event;
};
