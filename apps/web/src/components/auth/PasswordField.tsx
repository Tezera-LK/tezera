// ─────────────────────────────────────────────────────────────
// PASSWORD FIELD: a password box with a "Show" / "Hide" button
// File: src/components/auth/PasswordField.tsx
//
// Password boxes hide what you type (••••). The button switches the box
// between type="password" (hidden) and type="text" (visible), so people
// can check what they typed before submitting.
// Used for every password box: log in, sign up, reset password.
// ─────────────────────────────────────────────────────────────

// It remembers whether the password is showing, which needs state.
"use client";

import { useState } from "react";
import styles from "./Form.module.css";

// Like TextField's props, but without "type": this component decides it.
// Omit<Type, "key"> = the same type with that one key removed.
type PasswordFieldProps = Omit<React.ComponentProps<"input">, "type"> & {
  id: string;
  label: string;
  error?: string;
  hint?: string;
};

export default function PasswordField({ id, label, error, hint, ...inputProps }: PasswordFieldProps) {
  const [visible, setVisible] = useState(false); // false = hidden (••••)
  const messageId = `${id}-message`;
  const message = error ?? hint;

  return (
    <div className={styles.field}>
      <label htmlFor={id} className={styles.label}>
        {label}
      </label>

      <div className={styles.passwordWrap}>
        <input
          id={id}
          // The whole trick: "text" shows the letters, "password" hides them.
          type={visible ? "text" : "password"}
          className={`${styles.input} ${styles.passwordInput}`}
          aria-invalid={!!error}
          aria-describedby={message ? messageId : undefined}
          {...inputProps}
        />
        {/* type="button" so it doesn't submit the form.
            aria-pressed tells screen readers it's an on/off button, and
            aria-controls which box it affects. */}
        <button
          type="button"
          className={styles.showButton}
          onClick={() => setVisible(!visible)}
          aria-pressed={visible}
          aria-controls={id}
          aria-label={visible ? `Hide ${label.toLowerCase()}` : `Show ${label.toLowerCase()}`}
        >
          {visible ? "Hide" : "Show"}
        </button>
      </div>

      {error && (
        <p id={messageId} className={styles.error} role="alert">
          {error}
        </p>
      )}
      {!error && hint && (
        <p id={messageId} className={styles.hint}>
          {hint}
        </p>
      )}
    </div>
  );
}
