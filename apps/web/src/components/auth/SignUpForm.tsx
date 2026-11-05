// ─────────────────────────────────────────────────────────────
// SIGN-UP FORM: one form for every role
// File: src/components/auth/SignUpForm.tsx
// Designs: attendee C01, organiser O01, vendor V01 (+ the team's changes:
// email OR phone, date of birth with the 16+ rule, Google for everyone).
//
// HOW THE ROLE CARDS WORK
// The role comes from the web address (/organiser/signup). Clicking a
// different card moves to that role's sign-up page (/vendor/signup),
// so the layout swaps to that role's colours and panel wording.
//
// EMAIL OR PHONE
//   Email: the user picks a password (with a Show button).
//   Phone: NO password. Every log in texts them a code instead, so the
//          password boxes disappear as soon as the box looks like a number.
//
// WHAT HAPPENS ON "Create account"
// 1. Our checks run in the browser (friendly messages straight away).
// 2. Amplify's signUp() asks Cognito to create the account. Cognito runs
//    our pre-sign-up function (age and role checks again, which can't be
//    skipped) and sends a 6-digit code by email or SMS.
// 3. We move to /<role>/verify to type the code. After that the user is
//    logged in automatically and goes to /<role>/setup.
// ─────────────────────────────────────────────────────────────

"use client";

import { useState } from "react";
import Link from "next/link";
// useRouter (App Router version, from "next/navigation"): change page from code.
import { useRouter } from "next/navigation";
// signUp: the Amplify function that creates a Cognito account.
import { signUp } from "aws-amplify/auth";

import Button from "./Button";
import Divider from "./Divider";
import GoogleButton from "./GoogleButton";
import PasswordField from "./PasswordField";
import RoleCards from "./RoleCards";
import TextField from "./TextField";
import formStyles from "./Form.module.css";
import { ADULT_AGE, MIN_AGE, checkPassword, getAge, guessIdentifierKind, parseIdentifier } from "@/lib/validation";
import { authErrorMessage } from "@/lib/authErrors";
import { ROLE_INFO, type Role } from "@/lib/roles";

// One optional message per field, plus "form" for errors from Cognito.
type Errors = {
  identifier?: string;
  dob?: string;
  guardian?: string;
  password?: string;
  confirm?: string;
  form?: string;
};

