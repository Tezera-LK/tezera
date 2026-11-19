"use client";

import Link from "next/link";
import { useState } from "react";
import type { StallType, StallVendor } from "@/lib/data/portal-types";
import { STALL_TYPES } from "@/lib/stalls";
import forms from "../forms.module.css";
import shell from "../PortalShell.module.css";
import Thumb from "../Thumb";
import styles from "./Stalls.module.css";

const TEXT = {
  search: "Search vendors by name, type or town",
  vendors: "Vendors",
  noMatch: "No vendor matches. Try part of the name.",
  type: "Stall type",
  fee: "Fee",
  message: "Message",
  messagePlaceholder: "We would love your king coconuts in the drinks zone!",
  cancel: "Cancel",
  send: "Send invitation",
  verified: "Verified",
} as const;

const ERRORS: Record<string, string> = {
  vendor: "Pick a vendor who hasn't applied or been invited yet.",
  type: "Pick a stall type.",
  fee: "Add the fee in rupees: 0 if the stall is free.",
};

const lkr = new Intl.NumberFormat("en-GB");

// how many matches show at once
const SHOWN = 4;

type Props = {
  action: (form: FormData) => Promise<void>;
  // vendors who haven't applied, been invited or got a stall at this event
  vendors: StallVendor[];
  // the fee of each type that has slots, to fill in the Fee box
  fees: Partial<Record<StallType, number>>;
  closeHref: string;
  error?: string;
};

// The form inside "Invite a vendor to a stall" (O73): find a vendor, pick one, and say which
// stall and fee. The search filters as the organiser types; without JavaScript every vendor shows.
export default function InviteVendorForm({ action, vendors, fees, closeHref, error }: Props) {
  const [query, setQuery] = useState("");
  const [picked, setPicked] = useState<string | null>(null);
  const [type, setType] = useState<StallType>("Food");
  const [fee, setFee] = useState(fees.Food === undefined ? "" : `LKR ${lkr.format(fees.Food)}`);

  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  const matches = vendors
    .filter((v) => words.every((w) => `${v.name} ${v.type} ${v.city}`.toLowerCase().includes(w)))
    .slice(0, query ? SHOWN : vendors.length);

  // picking a vendor fills in their usual stall type and that type's fee
  function pick(vendor: StallVendor) {
    setPicked(vendor.id);
    changeType(vendor.type);
  }

  function changeType(next: StallType) {
    setType(next);
    const nextFee = fees[next];
    if (nextFee !== undefined) setFee(`LKR ${lkr.format(nextFee)}`);
  }

  return (
    <form action={action} className={styles.dialogForm}>
      <label className={shell.srOnly} htmlFor="vendor-search">
        {TEXT.search}
      </label>
      <input
        id="vendor-search"
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={TEXT.search}
        className={forms.input}
        autoComplete="off"
      />

      <fieldset className={styles.vendorList}>
        <legend className={shell.srOnly}>{TEXT.vendors}</legend>
        {matches.length === 0 && <p className={forms.hint}>{TEXT.noMatch}</p>}
        {matches.map((v) => (
          <label key={v.id} className={`${forms.choice} ${styles.vendorChoice}`}>
            <input type="radio" name="vendor" value={v.id} checked={picked === v.id} onChange={() => pick(v)} required />
            <Thumb size={40} shape="round" />
            <span className={forms.choiceText}>
              <span className={forms.choiceTitle}>{v.name}</span>
              <span className={styles.vendorMeta}>
                {[v.type, `★ ${v.rating}`, v.verified && TEXT.verified, v.city].filter(Boolean).join(" · ")}
              </span>
            </span>
            <span className={forms.choiceDot} aria-hidden="true" />
          </label>
        ))}
      </fieldset>

      <div className={forms.row2}>
        <label className={forms.field}>
          <span className={forms.label}>{TEXT.type}</span>
          <select name="type" value={type} onChange={(e) => changeType(e.target.value as StallType)} className={forms.input}>
            {STALL_TYPES.map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
        </label>
        <label className={forms.field}>
          <span className={forms.label}>{TEXT.fee}</span>
          <input
            name="fee"
            required
            inputMode="numeric"
            value={fee}
            onChange={(e) => setFee(e.target.value)}
            placeholder="LKR 12,000"
            className={forms.input}
            aria-invalid={error === "fee" || undefined}
          />
        </label>
      </div>

      <label className={forms.field}>
        <span className={forms.label}>{TEXT.message}</span>
        <textarea name="message" rows={2} placeholder={TEXT.messagePlaceholder} className={`${forms.input} ${styles.message}`} />
      </label>

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
          {TEXT.send}
        </button>
      </div>
    </form>
  );
}
