"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import type { HiringFormState } from "@/app/(portal)/organiser/hiring/actions";
import MaybeLink from "../MaybeLink";
import forms from "../forms.module.css";
import shell from "../PortalShell.module.css";
import ui from "../ui.module.css";
import styles from "./Hiring.module.css";

const TEXT = {
  eventAndTime: "Event and time",
  event: "Event",
  date: "Date",
  start: "Start time",
  end: "End time",
  location: "Location",
  fromEvent: "Taken from the event",
  budget: "Budget",
  brief: "Brief",
  briefHint: (first: string) => `Fill in what you know. ${first} only sees the fields you fill in.`,
  service: "Service",
  servicePlaceholder: "Event photography",
  duration: "Duration",
  durationPlaceholder: "6.5 hours",
  audience: "Expected audience",
  people: "people",
  deliverables: "Deliverables",
  deliverablesPlaceholder: "300 edited photos within 7 days",
  runOfShow: "Run-of-show timings",
  runOfShowPlaceholder: "Gates 5:30 PM · headline set 9:00 PM · finish 11:30 PM",
  equipment: "Equipment provided",
  equipmentPlaceholder: "What you provide at the venue",
  attach: "+ Attach brief",
  payments: "Payment terms",
  paymentsHint: (first: string) =>
    `Pay in the app through ${first}'s PayHere account (test), or outside Tezera. The booking keeps a record either way.`,
  payment: "Payment",
  amount: "Amount",
  due: "Due",
  remove: (label: string) => `Remove ${label}`,
  addInstalment: "+ Add an instalment",
  cancellation: "Cancellation terms",
  ifYouCancel: "If you cancel",
  ifTheyCancel: (first: string) => `If ${first} cancels`,
  youCancel: (first: string) => `${first} keeps the deposit if you cancel within 7 days of the event.`,
  theyCancel: "You get back everything you paid.",
  discard: "Discard",
  send: "Send request",
  sending: "Sending…",
} as const;

export type BookableEvent = { id: string; title: string; date: string; startTime: string; endTime: string; location: string };

type Props = {
  action: (state: HiringFormState, form: FormData) => Promise<HiringFormState>;
  events: BookableEvent[];
  eventId: string;
  // the provider's first name, or the business name for a vendor
  first: string;
  // what the budget starts at: the provider's lowest price
  budget: number;
  discardHref: string;
};

const lkr = new Intl.NumberFormat("en-GB");
const asLkr = (n: number) => `LKR ${lkr.format(n)}`;

