// ─────────────────────────────────────────────────────────────
// CHIP GROUP: pick one or several options shown as pills
// File: src/components/auth/ChipGroup.tsx
//
//   multiple:  interests (pick any)       -> real checkboxes
//   single:    vendor category (pick one) -> real radio buttons
// Using real inputs means keyboards and screen readers work for free.
// ─────────────────────────────────────────────────────────────

import styles from "./ChipGroup.module.css";

type ChipGroupProps = {
  name: string;                        // groups the inputs, e.g. "interests"
  legend: string;                      // the title above the chips
  options: string[];
  value: string[];                     // what's picked (one item when single)
  onChange: (value: string[]) => void; // called with the new list
  multiple?: boolean;                  // true = pick several
  error?: string;
};

export default function ChipGroup({ name, legend, options, value, onChange, multiple = false, error }: ChipGroupProps) {
  // A chip was clicked: work out the new list of picked options.
  function toggle(option: string) {
    if (!multiple) {
      onChange([option]); // single choice: just this one
      return;
    }
    // Multiple: remove it if it's already picked, otherwise add it.
    // .filter keeps every item except this one; [...value, option] is a
    // new array with the option added on the end. (React needs a NEW
    // array, not a changed old one, to notice the change.)
    onChange(value.includes(option) ? value.filter((v) => v !== option) : [...value, option]);
  }

  return (
    <fieldset className={styles.group} aria-describedby={error ? `${name}-error` : undefined}>
      <legend className={styles.legend}>{legend}</legend>
      <div className={styles.chips}>
        {options.map((option) => (
          <label key={option} className={styles.chip}>
            <input
              className={styles.input}
              type={multiple ? "checkbox" : "radio"}
              name={name}
              value={option}
              checked={value.includes(option)}
              onChange={() => toggle(option)}
            />
            {option}
            {multiple && (
              <span className={styles.tick} aria-hidden="true">
                ✓
              </span>
            )}
          </label>
        ))}
      </div>
      {error && (
        <p id={`${name}-error`} className={styles.error} role="alert">
          {error}
        </p>
      )}
    </fieldset>
  );
}
