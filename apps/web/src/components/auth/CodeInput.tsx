// ─────────────────────────────────────────────────────────────
// CODE INPUT: six boxes for the 6-digit verification code
// File: src/components/auth/CodeInput.tsx
// Used on the verify page and the reset-password page.
//
// Behaviour:
//   - typing a digit fills the box and jumps to the next one
//   - Backspace on an empty box jumps back
//   - pasting "387154" fills all six boxes
//   - on phones, the code from the SMS can be filled in automatically
//
// The parent keeps the code as ONE string, e.g. "3871" (4 typed so far).
// ─────────────────────────────────────────────────────────────

"use client";

// useRef: keeps a value between redraws WITHOUT causing a redraw.
// Here it holds the six <input> elements so we can move the cursor.
import { useRef } from "react";
import styles from "./CodeInput.module.css";

const LENGTH = 6;

type CodeInputProps = {
  value: string;                       // the digits typed so far
  onChange: (value: string) => void;   // called with the new string
  invalid?: boolean;                   // true = show the boxes in red
  describedBy?: string;                // id of the message under the boxes
};

export default function CodeInput({ value, onChange, invalid, describedBy }: CodeInputProps) {
  // An array of the six input elements, filled in by the "ref" below.
  // <(HTMLInputElement | null)[]> = an array of inputs (or null before they exist).
  const inputs = useRef<(HTMLInputElement | null)[]>([]);

  // Put the cursor in box number "index" (0 to 5).
  // ?. = "only if it exists", so a missing box doesn't crash.
  function focusBox(index: number) {
    inputs.current[index]?.focus();
  }

  // A digit was typed (or deleted) in box "index".
  function handleChange(index: number, typed: string) {
    // Keep only digits. \D = any character that ISN'T a digit.
    const digits = typed.replace(/\D/g, "");

    // Several digits at once = an SMS auto-fill or a paste: fill from here.
    if (digits.length > 1) {
      fillFrom(index, digits);
      return;
    }

    // Turn the code into an array of 6 characters, change one, join it back.
    // Array.from({ length: 6 }, (_, i) => value[i] ?? "") makes
    // ["3","8","7","1","",""] for "3871".
    const chars = Array.from({ length: LENGTH }, (_, i) => value[i] ?? "");
    chars[index] = digits; // "" if the box was cleared
    onChange(chars.join(""));

    // Typed a digit? Move to the next box.
    if (digits && index < LENGTH - 1) focusBox(index + 1);
  }

  // Put a run of digits into the boxes, starting at box "start".
  function fillFrom(start: number, digits: string) {
    const chars = Array.from({ length: LENGTH }, (_, i) => value[i] ?? "");
    // Copy digits in until we run out of digits or boxes.
    for (let i = 0; i < digits.length && start + i < LENGTH; i++) {
      chars[start + i] = digits[i];
    }
    onChange(chars.join(""));
    // Put the cursor after the last digit filled (or on the last box).
    focusBox(Math.min(start + digits.length, LENGTH - 1));
  }

  // Backspace on an empty box: go back one box and clear it.
  function handleKeyDown(index: number, event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Backspace" && !value[index] && index > 0) {
      event.preventDefault();
      const chars = Array.from({ length: LENGTH }, (_, i) => value[i] ?? "");
      chars[index - 1] = "";
      onChange(chars.join(""));
      focusBox(index - 1);
    }
  }

  // Pasting: take the digits from the clipboard and fill the boxes.
  function handlePaste(index: number, event: React.ClipboardEvent<HTMLInputElement>) {
    event.preventDefault(); // stop the browser pasting into just one box
    const digits = event.clipboardData.getData("text").replace(/\D/g, "");
    if (digits) fillFrom(index, digits);
  }

  return (
    // role="group" + aria-label: screen readers say "Verification code, group".
    <div className={styles.boxes} role="group" aria-label="Verification code">
      {/* Make six boxes. Array.from({ length: 6 }) = an array with 6 empty
          slots; the second argument runs once per slot, with i = 0 to 5. */}
      {Array.from({ length: LENGTH }, (_, i) => (
        <input
          key={i}
          // ref: React calls this with the real <input> element, and we
          // store it in our array so focusBox() can reach it later.
          ref={(element) => {
            inputs.current[i] = element;
          }}
          className={styles.box}
          // Show this box's digit ("" if none yet).
          value={value[i] ?? ""}
          onChange={(e) => handleChange(i, e.target.value)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          onPaste={(e) => handlePaste(i, e)}
          // A number keyboard on phones.
          inputMode="numeric"
          // "one-time-code" lets phones offer the code from the SMS.
          // Only the first box needs it.
          autoComplete={i === 0 ? "one-time-code" : "off"}
          aria-label={`Digit ${i + 1} of ${LENGTH}`}
          aria-invalid={invalid}
          aria-describedby={describedBy}
        />
      ))}
    </div>
  );
}