export default function SignUpForm({ role }: { role: Role }) {
  const router = useRouter();

  // ── STATE ────────────────────────────────────────────────
  const [identifier, setIdentifier] = useState("");
  const [dob, setDob] = useState("");               // "YYYY-MM-DD" from the date picker
  const [guardian, setGuardian] = useState(false);  // the guardian tick box
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [errors, setErrors] = useState<Errors>({});
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);          // true while waiting for Cognito

  // ── DERIVED VALUES (worked out on every draw, never stored) ──
  const age = dob ? getAge(dob) : null;
  // The guardian tick box only appears for 16 and 17 year olds.
  const needsGuardian = age !== null && age >= MIN_AGE && age < ADULT_AGE;
  // Phone accounts have no password, so hide the password boxes.
  const usesPhone = guessIdentifierKind(identifier) === "phone";

  // ── PICKING A DIFFERENT ROLE CARD ────────────────────────
  function switchRole(next: Role) {
    // router.replace swaps the page without adding a Back-button step for
    // every card clicked. scroll: false keeps the page where it is.
    router.replace(`/${next}/signup`, { scroll: false });
  }

  // ── CHECKS: returns every problem (empty object = all good) ──
  function validate(): Errors {
    const found: Errors = {};

    if (!parseIdentifier(identifier)) {
      found.identifier = "Enter an email address or a phone number like 077 123 4567.";
    }

    if (!dob) {
      found.dob = "Enter your date of birth.";
    } else if (age === null) {
      found.dob = "Enter a real date of birth."; // impossible or future date
    } else if (age < MIN_AGE) {
      found.dob = `You need to be ${MIN_AGE} or older to join Tezera.`;
    } else if (needsGuardian && !guardian) {
      found.guardian = "Ask a parent or guardian, then tick this box.";
    }

    // Passwords only matter for email accounts.
    if (!usesPhone) {
      const passwordProblem = checkPassword(password); // a message, or null
      if (passwordProblem) found.password = passwordProblem;
      if (confirm !== password) found.confirm = "The passwords don't match.";
    }

    return found;
  }

  // ── WHEN "Create account" IS PRESSED ─────────────────────
  // "async" because it waits for Cognito with "await".
  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const found = validate();
    setErrors(found);
    if (Object.keys(found).length > 0) return;

    // "!" = "this can't be null": validate() already checked it.
    const parsed = parseIdentifier(identifier)!;

    setBusy(true);
    // try/catch: if anything inside "try" throws an error, the code jumps
    // to "catch" instead of crashing the page.
    try {
      await signUp({
        username: parsed.value, // "+94771234567" or "sanduni@example.com"
        // No password for phone accounts. "undefined" leaves it out.
        password: parsed.kind === "email" ? password : undefined,
        options: {
          userAttributes: {
            // The username must also be saved as its attribute, so Cognito
            // knows where to send the code. [key]: value is a COMPUTED KEY.
            [parsed.kind === "email" ? "email" : "phone_number"]: parsed.value,
            birthdate: dob,
            "custom:role": role,
            "custom:guardian": needsGuardian && guardian ? "yes" : "no",
          },
          // After the code is confirmed, log the user in automatically
          // (VerifyForm calls autoSignIn()), so they don't type it all again.
          // Phone accounts use Cognito's passwordless flow, "USER_AUTH".
          autoSignIn: parsed.kind === "phone" ? { authFlowType: "USER_AUTH" } : true,
        },
      });

      // Account created; Cognito has sent the code. On to verify.
      // URLSearchParams builds "?to=%2B94771234567&via=phone" safely.
      const params = new URLSearchParams({ to: parsed.value, via: parsed.kind, mode: "signup" });
      router.push(`/${role}/verify?${params}`);
    } catch (error) {
      setErrors({ form: authErrorMessage(error) });
      setBusy(false);
    }
    // (No setBusy(false) after success: the page is changing anyway.)
  }

  // ── GOOGLE ───────────────────────────────────────────────
  function handleGoogle() {
    // TODO (Google step): needs a Google Cloud project and externalProviders
    // in amplify/auth/resource.ts, then signInWithRedirect({ provider: "Google" }).
    setStatus(`Google sign-up isn't set up yet. Use email or phone for now.`);
  }

  return (
    <div>
      <h2 className={formStyles.title}>Create your account</h2>
      {/* Wording differs by role (see lib/roles.ts). */}
      <p className={formStyles.subtitle}>{ROLE_INFO[role].signupSubtitle}</p>

      <form className={formStyles.form} onSubmit={handleSubmit} noValidate>
        {/* The card for this page's role is picked; clicking another one
            moves to that role's sign-up page. */}
        <RoleCards value={role} onChange={switchRole} />

        <GoogleButton onClick={handleGoogle} disabled={busy} />

        <Divider />

        <TextField
          id="identifier"
          label="Email or phone number"
          type="text"
          inputMode="email"
          autoComplete="username"
          placeholder="sanduni@example.com or 077 123 4567"
          value={identifier}
          onChange={(e) => setIdentifier(e.target.value)}
          error={errors.identifier}
          hint="We'll send a code to check it's yours."
        />

        <TextField
          id="dob"
          label="Date of birth"
          type="date"              // the browser's date picker; value is "YYYY-MM-DD"
          autoComplete="bday"
          value={dob}
          onChange={(e) => setDob(e.target.value)}
          error={errors.dob}
          hint={`You need to be ${MIN_AGE} or older to join.`}
        />

        {/* Only for 16 and 17 year olds. */}
        {needsGuardian && (
          <div>
            <label className={formStyles.checkbox}>
              <input
                type="checkbox"
                checked={guardian}
                onChange={(e) => setGuardian(e.target.checked)}
                aria-invalid={!!errors.guardian}
                aria-describedby={errors.guardian ? "guardian-error" : undefined}
              />
              {/* &apos; = an apostrophe inside JSX text. */}
              <span>I&apos;m under 18 and a parent or guardian agreed to me joining.</span>
            </label>
            {errors.guardian && (
              <p id="guardian-error" className={formStyles.error} role="alert">
                {errors.guardian}
              </p>
            )}
          </div>
        )}

        {/* Email accounts choose a password; phone accounts get a code by
            text each time instead. */}
        {usesPhone ? (
          <p className={formStyles.note}>No password needed. We&apos;ll text you a code each time you log in.</p>
        ) : (
          <div className={formStyles.row}>
            <PasswordField
              id="password"
              label="Password"
              autoComplete="new-password"  // password managers suggest a strong one
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              error={errors.password}
              hint="8+ characters with a number, a capital, a small letter and a symbol."
            />
            <PasswordField
              id="confirm"
              label="Confirm password"
              autoComplete="new-password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              error={errors.confirm}
            />
          </div>
        )}

        <p className={formStyles.smallPrint}>By creating an account you agree to the Terms and Privacy Policy.</p>

        {/* An error from Cognito (e.g. account already exists). */}
        {errors.form && (
          <p className={formStyles.error} role="alert">
            {errors.form}
          </p>
        )}

        <Button type="submit" disabled={busy}>
          {busy ? "Creating your account…" : "Create account"}
        </Button>

        {status && (
          <p className={formStyles.status} role="status">
            {status}
          </p>
        )}

        <p className={formStyles.footer}>
          Already have an account? <Link href={`/${role}/login`}>Log in</Link>
        </p>
      </form>
    </div>
  );
}
