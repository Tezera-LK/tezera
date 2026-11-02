"use client";

// useState: React's way to remember values that change.
import { useState } from "react";
// Link: Next.js links between our own pages, without a full page reload.
import Link from "next/link";

import Button from "./Button";
import Divider from "./Divider";
import GoogleButton from "./GoogleButton";
import TextField from "./TextField";
import formStyles from "./Form.module.css";
import styles from "./LoginForm.module.css";
import { parseIdentifier } from "@/lib/validation";

// The shape of our error messages: one optional message per field.
type Errors = {
  identifier?: string;
  password?: string;
};

export default function LoginForm() {
  
  const [identifier, setIdentifier] = useState(""); // email or phone typed
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<Errors>({}); // {} = no errors yet
  const [status, setStatus] = useState("");         // message after submit

  // Forgot password panel: open or closed, and its own field.
  const [showForgot, setShowForgot] = useState(false);
  const [resetIdentifier, setResetIdentifier] = useState("");
  const [resetError, setResetError] = useState("");
  const [resetStatus, setResetStatus] = useState("");

  function handleLogin(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    // Collect problems in a fresh object.
    const newErrors: Errors = {};
    if (!parseIdentifier(identifier)) {
      newErrors.identifier = "Enter an email address or a phone number like 077 123 4567.";
    }
    if (password === "") {
      newErrors.password = "Enter your password.";
    }
    // (We don't check password RULES at login, only at sign-up.

    setErrors(newErrors);

    // Object.keys(...) lists the fields with errors. Any = stop here.
    if (Object.keys(newErrors).length > 0) {
      setStatus("");
      return;
    }

    setStatus("Looks good! Logging in will work once we connect Cognito.");
  }

  function handleReset(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!parseIdentifier(resetIdentifier)) {
      setResetError("Enter the email or phone number you signed up with.");
      setResetStatus("");
      return;
    }
    setResetError("");
    setResetStatus("If an account exists, we'll send a reset code.");
  }

  return (
    <div className={styles.stack}>
      <div>
        <h2 className={formStyles.title}>Welcome back</h2>
        <p className={formStyles.subtitle}>Log in with your email or phone number.</p>

        <form className={formStyles.form} onSubmit={handleLogin} noValidate>
          <GoogleButton onClick={() => setStatus("Google sign-in comes in step 8.")} />

          <Divider />

          <TextField
            id="identifier"
            label="Email or phone number"
            type="text"
            inputMode="email"
            autoComplete="username"
            placeholder="sanduni@example.com"
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            error={errors.identifier}
          />

          <TextField
            id="password"
            label="Password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            error={errors.password}
          />

          <button
            type="button"
            className={formStyles.linkButton}
            onClick={() => setShowForgot(!showForgot)}
            aria-expanded={showForgot}
            aria-controls="forgot-panel"
          >
            Forgot password?
          </button>

          <Button type="submit">Log in</Button>

          {/* Only shown when there's a status message. */}
          {status && (
            <p className={formStyles.status} role="status">
              {status}
            </p>
          )}

          <p className={formStyles.footer}>
            New to Tezera? <Link href="/signup">Create an account</Link>
          </p>
        </form>
      </div>

      
        {/* Only drawn when showForgot is true. */}
      {showForgot && (
        <form id="forgot-panel" className={styles.forgotPanel} onSubmit={handleReset} noValidate>
          <h3 className={styles.forgotTitle}>Forgot password</h3>
          <p className={styles.forgotText}>
            Enter your email or phone and we will send a reset code.
          </p>

          <TextField
            id="reset-identifier"
            label="Email or phone number"
            type="text"
            inputMode="email"
            autoComplete="username"
            placeholder="+94 77 123 4567"
            value={resetIdentifier}
            onChange={(e) => setResetIdentifier(e.target.value)}
            error={resetError}
          />

          <Button type="submit" block={false}>
            Send reset code
          </Button>

          {resetStatus && (
            <p className={formStyles.status} role="status">
              {resetStatus}
            </p>
          )}
        </form>
      )}
    </div>
  );
}