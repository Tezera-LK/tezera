// ─────────────────────────────────────────────────────────────
// VERIFY FORM: "Check your phone / email" (every role)
// File: src/components/auth/VerifyForm.tsx
// Designs: attendee C03, organiser O03, vendor V03.
//
// One screen, two jobs, chosen by ?mode= in the web address:
//
//   mode=signup  confirming a NEW account (email or phone)
//     confirmSignUp() checks the code. Cognito runs our post-confirmation
//     function, which puts the user in their role group. Then autoSignIn()
//     logs them in and they go to /<role>/setup.
//
//   mode=login   a PHONE user logging in (no password)
//     The log in form already asked Cognito to text a code. confirmSignIn()
//     checks it, and they go to setup or home, depending on how far
//     through setup they are.
// ─────────────────────────────────────────────────────────────

"use client";

// useEffect: runs code AFTER drawing, e.g. to start a timer.
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { autoSignIn, confirmSignIn, confirmSignUp, resendSignUpCode, signIn, signOut } from "aws-amplify/auth";

import Button from "./Button";
import CodeInput from "./CodeInput";
import formStyles from "./Form.module.css";
import { authErrorMessage } from "@/lib/authErrors";
import { checkRoleAfterLogin, roleWithArticle } from "@/lib/session";
import { ROLE_INFO, type Role } from "@/lib/roles";

const RESEND_SECONDS = 30;  // wait before "Resend code" can be used

type VerifyFormProps = {
  role: Role;
  destination?: string;           // e.g. "+94771234567" or "sanduni@example.com"
  via: "email" | "phone";
  mode: "signup" | "login";
};

export default function VerifyForm({ role, destination, via, mode }: VerifyFormProps) {
  const router = useRouter();

  // Hooks always come first, before any early "return": React needs
  // them in the same order on every draw.
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [secondsLeft, setSecondsLeft] = useState(RESEND_SECONDS);
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);
  // Set when the account belongs to another role, to link to its log in page.
  const [otherRole, setOtherRole] = useState<Role | null>(null);

  // ── THE RESEND COUNTDOWN ─────────────────────────────────
  // Runs after every draw where secondsLeft changed. Each run waits one
  // second and takes one off, which causes the next run. Stops at 0.
  useEffect(() => {
    if (secondsLeft === 0) return;
    const timer = setTimeout(() => setSecondsLeft(secondsLeft - 1), 1000);
    // CLEAN-UP: React runs this before the next run or when leaving the page.
    return () => clearTimeout(timer);
  }, [secondsLeft]);

  // No destination in the web address = they came here directly.
  if (!destination) {
    return (
      <div>
        <h2 className={formStyles.title}>Nothing to verify</h2>
        <p className={formStyles.subtitle}>Start by creating an account or logging in, and we&apos;ll send you a code.</p>
        <p className={formStyles.footer}>
          <Link href={`/${role}/signup`}>Create an account</Link> · <Link href={`/${role}/login`}>Log in</Link>
        </p>
      </div>
    );
  }

  // TypeScript can't tell that destination stays defined inside the
  // functions below, so keep it in a constant that's always a string.
  const username = destination;
  const isPhone = via === "phone";
  const timerText = `0:${String(secondsLeft).padStart(2, "0")}`; // 5 -> "0:05"

  // Logged in: right role? Then on to setup or home.
  async function goOn() {
    const result = await checkRoleAfterLogin(role);
    if (result.ok) {
      router.push(result.path);
      return;
    }
    await signOut();
    setOtherRole(result.actualRole);
    setError(
      result.actualRole
        ? `This is ${roleWithArticle(result.actualRole)} account.`
        : "This account isn't set up for an account type yet. Contact Tezera support.",
    );
    setBusy(false);
  }

  // ── WHEN "Verify" IS PRESSED ─────────────────────────────
  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (code.length < 6) {
      setError("Enter all 6 digits.");
      return;
    }

    setBusy(true);
    try {
      if (mode === "login") {
        // A phone log in: the code IS the log in.
        const { nextStep } = await confirmSignIn({ challengeResponse: code });
        if (nextStep.signInStep !== "DONE") throw new Error(`Unexpected sign-in step: ${nextStep.signInStep}`);
        await goOn();
        return;
      }

      // A new account: confirm it. nextStep says what comes next.
      const { nextStep } = await confirmSignUp({ username, confirmationCode: code });
      if (nextStep.signUpStep === "COMPLETE_AUTO_SIGN_IN") {
        // They signed up in this browser a moment ago: log them in.
        await autoSignIn();
        await goOn();
      } else {
        // Confirmed, but no automatic log in (e.g. they came from log in).
        router.push(`/${role}/login?verified=1`);
      }
    } catch (err) {
      setCode(""); // clear the boxes for another go
      // In a phone log in, Cognito ends the attempt after too many wrong
      // codes or a few minutes, and says "NotAuthorized". That isn't a
      // wrong password, so say what it really means.
      if (mode === "login" && err instanceof Error && err.name === "NotAuthorizedException") {
        setError("This code has expired or been tried too many times. Send a new code.");
        setSecondsLeft(0); // show the Resend button straight away
      } else {
        setError(authErrorMessage(err));
      }
      setBusy(false);
    }
  }

  // ── WHEN "Resend code" IS PRESSED ────────────────────────
  async function handleResend() {
    setError("");
    try {
      if (mode === "login") {
        // A log-in code is resent by starting the phone log in again.
        await signIn({ username, options: { authFlowType: "USER_AUTH", preferredChallenge: "SMS_OTP" } });
      } else {
        await resendSignUpCode({ username });
      }
      setSecondsLeft(RESEND_SECONDS); // restarts the countdown
      setCode("");
      setStatus(`We sent a new code to ${username}.`);
    } catch (err) {
      setError(authErrorMessage(err));
    }
  }

  return (
    <div>
      <h2 className={formStyles.title}>{isPhone ? "Check your phone" : "Check your email"}</h2>
      <p className={formStyles.subtitle}>
        {mode === "login" ? "We texted a 6-digit log in code to " : "We sent a 6-digit code to "}
        {username}.
      </p>

      <form className={formStyles.form} onSubmit={handleSubmit} noValidate>
        <CodeInput
          value={code}
          onChange={(next) => {
            setCode(next);
            setError(""); // typing again clears the old error
          }}
          invalid={!!error}
          describedBy={error ? "code-error" : undefined}
        />

        {error && (
          <p id="code-error" className={formStyles.error} role="alert">
            {error}{" "}
            {otherRole && (
              <Link href={`/${otherRole}/login`}>Log in on the {ROLE_INFO[otherRole].name.toLowerCase()} page</Link>
            )}
          </p>
        )}

        <p className={formStyles.metaRow}>
          {/* Counting down: show the timer. At 0: show a button. */}
          {secondsLeft > 0 ? (
            <span>Resend code in {timerText}</span>
          ) : (
            <button type="button" className={formStyles.linkButton} onClick={handleResend}>
              Resend code
            </button>
          )}
          <span aria-hidden="true">·</span>
          {/* Wrong number or email? Go back to where it was typed. */}
          <Link href={`/${role}/${mode === "login" ? "login" : "signup"}`}>
            {isPhone ? "Change number" : "Change email"}
          </Link>
        </p>

        <Button type="submit" disabled={busy}>
          {busy ? "Checking…" : mode === "login" ? "Log in" : "Verify"}
        </Button>

        {status && (
          <p className={formStyles.status} role="status">
            {status}
          </p>
        )}
      </form>
    </div>
  );
}
