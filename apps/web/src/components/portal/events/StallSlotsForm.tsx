"use client";

import Link from "next/link";
import { useState } from "react";
import type { StallType } from "@/lib/data/portal-types";
import { STALL_TYPES } from "@/lib/stalls";
import forms from "../forms.module.css";
import styles from "./Stalls.module.css";

const TEXT = {
  type: "Stall type",
  slots: "Number of slots",
  fee: "Fee per stall",
  closes: "Applications close",
  due: "Fee due",
  rules: "Rules for vendors",
  rulesPlaceholder: "No alcohol · gas cookers only · lights off by 11:30 PM",
  cancel: "Cancel",
  open: (n: number, type: string) =>
    n > 0 ? `Open ${n} ${type.toLowerCase()} ${n === 1 ? "slot" : "slots"}` : `Open ${type.toLowerCase()} slots`,
  save: (type: string) => `Save ${type.toLowerCase()} slots`,
} as const;

const ERRORS: Record<string, string> = {
  type: "Pick a stall type.",
  slots: "At least 1, and no fewer than the stalls already approved.",
  fee: "Add the fee in rupees: 0 if the stall is free.",
  closes: "Pick a day on or before the event.",
  due: "Pick the day the fee is due.",
};

const lkr = new Intl.NumberFormat("en-GB");

export type SlotValues = {
  type: StallType;
  slots: number | null;
  feeLkr: number | null;
  closesOn: string;
  feeDue: string;
  rules: string;
};

type Props = {
  action: (form: FormData) => Promise<void>;
  initial: SlotValues;
  // editing one row of Stall slots: the type can't change
  editing: boolean;
  // the event's day; applications have to close by then
  lastDay: string;
  closeHref: string;
  error?: string;
};

// The form inside "Open stall slots" (O72). It's a client component only so the big button can
// say what it will do ("Open 10 food slots") as the organiser types.
export default function StallSlotsForm({ action, initial, editing, lastDay, closeHref, error }: Props) {
  const [type, setType] = useState<StallType>(initial.type);
  const [slots, setSlots] = useState(initial.slots === null ? "" : String(initial.slots));
  const message = error ? ERRORS[error] : undefined;
  const invalid = (name: string) => error === name || undefined;

  return (
    <form action={action} className={styles.dialogForm}>
      <fieldset className={styles.typeField}>
        <legend className={styles.fieldTitle}>{TEXT.type}</legend>
        <div className={styles.typePills}>
          {STALL_TYPES.map((t) => (
            <label key={t} className={styles.typePill}>
              <input
                type="radio"
                name="type"
                value={t}
                checked={type === t}
                disabled={editing && t !== initial.type}
                onChange={() => setType(t)}
              />
              {t}
            </label>
          ))}
        </div>
      </fieldset>

      <div className={forms.row2}>
        <label className={forms.field}>
          <span className={forms.label}>{TEXT.slots}</span>
          <input
            name="slots"
            type="number"
            min={1}
            required
            inputMode="numeric"
            value={slots}
            onChange={(e) => setSlots(e.target.value)}
            className={forms.input}
            aria-invalid={invalid("slots")}
          />
        </label>
        <label className={forms.field}>
          <span className={forms.label}>{TEXT.fee}</span>
          <input
            name="fee"
            required
            inputMode="numeric"
            placeholder="LKR 15,000"
            defaultValue={initial.feeLkr === null ? "" : `LKR ${lkr.format(initial.feeLkr)}`}
            className={forms.input}
            aria-invalid={invalid("fee")}
          />
        </label>
        <label className={forms.field}>
          <span className={forms.label}>{TEXT.closes}</span>
          <input
            name="closesOn"
            type="date"
            required
            max={lastDay || undefined}
            defaultValue={initial.closesOn}
            className={forms.input}
            aria-invalid={invalid("closes")}
          />
        </label>
        <label className={forms.field}>
          <span className={forms.label}>{TEXT.due}</span>
          <input name="feeDue" type="date" required defaultValue={initial.feeDue} className={forms.input} aria-invalid={invalid("due")} />
        </label>
      </div>

      <label className={forms.field}>
        <span className={forms.label}>{TEXT.rules}</span>
        <textarea name="rules" rows={2} defaultValue={initial.rules} placeholder={TEXT.rulesPlaceholder} className={`${forms.input} ${styles.rules}`} />
      </label>

      {message && (
        <p className={forms.error} role="alert">
          {message}
        </p>
      )}

      <div className={styles.dialogActions}>
        <Link href={closeHref} scroll={false} className={`${forms.bigButton} ${forms.bigButtonQuiet}`}>
          {TEXT.cancel}
        </Link>
        <button type="submit" className={`${forms.bigButton} ${forms.bigButtonPrimary}`}>
          {editing ? TEXT.save(type) : TEXT.open(Number(slots), type)}
        </button>
      </div>
    </form>
  );
}
