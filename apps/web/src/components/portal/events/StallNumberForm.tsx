"use client";

import Link from "next/link";
import { useState } from "react";
import forms from "../forms.module.css";
import shell from "../PortalShell.module.css";
import styles from "./Stalls.module.css";

const TEXT = {
  number: "Stall number",
  free: (zone: string, numbers: string[]) => `Free numbers in ${zone}: ${numbers.join(", ")}`,
  noneFree: (zone: string) => `No free numbers in ${zone}. Type one and place it in the map builder.`,
  pick: (zone: string) => `Numbers in ${zone}`,
  taken: "taken",
  cancel: "Cancel",
} as const;

const ERRORS: Record<string, string> = {
  number: "Type a number that no other stall has.",
  full: "Every slot of this type is taken. Add a slot first.",
};

type Props = {
  action: (form: FormData) => Promise<void>;
  // the area's numbers in map order, and whether each is free
  numbers: { value: string; free: boolean }[];
  zone: string;
  initial: string;
  // "Approve as" or "Give number": the button reads "Approve as B-15"
  verb: string;
  note: string;
  closeHref: string;
  error?: string;
};

// The stall number part of "Approve Kottu Corner" (O75), also used to give a number to an
// approved vendor who has none. Picking a square fills in the box; any free number can be typed.
export default function StallNumberForm({ action, numbers, zone, initial, verb, note, closeHref, error }: Props) {
  const [number, setNumber] = useState(initial);
  const free = numbers.filter((n) => n.free).map((n) => n.value);

  return (
    <form action={action} className={styles.dialogForm}>
      <label className={forms.field}>
        <span className={forms.label}>{TEXT.number}</span>
        <input
          name="number"
          required
          value={number}
          onChange={(e) => setNumber(e.target.value.toUpperCase())}
          className={forms.input}
          aria-invalid={error === "number" || undefined}
          aria-describedby="free-numbers"
          autoComplete="off"
        />
        <span id="free-numbers" className={forms.hint}>
          {free.length > 0 ? TEXT.free(zone, free) : TEXT.noneFree(zone)}
        </span>
      </label>

      {numbers.length > 0 && (
        <fieldset className={styles.numberGrid}>
          <legend className={shell.srOnly}>{TEXT.pick(zone)}</legend>
          {numbers.map((n) => (
            <label key={n.value} className={styles.numberTile}>
              <input
                type="radio"
                name="pick"
                value={n.value}
                checked={number === n.value}
                disabled={!n.free}
                onChange={() => setNumber(n.value)}
              />
              {n.value}
              {!n.free && <span className={shell.srOnly}>{` (${TEXT.taken})`}</span>}
            </label>
          ))}
        </fieldset>
      )}

      <p className={styles.note}>{note}</p>

      {error && ERRORS[error] && (
        <p className={forms.error} role="alert">
          {ERRORS[error]}
        </p>
      )}

      <div className={styles.dialogActions}>
        <Link href={closeHref} scroll={false} className={`${forms.bigButton} ${forms.bigButtonQuiet}`}>
          {TEXT.cancel}
        </Link>
        <button type="submit" className={`${forms.bigButton} ${forms.bigButtonPrimary}`}>
          {`${verb} ${number}`.trim()}
        </button>
      </div>
    </form>
  );
}
