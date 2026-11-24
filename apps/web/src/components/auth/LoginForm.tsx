// ─────────────────────────────────────────────────────────────
// LOGIN FORM: one form for every role
// File: src/components/auth/LoginForm.tsx
// Designs: attendee C02, organiser O02, vendor V02.
//
// TWO WAYS TO LOG IN, picked by what the user types:
//   EMAIL -> email + password. signIn() checks the password with Cognito.
//   PHONE -> no password. signIn() with the "USER_AUTH" flow asks Cognito
//            to text a 6-digit code, then we go to /<role>/verify to type it.
// As soon as the box looks like a phone number, the password box hides.
//
// After a successful log in, checkRoleAfterLogin() (lib/session.ts) makes
// sure the account belongs to this page's role and picks the next page:
// setup if they haven't finished it, otherwise their home page.
// ─────────────────────────────────────────────────────────────

"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { resendSignUpCode, signIn, signOut } from "aws-amplify/auth";
// Where Amplify keeps the login tokens (see "Keep me logged in" below).
import { cognitoUserPoolsTokenProvider } from "aws-amplify/auth/cognito";
import { CookieStorage } from "aws-amplify/utils";

import Button from "./Button";
import Divider from "./Divider";
import GoogleButton from "./GoogleButton";
import PasswordField from "./PasswordField";
import TextField from "./TextField";
import formStyles from "./Form.module.css";
import styles from "./LoginForm.module.css";
import { guessIdentifierKind, parseIdentifier } from "@/lib/validation";
import { authErrorMessage } from "@/lib/authErrors";
import { checkRoleAfterLogin, roleWithArticle } from "@/lib/session";
import { ROLE_INFO, type Role } from "@/lib/roles";

type Errors = {
  identifier?: string;
  password?: string;
  form?: string;
};

type LoginFormProps = {
  role: Role;
  verified?: boolean; // true when arriving from the verify page (?verified=1)
};

