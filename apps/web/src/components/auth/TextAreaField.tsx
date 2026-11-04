// ─────────────────────────────────────────────────────────────
// TEXT AREA FIELD: like TextField, but a multi-line box
// File: src/components/auth/TextAreaField.tsx
// Used for longer text, e.g. an organiser's description.
// ─────────────────────────────────────────────────────────────

import styles from "./Form.module.css";

// Same idea as TextField, but with the props a <textarea> accepts.
type TextAreaFieldProps = React.ComponentProps<"textarea"> & {
  id: string;
  label: string;
  error?: string;
  hint?: string;
};

export default function TextAreaField({ id, label, error, hint, ...areaProps }: TextAreaFieldProps) {
  const messageId = `${id}-message`;
  const message = error ?? hint;

  return (
    <div className={styles.field}>
      <label htmlFor={id} className={styles.label}>
        {label}
      </label>
      {/* .input styles text boxes; Form.module.css adds "textarea.input"
          rules to make it taller. */}
      <textarea
        id={id}
        className={styles.input}
        aria-invalid={!!error}
        aria-describedby={message ? messageId : undefined}
        {...areaProps}
      />
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
