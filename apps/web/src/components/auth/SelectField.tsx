// ─────────────────────────────────────────────────────────────
// SELECT FIELD: a label and a drop-down list
// File: src/components/auth/SelectField.tsx
//   <SelectField id="district" label="Your district" options={DISTRICTS}
//                value={district} onChange={setDistrict} />
// ─────────────────────────────────────────────────────────────

import styles from "./Form.module.css";

type SelectFieldProps = {
  id: string;
  label: string;
  options: string[];                  // the choices
  value: string;                      // the chosen one ("" = none yet)
  onChange: (value: string) => void;  // called with the new choice
  placeholder?: string;               // first, empty option, e.g. "Choose a district"
  error?: string;
};

export default function SelectField({ id, label, options, value, onChange, placeholder, error }: SelectFieldProps) {
  return (
    <div className={styles.field}>
      <label htmlFor={id} className={styles.label}>
        {label}
      </label>
      {/* A controlled <select>: value comes from the parent's state, and
          onChange passes the new choice back up. */}
      <select
        id={id}
        className={styles.input}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-invalid={!!error}
        aria-describedby={error ? `${id}-message` : undefined}
      >
        {/* value="" = "nothing chosen". Shown first when there's a placeholder. */}
        {placeholder && <option value="">{placeholder}</option>}
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
      {error && (
        <p id={`${id}-message`} className={styles.error} role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
