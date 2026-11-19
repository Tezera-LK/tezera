"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import type { HiringFormState } from "@/app/(portal)/organiser/hiring/actions";
import { DISTRICTS, PROVIDER_CATEGORIES } from "@/lib/hiring";
import forms from "../forms.module.css";
import ui from "../ui.module.css";
import type { BookableEvent } from "./BookingRequestForm";
import styles from "./Hiring.module.css";

const TEXT = {
  job: "The job",
  title: "Title",
  titlePlaceholder: "2 photographers, 12 Dec, Colombo",
  event: "Event",
  category: "Provider category",
  pick: "Pick one",
  date: "Date",
  start: "Start time",
  end: "End time",
  district: "District",
  requirements: "Requirements",
  requirementsHint: "The same brief as a booking request. Providers only see the fields you fill in.",
  service: "Service",
  servicePlaceholder: "Event photography, 2 people",
  duration: "Duration",
  durationPlaceholder: "6.5 hours",
  audience: "Expected audience",
  people: "people",
  deliverables: "Deliverables",
  deliverablesPlaceholder: "300 edited photos each within 7 days",
  runOfShow: "Run-of-show timings",
  runOfShowPlaceholder: "Gates 5:30 PM · headline set 9:00 PM · finish 11:30 PM",
  budgetAndDeadline: "Budget and deadline",
  budget: "Budget range, per provider",
  from: "From",
  to: "to",
  upTo: "Up to",
  closesOn: "Quotes close on",
  at: "At",
  discard: "Discard",
  post: "Post job",
  posting: "Posting…",
} as const;

type Props = {
  action: (state: HiringFormState, form: FormData) => Promise<HiringFormState>;
  events: (BookableEvent & { district: string })[];
  eventId: string;
  category: string;
  discardHref: string;
  // filled in from a cancelled booking (O86): the fields, and the green note above the form
  initial?: Partial<Record<"title" | "service" | "duration" | "runOfShow" | "budgetMin" | "budgetMax", string>>;
  prefilledNote?: { title: string; text: string };
};