export default function LoginForm({ role, verified = false }: LoginFormProps) {
  const router = useRouter();

  // ── STATE ────────────────────────────────────────────────
  const [identifier, setIdentifier] = useState(""); // email or phone typed
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);   // "Keep me logged in"
  const [errors, setErrors] = useState<Errors>({});
  const [busy, setBusy] = useState(false);
  // Set when the account belongs to another role, to show a link there.
  const [otherRole, setOtherRole] = useState<Role | null>(null);

  // DERIVED: does what they've typed so far look like a phone number?
  const usesPhone = guessIdentifierKind(identifier) === "phone";

  // Send someone to verify, with where the code went in the address.
  // mode "login" = a log-in code; mode "signup" = confirming a new account.
  function goToVerify(to: string, via: "email" | "phone", mode: "login" | "signup") {
    const params = new URLSearchParams({ to, via, mode });
    router.push(`/${role}/verify?${params}`);
  }

  // After a successful log in: right role? Then on to the next page.
  async function finishLogin() {
    const result = await checkRoleAfterLogin(role);
    if (result.ok) {
      router.push(result.path);
      return;
    }
    // Wrong role's page: log out again and point them to the right one.
    await signOut();
    setOtherRole(result.actualRole);
    setErrors({
      form: result.actualRole
        ? `This is ${roleWithArticle(result.actualRole)} account.`
        : "This account isn't set up for an account type yet. Contact Tezera support.",
    });
    setBusy(false);
  }

  // ── WHEN "Log in" / "Send code" IS PRESSED ───────────────
  async function handleLogin(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const parsed = parseIdentifier(identifier);
    const newErrors: Errors = {};
    if (!parsed) newErrors.identifier = "Enter an email address or a phone number like 077 123 4567.";
    // Email log in needs a password. We only check one was typed, not the
    // rules: telling someone "too short" here gives hints to attackers.
    if (parsed?.kind === "email" && password === "") newErrors.password = "Enter your password.";
    setErrors(newErrors);
    setOtherRole(null);
    if (!parsed || Object.keys(newErrors).length > 0) return;

    setBusy(true);
    try {
      // Start fresh: if someone was already logged in on this browser,
      // signIn would fail with "UserAlreadyAuthenticatedException".
      await signOut();

      // KEEP ME LOGGED IN: tokens live in cookies, so the server can see who is
      // signed in (lib/auth/session.ts). Ticked, the cookies last 30 days.
      // Unticked, they have no expiry date, so the browser clears them when it closes.
      cognitoUserPoolsTokenProvider.setKeyValueStorage(
        new CookieStorage({
          expires: remember ? 30 : undefined,
          path: "/",
          sameSite: "lax",
          secure: window.location.protocol === "https:",
        }),
      );

      // Phone: no password, ask for a texted code. Email: password.
      const { nextStep } =
        parsed.kind === "phone"
          ? await signIn({
              username: parsed.value,
              options: { authFlowType: "USER_AUTH", preferredChallenge: "SMS_OTP" },
            })
          : await signIn({ username: parsed.value, password });

      switch (nextStep.signInStep) {
        case "CONFIRM_SIGN_IN_WITH_SMS_CODE":
          // Cognito has texted a code. Type it on the verify page.
          goToVerify(parsed.value, "phone", "login");
          return;
        case "CONFIRM_SIGN_UP":
          // They signed up but never typed the first code: send a new one.
          await resendSignUpCode({ username: parsed.value });
          goToVerify(parsed.value, parsed.kind, "signup");
          return;
        case "DONE":
          await finishLogin();
          return;
        default:
          // Other steps (e.g. multi-factor codes) aren't switched on.
          throw new Error(`Unexpected sign-in step: ${nextStep.signInStep}`);
      }
    } catch (error) {
      // Some Amplify versions throw this instead of returning CONFIRM_SIGN_UP.
      if (error instanceof Error && error.name === "UserNotConfirmedException") {
        await resendSignUpCode({ username: parsed.value });
        goToVerify(parsed.value, parsed.kind, "signup");
        return;
      }
      setErrors({ form: authErrorMessage(error) });
      setBusy(false);
    }
  }

  return (
    <div>
      <h2 className={formStyles.title}>Welcome back</h2>
      <p className={formStyles.subtitle}>Log in with your email or phone number.</p>

      {verified && (
        // The wrapper adds space below; .status itself has no margin.
        <div className={styles.notice}>
          <p className={formStyles.status} role="status">
            Your account is verified. Log in to carry on.
          </p>
        </div>
      )}

      {/* noValidate: we show our own messages instead of browser pop-ups. */}
      <form className={formStyles.form} onSubmit={handleLogin} noValidate>
        {/* TODO (Google step): signInWithRedirect({ provider: "Google" }). */}
        <GoogleButton
          disabled={busy}
          onClick={() => setErrors({ form: "Google log in isn't set up yet. Use email or phone for now." })}
        />

        <Divider />

        <TextField
          id="identifier"
          label="Email or phone number"
          type="text"
          inputMode="email"          // phones show a keyboard with @
          autoComplete="username"    // password managers can fill it
          placeholder="sanduni@example.com or 077 123 4567"
          value={identifier}         // CONTROLLED INPUT: shows the state ...
          onChange={(e) => setIdentifier(e.target.value)} // ... and updates it
          error={errors.identifier}
          hint={usesPhone ? "We'll text you a code. No password needed." : undefined}
        />

        {/* Email accounts have a password; phone accounts don't. */}
        {!usesPhone && (
          <PasswordField
            id="password"
            label="Password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            error={errors.password}
          />
        )}

        <div className={styles.options}>
          <label className={formStyles.checkbox}>
            <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} />
            Keep me logged in
          </label>
          {/* Only password accounts can forget a password. */}
          {!usesPhone && (
            <Link href={`/${role}/reset-password`} className={formStyles.link}>
              Forgot password?
            </Link>
          )}
        </div>

        {/* Errors from Cognito, e.g. wrong password or wrong role page. */}
        {errors.form && (
          <p className={formStyles.error} role="alert">
            {errors.form}{" "}
            {otherRole && (
              <Link href={`/${otherRole}/login`}>Log in on the {ROLE_INFO[otherRole].name.toLowerCase()} page</Link>
            )}
          </p>
        )}

        <Button type="submit" disabled={busy}>
          {busy ? "One moment…" : usesPhone ? "Send code" : "Log in"}
        </Button>

        <p className={formStyles.footer}>
          New to Tezera? <Link href={`/${role}/signup`}>Create an account</Link>
        </p>
      </form>
    </div>
  );
}