// The booking request form (Figma O19). Picking an event fills in its date, times and place.
// The payments start as a deposit and one instalment that add up to the budget; more
// instalments can be added. It's a client component for those two things.
export default function BookingRequestForm({ action, events, eventId, first, budget, discardHref }: Props) {
  const [state, formAction, pending] = useActionState(action, {});
  const [picked, setPicked] = useState(events.find((e) => e.id === eventId) ?? events[0]);
  const [times, setTimes] = useState({ date: picked?.date ?? "", start: picked?.startTime ?? "", end: picked?.endTime ?? "" });
  const deposit = Math.round(budget / 3 / 1000) * 1000;
  const [payments, setPayments] = useState([
    { key: 0, amount: asLkr(deposit), due: "" },
    { key: 1, amount: asLkr(budget - deposit), due: "" },
  ]);
  // every other field is controlled too: React clears uncontrolled fields after a form action,
  // and a request that comes back with errors has to keep what was typed
  const [text, setText] = useState({
    budget: asLkr(budget),
    service: "",
    duration: "",
    audience: "",
    deliverables: "",
    runOfShow: "",
    equipment: "",
  });
  const bind = (name: keyof typeof text) => ({
    name,
    value: text[name],
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => setText((t) => ({ ...t, [name]: e.target.value })),
  });
  const errors = state.errors ?? {};

  function pickEvent(id: string) {
    const next = events.find((e) => e.id === id);
    if (!next) return;
    setPicked(next);
    setTimes({ date: next.date, start: next.startTime, end: next.endTime });
  }

  const setPayment = (key: number, change: Partial<{ amount: string; due: string }>) =>
    setPayments((list) => list.map((p) => (p.key === key ? { ...p, ...change } : p)));

  const err = (name: string) => errors[name] && <span className={forms.error}>{errors[name]}</span>;

  return (
    <form action={formAction} className={forms.form} noValidate>
      {state.message && (
        <p className={forms.alert} role="alert">
          {state.message}
        </p>
      )}

      <section className={forms.section} aria-labelledby="req-event">
        <h2 id="req-event" className={ui.sectionTitle}>
          {TEXT.eventAndTime}
        </h2>
        <div className={forms.card}>
          <label className={forms.field}>
            <span className={forms.label}>{TEXT.event}</span>
            <select name="event" value={picked?.id ?? ""} onChange={(e) => pickEvent(e.target.value)} className={forms.input} aria-invalid={!!errors.event || undefined}>
              {events.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.title}
                </option>
              ))}
            </select>
            {err("event")}
          </label>
          <div className={forms.row3}>
            <label className={forms.field}>
              <span className={forms.label}>{TEXT.date}</span>
              <input type="date" name="date" value={times.date} onChange={(e) => setTimes({ ...times, date: e.target.value })} className={forms.input} aria-invalid={!!errors.date || undefined} />
              {err("date")}
            </label>
            <label className={forms.field}>
              <span className={forms.label}>{TEXT.start}</span>
              <input type="time" name="startTime" value={times.start} onChange={(e) => setTimes({ ...times, start: e.target.value })} className={forms.input} aria-invalid={!!errors.startTime || undefined} />
              {err("startTime")}
            </label>
            <label className={forms.field}>
              <span className={forms.label}>{TEXT.end}</span>
              <input type="time" name="endTime" value={times.end} onChange={(e) => setTimes({ ...times, end: e.target.value })} className={forms.input} />
            </label>
          </div>
          <div className={forms.row2}>
            <label className={forms.field}>
              <span className={forms.label}>{TEXT.location}</span>
              <input name="location" value={picked?.location ?? ""} readOnly className={`${forms.input} ${styles.readOnly}`} aria-describedby="location-hint" />
            </label>
            <label className={forms.field}>
              <span className={forms.label}>{TEXT.budget}</span>
              <input {...bind("budget")} inputMode="numeric" className={forms.input} aria-invalid={!!errors.budget || undefined} />
              {err("budget")}
            </label>
          </div>
          <p id="location-hint" className={forms.hint}>
            {TEXT.fromEvent}
          </p>
        </div>
      </section>

      <section className={forms.section} aria-labelledby="req-brief">
        <h2 id="req-brief" className={ui.sectionTitle}>
          {TEXT.brief}
        </h2>
        <div className={forms.card}>
          <p className={forms.hint}>{TEXT.briefHint(first)}</p>
          <div className={forms.row2}>
            <label className={forms.field}>
              <span className={forms.label}>{TEXT.service}</span>
              <input {...bind("service")} placeholder={TEXT.servicePlaceholder} className={forms.input} />
            </label>
            <label className={forms.field}>
              <span className={forms.label}>{TEXT.duration}</span>
              <input {...bind("duration")} placeholder={TEXT.durationPlaceholder} className={forms.input} />
            </label>
          </div>
          <label className={forms.field}>
            <span className={forms.label}>{TEXT.audience}</span>
            <span className={styles.withUnit}>
              <input {...bind("audience")} inputMode="numeric" placeholder="3,000" className={forms.input} />
              <span className={styles.unit} aria-hidden="true">
                {TEXT.people}
              </span>
            </span>
          </label>
          <label className={forms.field}>
            <span className={forms.label}>{TEXT.deliverables}</span>
            <input {...bind("deliverables")} placeholder={TEXT.deliverablesPlaceholder} className={forms.input} />
          </label>
          <label className={forms.field}>
            <span className={forms.label}>{TEXT.runOfShow}</span>
            <input {...bind("runOfShow")} placeholder={TEXT.runOfShowPlaceholder} className={forms.input} />
          </label>
          <label className={forms.field}>
            <span className={forms.label}>{TEXT.equipment}</span>
            <input {...bind("equipment")} placeholder={TEXT.equipmentPlaceholder} className={forms.input} />
          </label>
          {/* files need storage (EN-03) */}
          <MaybeLink className={`${ui.rowButton} ${styles.attach}`}>{TEXT.attach}</MaybeLink>
        </div>
      </section>

      <section className={forms.card} aria-labelledby="req-payments">
        <div className={styles.cardHead}>
          <h2 id="req-payments" className={styles.cardTitle}>
            {TEXT.payments}
          </h2>
        </div>
        <p className={forms.hint}>{TEXT.paymentsHint(first)}</p>
        <div className={styles.payments} role="table" aria-labelledby="req-payments">
          <div className={styles.paymentRow} role="row">
            <span role="columnheader">{TEXT.payment}</span>
            <span role="columnheader">{TEXT.amount}</span>
            <span role="columnheader">{TEXT.due}</span>
            <span role="columnheader" className={shell.srOnly}>
              {TEXT.remove("")}
            </span>
          </div>
          {payments.map((p, i) => {
            const label = i === 0 ? "Deposit" : `Instalment ${i}`;
            return (
              <div key={p.key} className={styles.paymentRow} role="row">
                <span role="rowheader" className={styles.paymentLabel}>
                  {label}
                </span>
                <span role="cell">
                  <input
                    name="payAmount"
                    inputMode="numeric"
                    value={p.amount}
                    onChange={(e) => setPayment(p.key, { amount: e.target.value })}
                    aria-label={`${label} ${TEXT.amount}`}
                    className={forms.input}
                  />
                </span>
                <span role="cell">
                  <input
                    type="date"
                    name="payDue"
                    value={p.due}
                    onChange={(e) => setPayment(p.key, { due: e.target.value })}
                    aria-label={`${label} ${TEXT.due}`}
                    className={forms.input}
                  />
                </span>
                <span role="cell">
                  {i > 0 && (
                    <button
                      type="button"
                      className={forms.roundButton}
                      aria-label={TEXT.remove(label)}
                      onClick={() => setPayments((list) => list.filter((x) => x.key !== p.key))}
                    >
                      ×
                    </button>
                  )}
                </span>
              </div>
            );
          })}
        </div>
        {errors.payments && <p className={forms.error}>{errors.payments}</p>}
        <button
          type="button"
          className={styles.addLink}
          onClick={() => setPayments((list) => [...list, { key: Math.max(...list.map((x) => x.key)) + 1, amount: "", due: "" }])}
        >
          {TEXT.addInstalment}
        </button>
      </section>

      <section className={forms.card} aria-labelledby="req-cancel">
        <h2 id="req-cancel" className={styles.cardTitle}>
          {TEXT.cancellation}
        </h2>
        <dl className={styles.terms}>
          <dt>{TEXT.ifYouCancel}</dt>
          <dd>{TEXT.youCancel(first)}</dd>
          <dt>{TEXT.ifTheyCancel(first)}</dt>
          <dd>{TEXT.theyCancel}</dd>
        </dl>
      </section>

      <div className={styles.formActions}>
        <Link href={discardHref} className={forms.bigButton}>
          {TEXT.discard}
        </Link>
        <button type="submit" className={`${forms.bigButton} ${forms.bigButtonPrimary} ${styles.send}`} disabled={pending}>
          {pending ? TEXT.sending : TEXT.send}
        </button>
      </div>
    </form>
  );
}
