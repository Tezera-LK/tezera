// ─────────────────────────────────────────────────────────────
// TEXT FIELD: a label, an input box and an optional message
// File: src/components/auth/TextField.tsx
//
// Used for every one-line box in the auth forms. Writing it once means
// every field looks and behaves the same, and fixes happen in one place.
//   <TextField id="password" label="Password" type="password" error="..." />
// ─────────────────────────────────────────────────────────────

import styles from "./Form.module.css";

// React.ComponentProps<"input"> = every prop a normal <input> accepts
// (type, value, onChange, placeholder, autoComplete...).
// "&" adds our own props on top. "?" = optional.
type TextFieldProps = React.ComponentProps<"input"> & {
  id: string;        // required: links the <label> to the <input>
  label: string;     // the text above the box
  error?: string;    // shown in red when there's a problem
  hint?: string;     // grey help text, shown when there's no error
};

// DESTRUCTURING: take our own props out by name; "...inputProps" (the
// REST) collects everything else to pass straight on to the <input>.
export default function TextField({ id, label, error, hint, ...inputProps }: TextFieldProps) {
  const messageId = `${id}-message`;   // so the input can point at its message
  const message = error ?? hint;       // ?? = use error, or hint if there's no error

  return (
    <div className={styles.field}>
      {/* htmlFor = the input's id: clicking the label focuses the box, and
          screen readers read them together. ("for" is a JavaScript word.) */}
      <label htmlFor={id} className={styles.label}>
        {label}
      </label>

      <input
        id={id}
        className={styles.input}
        aria-invalid={!!error}                                  // !! turns text into true/false
        aria-describedby={message ? messageId : undefined}      // screen readers read the message too
        {...inputProps}                                         // SPREAD: type, value, onChange...
      />

      {/* && = only show this if the left side is true.
          role="alert" makes screen readers announce new errors at once. */}
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