// "Post a job" (Figma O20). Picking an event fills in its date, times and district. Every field
// is controlled, so a post that comes back with errors keeps what was typed.
export default function JobForm({ action, events, eventId, category, discardHref, initial, prefilledNote }: Props) {
  const [state, formAction, pending] = useActionState(action, {});
  const start = events.find((e) => e.id === eventId) ?? events[0];
  const [v, setV] = useState({
    title: "",
    event: start?.id ?? "",
    category,
    date: start?.date ?? "",
    startTime: start?.startTime ?? "",
    endTime: start?.endTime ?? "",
    district: start?.district ?? "",
    service: "",
    duration: "",
    audience: "",
    deliverables: "",
    runOfShow: "",
    budgetMin: "",
    budgetMax: "",
    closesOn: "",
    closesTime: "18:00",
    ...initial,
  });
  const errors = state.errors ?? {};

  type Key = keyof typeof v;
  const bind = (name: Key) => ({
    name,
    value: v[name],
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setV((old) => ({ ...old, [name]: e.target.value })),
    "aria-invalid": errors[name] ? true : undefined,
  });
  const err = (name: string) => errors[name] && <span className={forms.error}>{errors[name]}</span>;

  function pickEvent(id: string) {
    const next = events.find((e) => e.id === id);
    if (!next) return;
    setV((old) => ({ ...old, event: id, date: next.date, startTime: next.startTime, endTime: next.endTime, district: next.district || old.district }));
  }

  return (
    <form action={formAction} className={forms.form} noValidate>
      {prefilledNote && (
        <div className={styles.prefilled}>
          <span className={styles.prefilledDot} aria-hidden="true" />
          <span className={ui.rowText}>
            <span className={ui.rowTitle}>{prefilledNote.title}</span>
            <span className={styles.sub}>{prefilledNote.text}</span>
          </span>
        </div>
      )}
      {state.message && (
        <p className={forms.alert} role="alert">
          {state.message}
        </p>
      )}

      <section className={forms.section} aria-labelledby="job-the-job">
        <h2 id="job-the-job" className={ui.sectionTitle}>
          {TEXT.job}
        </h2>
        <div className={forms.card}>
          <label className={forms.field}>
            <span className={forms.label}>{TEXT.title}</span>
            <input {...bind("title")} placeholder={TEXT.titlePlaceholder} className={forms.input} />
            {err("title")}
          </label>
          <div className={forms.row2}>
            <label className={forms.field}>
              <span className={forms.label}>{TEXT.event}</span>
              <select name="event" value={v.event} onChange={(e) => pickEvent(e.target.value)} className={forms.input} aria-invalid={errors.event ? true : undefined}>
                {events.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.title}
                  </option>
                ))}
              </select>
              {err("event")}
            </label>
            <label className={forms.field}>
              <span className={forms.label}>{TEXT.category}</span>
              <select {...bind("category")} className={forms.input}>
                <option value="">{TEXT.pick}</option>
                {PROVIDER_CATEGORIES.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
              {err("category")}
            </label>
          </div>
          <div className={forms.row3}>
            <label className={forms.field}>
              <span className={forms.label}>{TEXT.date}</span>
              <input type="date" {...bind("date")} className={forms.input} />
              {err("date")}
            </label>
            <label className={forms.field}>
              <span className={forms.label}>{TEXT.start}</span>
              <input type="time" {...bind("startTime")} className={forms.input} />
              {err("startTime")}
            </label>
            <label className={forms.field}>
              <span className={forms.label}>{TEXT.end}</span>
              <input type="time" {...bind("endTime")} className={forms.input} />
            </label>
          </div>
          <label className={`${forms.field} ${styles.narrowField}`}>
            <span className={forms.label}>{TEXT.district}</span>
            <select {...bind("district")} className={forms.input}>
              <option value="">{TEXT.pick}</option>
              {DISTRICTS.map((d) => (
                <option key={d}>{d}</option>
              ))}
            </select>
            {err("district")}
          </label>
        </div>
      </section>

      <section className={forms.section} aria-labelledby="job-requirements">
        <h2 id="job-requirements" className={ui.sectionTitle}>
          {TEXT.requirements}
        </h2>
        <div className={forms.card}>
          <p className={forms.hint}>{TEXT.requirementsHint}</p>
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
        </div>
      </section>

      <section className={forms.section} aria-labelledby="job-budget">
        <h2 id="job-budget" className={ui.sectionTitle}>
          {TEXT.budgetAndDeadline}
        </h2>
        <div className={forms.card}>
          <fieldset className={`${forms.field} ${styles.plainFieldset}`}>
            <legend className={forms.label}>{TEXT.budget}</legend>
            <div className={styles.range}>
              <input {...bind("budgetMin")} inputMode="numeric" placeholder="LKR 25,000" aria-label={TEXT.from} className={forms.input} aria-invalid={errors.budget ? true : undefined} />
              <span aria-hidden="true">{TEXT.to}</span>
              <input {...bind("budgetMax")} inputMode="numeric" placeholder="LKR 40,000" aria-label={TEXT.upTo} className={forms.input} aria-invalid={errors.budget ? true : undefined} />
            </div>
            {err("budget")}
          </fieldset>
          <div className={forms.row2}>
            <label className={forms.field}>
              <span className={forms.label}>{TEXT.closesOn}</span>
              <input type="date" {...bind("closesOn")} max={v.date || undefined} className={forms.input} aria-invalid={errors.closes ? true : undefined} />
              {err("closes")}
            </label>
            <label className={forms.field}>
              <span className={forms.label}>{TEXT.at}</span>
              <input type="time" {...bind("closesTime")} className={forms.input} />
            </label>
          </div>
        </div>
      </section>

      <div className={styles.formActions}>
        <Link href={discardHref} className={forms.bigButton}>
          {TEXT.discard}
        </Link>
        <button type="submit" className={`${forms.bigButton} ${forms.bigButtonPrimary} ${styles.send}`} disabled={pending}>
          {pending ? TEXT.posting : TEXT.post}
        </button>
      </div>
    </form>
  );
}
