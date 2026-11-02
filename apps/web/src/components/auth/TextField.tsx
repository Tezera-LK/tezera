//labels, input boxes and optional messages

import styles from "./Form.module.css";
//every prop a normal <input> accepts (type, value, onChange, placeholder, autoComplete...).

type TextFieldProps = React.ComponentProps<"input"> & {
  id: string;        // required: links the <label> to the <input>
  label: string;     
  error?: string;    
  hint?: string;  
};

export default function TextField({ id, label, error, hint, ...inputProps }: TextFieldProps) {
  // An id for the message, so the input can point to it (below).
  const messageId = `${id}-message`;

  // Which message to show: an error wins over a hint.
  // "??" means "use the left side unless it's empty (undefined/null)".
  const message = error ?? hint;

  return (
    <div className={styles.field}>
      <label htmlFor={id} className={styles.label}>
        {label}
      </label>

      <input
        id={id}
        className={styles.input}
        // aria-invalid: tells screen readers the value is wrong.
        // !!error turns the error text into true/false.
        aria-invalid={!!error}
        // aria-describedby: screen readers also read the message under the box.
        // Only set when there is a message.
        aria-describedby={message ? messageId : undefined}
        {...inputProps}
      />

      {/* && means "only show this if the left side is true".
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