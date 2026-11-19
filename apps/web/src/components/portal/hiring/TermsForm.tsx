"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import type { TermsFormState } from "@/app/(portal)/organiser/bookings/actions";
import Chip from "../Chip";
import Columns from "../Columns";
import Panel from "../Panel";
import forms from "../forms.module.css";
import shell from "../PortalShell.module.css";
import ui from "../ui.module.css";
import books from "./Bookings.module.css";
import styles from "./Hiring.module.css";

const TEXT = {
  title: "Propose new terms",
  lede: (name: string, event: string, first: string) => `${name} · ${event} · ${first} must accept before anything changes`,
  price: "Price",
  current: "Current",
  newPrice: "New price",
  priceHint: "Say why in the note, e.g. adding the after-party.",
  times: "Times",
  start: "Start time",
  end: "End time",
  was: (value: string) => `Was ${value}`,
  payments: "Payment terms",
  paidPart: (label: string, amount: string) => `${label} · ${amount}`,
  paidDetail: (when: string) => `Paid ${when} · cannot change`,
  paid: "Paid",
  wasAmount: (n: number) => `was ${lkr.format(n)}`,
  noteTo: (first: string) => `Note to ${first}`,
  notePlaceholder: "Can you stay for the after-party set? Same brief, 40 more photos.",
  cancel: "Cancel",
  send: (first: string) => `Send to ${first}`,
  sending: "Sending…",
  beforeAfter: "Before and after",
  noChange: "No change",
  cancellation: "Cancellation",
} as const;

const lkr = new Intl.NumberFormat("en-GB");
const asLkr = (n: number) => `LKR ${lkr.format(n)}`;
const read = (value: string) => {
  const digits = value.replace(/[^\d]/g, "");
  return digits ? Number(digits) : NaN;
};
// "17:00" → "5:00 PM"
const clock = (time: string) =>
  time ? new Date(`2000-01-01T${time}:00`).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }) : "";

export type TermsPart = { label: string; amountLkr: number; paidOn: string | null };

type Props = {
  action: (state: TermsFormState, form: FormData) => Promise<TermsFormState>;
  providerName: string;
  first: string;
  eventTitle: string;
  current: { priceLkr: number; startTime: string; endTime: string };
  parts: TermsPart[];
  cancelHref: string;
};

