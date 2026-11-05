// ─────────────────────────────────────────────────────────────
// AUTH ERRORS: turning Cognito's error names into friendly messages
// File: src/lib/authErrors.ts
//
// When an Amplify call fails, it throws an error whose "name" says what
// went wrong, e.g. "UsernameExistsException". Users shouldn't see those
// names, so every form passes errors through authErrorMessage().
// ─────────────────────────────────────────────────────────────

// error is "unknown" because anything can be thrown in JavaScript. We
// check it's a real Error before reading .name and .message.
export function authErrorMessage(error: unknown): string {
  const name = error instanceof Error ? error.name : "";
  const message = error instanceof Error ? error.message : "";

  // switch picks the case whose value matches "name".
  switch (name) {
    // ── sign up ──
    case "UsernameExistsException":
      return "There's already an account with this email or phone number. Log in instead.";
    case "InvalidPasswordException":
      return "That password doesn't meet the rules: 8+ characters with a number, a capital, a small letter and a symbol.";
    // Our pre-sign-up function's own message, e.g. "You need to be 16 or
    // older". Cognito wraps it: "PreSignUp failed with error <message>."
    case "UserLambdaValidationException":
      return message.replace(/^PreSignUp failed with error /, "").replace(/\.\.$/, ".");

    // ── codes ──
    case "CodeMismatchException":
      return "That code didn't match. Check it and try again.";
    case "ExpiredCodeException":
      return "That code has expired. Send a new one.";
    case "CodeDeliveryFailureException":
      return "We couldn't send the code. Check the email address or phone number.";

    // ── log in ──
    // Same message for both on purpose: saying "no such user" would tell
    // attackers which emails have accounts.
    case "NotAuthorizedException":
    case "UserNotFoundException":
      return "Wrong email, phone number or password.";

    // ── too many tries ──
    case "LimitExceededException":
    case "TooManyRequestsException":
    case "TooManyFailedAttemptsException":
      return "Too many tries. Wait a few minutes and try again.";

    // amplify_outputs.json has no auth section yet: the sandbox hasn't
    // finished deploying (the file then only says { "version": ... }).
    case "AuthUserPoolException":
    case "InvalidUserPoolConfigurationException":
      return "The app isn't connected to its login backend yet. Start the sandbox and wait for it to finish deploying.";

    case "UserNotConfirmedException":
      return "This account hasn't been verified yet. Sign up again with the same details to get a new code.";

    case "NetworkError":
      return "We can't reach Tezera. Check your internet connection.";

    default:
      // Show unexpected errors in the browser console for debugging.
      console.error(error);
      return "Something went wrong. Please try again.";
  }
}
