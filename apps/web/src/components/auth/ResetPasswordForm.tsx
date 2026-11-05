// ─────────────────────────────────────────────────────────────
// RESET PASSWORD FORM: every role (design: vendor V04)
// File: src/components/auth/ResetPasswordForm.tsx
//
// Two stages on one page:
//   1. "request": type your email or phone. resetPassword() asks Cognito
//      to send a reset code.
//   2. "reset": type the code and a new password twice.
//      confirmResetPassword() checks the code and saves the password.
// Then a "done" message with a link back to log in.
//
// Only EMAIL accounts have a password. Phone accounts log in with a texted
// code, so if someone types a phone number we explain that instead.
// ─────────────────────────────────────────────────────────────

"use client";

import { useState } from "react";
import Link from "next/link";
import { confirmResetPassword, resetPassword } from "aws-amplify/auth";

import Button from "./Button";
import CodeInput from "./CodeInput";
import PasswordField from "./PasswordField";
import TextField from "./TextField";
import formStyles from "./Form.module.css";
import { checkPassword, parseIdentifier } from "@/lib/validation";
import { authErrorMessage } from "@/lib/authErrors";
import type { Role } from "@/lib/roles";

// Which stage the page is showing. A union type keeps it to these three.
type Stage = "request" | "reset" | "done";

type Errors = {
  identifier?: string;
  code?: string;
  password?: string;
  confirm?: string;
  form?: string;
};

export default function ResetPasswordForm({ role }: { role: Role }) {
  const [stage, setStage] = useState<Stage>("request");
  const [identifier, setIdentifier] = useState("");
  const [username, setUsername] = useState("");       // the cleaned-up email/phone
  const [sentTo, setSentTo] = useState("");           // where Cognito says it sent the code
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [errors, setErrors] = useState<Errors>({});
  const [busy, setBusy] = useState(false);

  // ── STAGE 1: send the code ───────────────────────────────
  async function handleRequest(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsed = parseIdentifier(identifier);
    if (!parsed) {
      setErrors({ identifier: "Enter the email address you signed up with." });
      return;
    }
    if (parsed.kind === "phone") {
      setErrors({ identifier: "Phone accounts don't have a password. Log in with your number and we'll text you a code." });
      return;
    }

    setBusy(true);
    try {
      const { nextStep } = await resetPassword({ username: parsed.value });
      // Cognito hides part of the address for privacy, e.g. "s***@e***.com".
      setSentTo(nextStep.codeDeliveryDetails?.destination ?? parsed.value);
      setUsername(parsed.value);
      setErrors({});
      setStage("reset");
    } catch (error) {
      setErrors({ form: authErrorMessage(error) });
    }
    setBusy(false);
  }

  // ── STAGE 2: check the code, save the new password ───────
  async function handleReset(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const found: Errors = {};
    if (code.length < 6) found.code = "Enter all 6 digits.";
    const passwordProblem = checkPassword(password);
    if (passwordProblem) found.password = passwordProblem;
    if (confirm !== password) found.confirm = "The passwords don't match.";
    setErrors(found);
    if (Object.keys(found).length > 0) return;

    setBusy(true);
    try {
      await confirmResetPassword({ username, confirmationCode: code, newPassword: password });
      setStage("done");
    } catch (error) {
      // A wrong or expired code belongs under the code boxes.
      setErrors({ code: authErrorMessage(error) });
      setCode("");
    }
    setBusy(false);
  }

  // ── WHAT TO SHOW: one of three stages ────────────────────
  if (stage === "done") {
    return (
      <div>
        <h2 className={formStyles.title}>Password changed</h2>
        <p className={formStyles.subtitle}>You can log in with your new password now.</p>
        {/* A Link styled as a button, using the same classes as Button. */}
        <Link href={`/${role}/login`} className={`${formStyles.button} ${formStyles.primary} ${formStyles.block}`}>
          Back to log in
        </Link>
      </div>
    );
  }

  return (
    <div>
      <h2 className={formStyles.title}>Reset your password</h2>
      <p className={formStyles.subtitle}>
        {stage === "request"
          ? "Enter your email address and we will send a reset code."
          : `We sent a 6-digit code to ${sentTo}.`}
      </p>

      {stage === "request" ? (
        <form className={formStyles.form} onSubmit={handleRequest} noValidate>
          <TextField
            id="identifier"
            label="Email address"
            type="text"
            inputMode="email"
            autoComplete="username"
            placeholder="sanduni@example.com"
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            error={errors.identifier}
          />
          {errors.form && (
            <p className={formStyles.error} role="alert">
              {errors.form}
            </p>
          )}
          <Button type="submit" disabled={busy}>
            {busy ? "Sending…" : "Send reset code"}
          </Button>
          <Link href={`/${role}/login`} className={formStyles.link}>
            Back to log in
          </Link>
        </form>
      ) : (
        <form className={formStyles.form} onSubmit={handleReset} noValidate>
          <CodeInput
            value={code}
            onChange={setCode}
            invalid={!!errors.code}
            describedBy={errors.code ? "code-error" : undefined}
          />
          {errors.code && (
            <p id="code-error" className={formStyles.error} role="alert">
              {errors.code}
            </p>
          )}

          {/* The "Then set a new password" box from the design. */}
          <div className={formStyles.card}>
            <h3 className={formStyles.cardTitle}>Set a new password</h3>
            <div className={formStyles.row}>
              <PasswordField
                id="new-password"
                label="New password"
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                error={errors.password}
              />
              <PasswordField
                id="confirm-password"
                label="Confirm"
                autoComplete="new-password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                error={errors.confirm}
              />
            </div>
          </div>

          <Button type="submit" disabled={busy}>
            {busy ? "Saving…" : "Save new password"}
          </Button>

          <p className={formStyles.metaRow}>
            Wrong address?{" "}
            {/* Back to stage 1, keeping what they typed. */}
            <button type="button" className={formStyles.linkButton} onClick={() => setStage("request")}>
              Change it
            </button>
          </p>
        </form>
      )}
    </div>
  );
}
