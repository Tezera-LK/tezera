// ─────────────────────────────────────────────────────────────
// GOOGLE BUTTON: "Continue with Google"
// File: src/components/auth/GoogleButton.tsx
//
// Every role can use Google (team decision). In the Google step the parent form
// passes an onClick that calls Amplify's signInWithRedirect({ provider: "Google" }).
// ─────────────────────────────────────────────────────────────

import Button from "./Button";

type GoogleButtonProps = {
  onClick?: () => void;   // a function with no inputs that returns nothing
  disabled?: boolean;
};

export default function GoogleButton({ onClick, disabled }: GoogleButtonProps) {
  return (
    <Button variant="outline" onClick={onClick} disabled={disabled}>
      Continue with Google
    </Button>
  );
}