// "Propose new terms" (Figma O83): a new price, times and instalments, with "Before and after"
// on the right following what's typed. Paid payments can't change.
export default function TermsForm({ action, providerName, first, eventTitle, current, parts, cancelHref }: Props) {
  const [state, formAction, pending] = useActionState(action, {});
  const [price, setPrice] = useState(asLkr(current.priceLkr));
  const [times, setTimes] = useState({ start: current.startTime, end: current.endTime });
  const [amounts, setAmounts] = useState(parts.map((p) => asLkr(p.amountLkr)));
  const [note, setNote] = useState("");
  const errors = state.errors ?? {};

  // one line per thing that changes, for the panel
  const newPrice = read(price);
  const changes = [
    { title: TEXT.price, detail: newPrice !== current.priceLkr && Number.isFinite(newPrice) ? `${asLkr(current.priceLkr)} → ${lkr.format(newPrice)}` : TEXT.noChange },
    { title: TEXT.start, detail: times.start !== current.startTime ? `${clock(current.startTime)} → ${clock(times.start)}` : TEXT.noChange },
    { title: TEXT.end, detail: times.end !== current.endTime ? `${clock(current.endTime)} → ${clock(times.end)}` : TEXT.noChange },
    { title: TEXT.cancellation, detail: TEXT.noChange },
  ].filter((c, i) => i === 0 || i === 3 || c.detail !== TEXT.noChange);

  const aside = (
    <Panel title={TEXT.beforeAfter}>
      {changes.map((c) => (
        <div key={c.title} className={styles.whiteRow}>
          <span className={ui.rowText}>
            <span className={ui.rowTitle}>{c.title}</span>
            <span className={styles.sub}>{c.detail}</span>
          </span>
        </div>
      ))}
    </Panel>
  );

  return (
    <Columns aside={aside}>
      <header className={styles.pageHeadText}>
        <h1 className={styles.pageTitle}>{TEXT.title}</h1>
        <p className={styles.lede}>{TEXT.lede(providerName, eventTitle, first)}</p>
      </header>
      <form action={formAction} className={forms.form} noValidate>
        {state.message && (
          <p className={forms.alert} role="alert">
            {state.message}
          </p>
        )}

        <section className={forms.card} aria-labelledby="terms-price">
          <h2 id="terms-price" className={styles.cardTitle}>
            {TEXT.price}
          </h2>
          <div className={forms.row2}>
            <label className={forms.field}>
              <span className={forms.label}>{TEXT.current}</span>
              <input value={asLkr(current.priceLkr)} readOnly className={`${forms.input} ${styles.readOnly}`} />
            </label>
            <label className={forms.field}>
              <span className={forms.label}>{TEXT.newPrice}</span>
              <input name="price" inputMode="numeric" value={price} onChange={(e) => setPrice(e.target.value)} className={forms.input} aria-invalid={errors.price ? true : undefined} />
              {errors.price ? <span className={forms.error}>{errors.price}</span> : <span className={forms.hint}>{TEXT.priceHint}</span>}
            </label>
          </div>
        </section>

        <section className={forms.card} aria-labelledby="terms-times">
          <h2 id="terms-times" className={styles.cardTitle}>
            {TEXT.times}
          </h2>
          <div className={forms.row2}>
            <label className={forms.field}>
              <span className={forms.label}>{TEXT.start}</span>
              <input type="time" name="startTime" value={times.start} onChange={(e) => setTimes({ ...times, start: e.target.value })} className={forms.input} />
              {times.start !== current.startTime && <span className={forms.hint}>{TEXT.was(clock(current.startTime))}</span>}
            </label>
            <label className={forms.field}>
              <span className={forms.label}>{TEXT.end}</span>
              <input type="time" name="endTime" value={times.end} onChange={(e) => setTimes({ ...times, end: e.target.value })} className={forms.input} />
              {times.end !== current.endTime && <span className={forms.hint}>{TEXT.was(clock(current.endTime))}</span>}
            </label>
          </div>
        </section>

        {parts.length > 0 && (
          <section className={forms.card} aria-labelledby="terms-payments">
            <h2 id="terms-payments" className={styles.cardTitle}>
              {TEXT.payments}
            </h2>
            {parts
              .map((p, i) => ({ ...p, i }))
              .filter((p) => p.paidOn)
              .map((p) => (
                <div key={p.i} className={`${styles.whiteRow} ${styles.pageRow}`}>
                  <span className={ui.rowText}>
                    <span className={ui.rowTitle}>{TEXT.paidPart(p.label, asLkr(p.amountLkr))}</span>
                    <span className={styles.sub}>{TEXT.paidDetail(p.paidOn ?? "")}</span>
                  </span>
                  <Chip tone="good">{TEXT.paid}</Chip>
                </div>
              ))}
            <div className={forms.row2}>
              {parts.map((p, i) =>
                p.paidOn ? null : (
                  <label key={i} className={forms.field}>
                    <span className={forms.label}>{p.label}</span>
                    <span className={books.withWas}>
                      <input
                        name={`pay${i}`}
                        inputMode="numeric"
                        value={amounts[i]}
                        onChange={(e) => setAmounts((list) => list.map((v, j) => (j === i ? e.target.value : v)))}
                        className={forms.input}
                      />
                      {read(amounts[i]) !== p.amountLkr && <span className={books.was}>{TEXT.wasAmount(p.amountLkr)}</span>}
                    </span>
                  </label>
                ),
              )}
            </div>
            {errors.payments && <p className={forms.error}>{errors.payments}</p>}
          </section>
        )}

        <section className={forms.card}>
          <label className={forms.field}>
            <span className={forms.label}>{TEXT.noteTo(first)}</span>
            <textarea name="note" rows={3} value={note} onChange={(e) => setNote(e.target.value)} placeholder={TEXT.notePlaceholder} className={`${forms.input} ${books.textarea}`} />
          </label>
        </section>

        <div className={styles.formActions}>
          <Link href={cancelHref} className={forms.bigButton}>
            {TEXT.cancel}
          </Link>
          <button type="submit" className={`${forms.bigButton} ${forms.bigButtonPrimary} ${styles.send}`} disabled={pending}>
            {pending ? TEXT.sending : TEXT.send(first)}
          </button>
        </div>
        <span className={shell.srOnly} aria-live="polite">
          {changes.map((c) => `${c.title}: ${c.detail}`).join(". ")}
        </span>
      </form>
    </Columns>
  );
}
