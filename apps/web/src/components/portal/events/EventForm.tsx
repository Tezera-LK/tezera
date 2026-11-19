"use client";

import { useActionState, useId, useState } from "react";
import type { EventDraft } from "@/lib/data/portal-types";
import { AGE_RATINGS, CATEGORIES, FIELD, checklist, readEventForm, type FieldErrors } from "@/lib/event-form";
import { formatCount, formatDayMonth } from "@/lib/format";
import { routes } from "@/lib/routes";
import type { EventFormState } from "@/app/(portal)/organiser/events/actions";
import Chip from "../Chip";
import Columns from "../Columns";
import MaybeLink from "../MaybeLink";
import PageHeader from "../PageHeader";
import Panel from "../Panel";
import Thumb from "../Thumb";
import shell from "../PortalShell.module.css";
import ui from "../ui.module.css";
import forms from "../forms.module.css";
import styles from "./EventForm.module.css";
import { entryLabel } from "./eventText";

// create = a new event (O08); draft = editing a saved draft; public = editing an event people can
// already see (O54), where changes to the date or venue are announced
export type EventFormMode = "create" | "draft" | "public";

type EventFormProps = {
  mode: EventFormMode;
  // the server action that saves (actions.ts), already bound to the event id when editing
  action: (state: EventFormState, form: FormData) => Promise<EventFormState>;
  initial: EventDraft;
  // editing only: the event's id, title as saved, and who gets told about changes
  eventId?: string;
  savedTitle?: string;
  audience?: { going: number; interested: number; providers: number };
  organiser: { name: string; verified: boolean };
};

const TEXT = {
  createTitle: "Create event",
  createLede: "Save a draft at any time. People can see it once you publish.",
  draftTitle: (title: string) => `Edit ${title || "draft"}`,
  draftLede: "Draft · only you can see it until you publish",
  publicTitle: (title: string) => `Edit ${title}`,
  publicLede: "Published · changes go live when you save",
  saveDraft: "Save draft",
  publish: "Publish",
  discard: "Discard",
  saveChanges: "Save changes",
  saving: "Saving…",
  preview: "Preview event page",
  basics: "Basics",
  when: "When",
  venue: "Venue",
  about: "About",
  lineup: "Line-up or schedule",
  entry: "Entry",
  know: "Know before you go",
  title: "Title",
  category: "Category",
  pickCategory: "Pick a category",
  ageRating: "Age rating",
  date: "Date",
  startTime: "Start time",
  endTime: "End time",
  ageHint: "Age rating: ID is checked at the gate for 18+ and 21+ events.",
  venueName: "Venue name",
  address: "Address",
  description: "Description",
  cover: "Cover image",
  replace: "Replace",
  remove: "Remove",
  lineupHint: "Add each act or item with its time.",
  lineupTime: "Time",
  lineupAct: "Act or item",
  removeRow: "Remove this row",
  addRow: "+ Add a row",
  free: "Free entry",
  freeHint: "No entry price",
  paid: "Paid entry",
  price: "Ticket price (LKR)",
  ticketUrl: "Where tickets are sold",
  ticketHint: "Shown on the event page. Tickets are not sold on Tezera yet.",
  knowHint: "Only the fields you fill in show on the event page. People who marked Going are told when you change them.",
  dressCode: "Dress code",
  bring: "What to bring",
  parking: "Parking and transport",
  rules: "Rules",
  foodPrices: "Food and drink price range",
  ifRains: "If it rains",
  checklist: "Checklist",
  optional: "Optional",
  todo: "To do",
  howItLooks: "How it looks",
  untitled: "Your event's title",
  whoIsTold: "Who is told",
  going: "Going",
  interested: "Interested",
  providers: "Booked providers and stall vendors",
  inApp: "push and in the app",
  inAppEmail: "push, in the app and email",
  changed: (what: string) => `You changed the ${what}`,
  told: (going: number, interested: number) =>
    `${formatCount(going)} Going and ${formatCount(interested)} Interested will be told when you save.`,
  was: (value: string) => `Was ${value}`,
  venueMap: "Venue map",
  newMap: "Will need a new map",
  newMapHint: (venue: string) =>
    `Your map is for ${venue}. Stall numbers stay, but zones and pins need placing again on the new venue.`,
} as const;

// The create and edit event form. The real work is in EventFormBody; this outer part runs the
// server action and, when saving fails, mounts the body again with what was typed and the errors.
export default function EventForm(props: EventFormProps) {
  const [state, formAction, pending] = useActionState(props.action, {});
  return (
    <EventFormBody
      key={state.nonce ?? 0}
      {...props}
      values={state.values ?? props.initial}
      errors={state.errors ?? {}}
      message={state.message}
      formAction={formAction}
      pending={pending}
    />
  );
}

type BodyProps = EventFormProps & {
  values: EventDraft;
  errors: FieldErrors;
  message?: string;
  formAction: (form: FormData) => void;
  pending: boolean;
};

let rowKey = 0;
// a key for a line-up row, so removing one row doesn't shift what's typed in the others
const nextRowKey = () => `row-${(rowKey += 1)}`;

function EventFormBody({ mode, eventId, savedTitle, audience, organiser, initial, values, errors, message, formAction, pending }: BodyProps) {
  const formId = useId();
  // what's typed so far, for the checklist, "How it looks" and the change warnings
  const [draft, setDraft] = useState(values);
  const [rows, setRows] = useState(() =>
    (values.lineup.length > 0 ? values.lineup : [{ time: "", act: "" }]).map((item) => ({ ...item, key: nextRowKey() })),
  );
  const lineupNow = rows.filter((row) => row.act.trim()).map(({ time, act }) => ({ time, act }));
  const done = checklist({ ...draft, lineup: lineupNow });

  // what changed since the event was published (O54): the date or times, the venue, or both
  const dateChanged =
    mode === "public" &&
    (draft.date !== initial.date || draft.startTime !== initial.startTime || draft.endTime !== initial.endTime);
  const venueChanged = mode === "public" && draft.venueName !== initial.venueName;
  const changed = [dateChanged && "date", venueChanged && "venue"].filter(Boolean).join(" and ");

  // the line-up rows are controlled, so adding and removing rows keeps the checklist right
  function updateRow(key: string, change: Partial<{ time: string; act: string }>) {
    setRows((current) => current.map((row) => (row.key === key ? { ...row, ...change } : row)));
  }

  // re-reads the whole form after any change; cheap, and it keeps the side panels in step
  function onChange(event: React.FormEvent<HTMLFormElement>) {
    setDraft(readEventForm(new FormData(event.currentTarget)).draft);
  }

  // one submit button; `intent` tells the server action which one was pressed
  const submit = (intent: "draft" | "publish" | "preview", label: string, className: string) => (
    <button type="submit" form={formId} name={FIELD.intent} value={intent} className={className} disabled={pending}>
      {pending ? TEXT.saving : label}
    </button>
  );

  const header =
    mode === "public" ? (
      <PageHeader
        title={TEXT.publicTitle(savedTitle ?? draft.title)}
        description={TEXT.publicLede}
        actions={
          <>
            <MaybeLink href={eventId ? routes.manageEvent(eventId) : undefined} className={shell.button}>
              {TEXT.discard}
            </MaybeLink>
            {submit("publish", TEXT.saveChanges, `${shell.button} ${shell.buttonPrimary}`)}
          </>
        }
      />
    ) : (
      <PageHeader
        title={mode === "create" ? TEXT.createTitle : TEXT.draftTitle(savedTitle ?? draft.title)}
        description={mode === "create" ? TEXT.createLede : TEXT.draftLede}
        actions={
          <>
            {submit("draft", TEXT.saveDraft, shell.button)}
            {submit("publish", TEXT.publish, `${shell.button} ${shell.buttonPrimary}`)}
          </>
        }
      />
    );

  const aside =
    mode === "public" ? (
      <Panel title={TEXT.whoIsTold}>
        <ul className={ui.rows}>
          {[
            { title: TEXT.going, detail: `${formatCount(audience?.going ?? 0)} · ${TEXT.inApp}` },
            { title: TEXT.interested, detail: `${formatCount(audience?.interested ?? 0)} · ${TEXT.inApp}` },
            { title: TEXT.providers, detail: `${formatCount(audience?.providers ?? 0)} · ${TEXT.inAppEmail}` },
          ].map((row) => (
            <li key={row.title} className={`${ui.row} ${styles.asideRow}`}>
              <span className={ui.rowText}>
                <span className={ui.rowTitle}>{row.title}</span>
                <span className={ui.muted}>{row.detail}</span>
              </span>
            </li>
          ))}
        </ul>
      </Panel>
    ) : (
      <>
        <Panel title={TEXT.checklist}>
          <ul className={ui.rows}>
            {(
              [
                ["basics", TEXT.basics],
                ["venue", TEXT.venue],
                ["about", TEXT.about],
                ["lineup", TEXT.lineup],
                ["entry", TEXT.entry],
              ] as const
            ).map(([key, label]) => (
              <li key={key} className={`${ui.row} ${styles.asideRow}`}>
                <span className={ui.rowTitle}>{label}</span>
                {done[key] ? <Chip tone="good">✓</Chip> : <Chip tone="neutral">{TEXT.todo}</Chip>}
              </li>
            ))}
            <li className={`${ui.row} ${styles.asideRow}`}>
              <span className={ui.rowText}>
                <span className={ui.rowTitle}>{TEXT.know}</span>
                <span className={ui.muted}>{TEXT.optional}</span>
              </span>
              {done.know ? <Chip tone="good">✓</Chip> : <Chip tone="neutral">{TEXT.optional}</Chip>}
            </li>
          </ul>
        </Panel>
        <Panel title={TEXT.howItLooks}>
          <div className={styles.lookPhoto}>
            <Thumb size={308} height={140} shape="image" />
          </div>
          <p className={styles.lookTitle}>{draft.title || TEXT.untitled}</p>
          <p className={ui.muted}>
            {[draft.date && formatDayMonth(`${draft.date}T12:00:00+05:30`), draft.venueName].filter(Boolean).join(" · ")}
          </p>
          <p className={styles.lookFoot}>
            <span>{`${organiser.verified ? "✓ " : ""}${organiser.name}`}</span>
            <span>{entryLabel(draft)}</span>
          </p>
          {submit("preview", TEXT.preview, ui.wideButton)}
        </Panel>
      </>
    );

  // ---------- sections, as functions so the edit page can put them in O54's order ----------

  // the date and times: inside Basics when creating, their own card first when editing (O54)
  const when = (
    <div className={forms.row3}>
      <Text type="date" name={FIELD.date} label={TEXT.date} value={values.date} error={errors.date} hint={dateChanged && draft.date !== initial.date ? TEXT.was(formatDayMonth(`${initial.date}T12:00:00+05:30`)) : undefined} />
      <Text type="time" name={FIELD.startTime} label={TEXT.startTime} value={values.startTime} error={errors.startTime} hint={dateChanged && draft.startTime !== initial.startTime ? TEXT.was(initial.startTime) : undefined} />
      <Text type="time" name={FIELD.endTime} label={TEXT.endTime} value={values.endTime} hint={dateChanged && draft.endTime !== initial.endTime ? TEXT.was(initial.endTime) : undefined} />
    </div>
  );

  const basics = (
    <Section key="basics" title={TEXT.basics}>
      <Text name={FIELD.title} label={TEXT.title} value={values.title} error={errors.title} required />
      <div className={forms.row2}>
        <Field label={TEXT.category} name={FIELD.category} error={errors.category}>
          {(props) => (
            <select {...props} className={forms.input} defaultValue={values.category}>
              <option value="">{TEXT.pickCategory}</option>
              {CATEGORIES.map((category) => (
                <option key={category}>{category}</option>
              ))}
            </select>
          )}
        </Field>
        <Field label={TEXT.ageRating} name={FIELD.ageRating}>
          {(props) => (
            <select {...props} className={forms.input} defaultValue={values.ageRating}>
              {AGE_RATINGS.map((age) => (
                <option key={age.value} value={age.value}>
                  {age.label}
                </option>
              ))}
            </select>
          )}
        </Field>
      </div>
      {mode !== "public" && when}
      <p className={forms.hint}>{TEXT.ageHint}</p>
    </Section>
  );

  const venue = (
    <Section key="venue" title={TEXT.venue} hideTitle={mode === "public"}>
      <Text name={FIELD.venueName} label={TEXT.venueName} value={values.venueName} error={errors.venueName} hint={venueChanged ? TEXT.was(initial.venueName) : undefined} />
      <Text name={FIELD.address} label={TEXT.address} value={values.address} />
    </Section>
  );

  const about = (
    <Section key="about" title={TEXT.about}>
      <Field label={TEXT.description} name={FIELD.description}>
        {(props) => <textarea {...props} className={forms.input} defaultValue={values.description} rows={3} />}
      </Field>
      <div className={forms.field}>
        <span className={styles.coverLabel}>{TEXT.cover}</span>
        <div className={styles.cover}>
          <Thumb size={240} height={140} shape="image" />
          {/* photo upload needs storage (EN-03); drawn, not wired up */}
          <div className={styles.coverActions}>
            <MaybeLink className={`${ui.rowButton} ${ui.rowButtonWhite}`}>{TEXT.replace}</MaybeLink>
            <MaybeLink className={ui.textLink}>{TEXT.remove}</MaybeLink>
          </div>
        </div>
      </div>
    </Section>
  );

  const lineup = (
    <Section key="lineup" title={TEXT.lineup}>
      <p className={forms.hint}>{TEXT.lineupHint}</p>
      {rows.map((row, index) => (
        <div key={row.key} className={forms.lineupRow}>
          <input
            type="time"
            name={FIELD.lineupTime}
            value={row.time}
            onChange={(e) => updateRow(row.key, { time: e.target.value })}
            className={forms.input}
            aria-label={`${TEXT.lineupTime} ${index + 1}`}
          />
          <input
            name={FIELD.lineupAct}
            value={row.act}
            onChange={(e) => updateRow(row.key, { act: e.target.value })}
            className={forms.input}
            aria-label={`${TEXT.lineupAct} ${index + 1}`}
          />
          <button
            type="button"
            className={forms.roundButton}
            aria-label={`${TEXT.removeRow} (${index + 1})`}
            onClick={() => setRows((current) => current.filter((r) => r.key !== row.key))}
          >
            ×
          </button>
        </div>
      ))}
      <button
        type="button"
        className={forms.textButton}
        onClick={() => setRows((current) => [...current, { time: "", act: "", key: nextRowKey() }])}
      >
        {TEXT.addRow}
      </button>
    </Section>
  );

  const paid = draft.entry.kind === "paid";
  const entry = (
    <Section key="entry" title={TEXT.entry}>
      <label className={forms.choice}>
        <input type="radio" name={FIELD.entry} value="free" defaultChecked={values.entry.kind === "free"} />
        <span className={forms.choiceText}>
          <span className={forms.choiceTitle}>{TEXT.free}</span>
          <span className={ui.muted}>{TEXT.freeHint}</span>
        </span>
        <span className={forms.choiceDot} aria-hidden="true" />
      </label>
      <label className={forms.choice}>
        <input type="radio" name={FIELD.entry} value="paid" defaultChecked={values.entry.kind === "paid"} />
        <span className={forms.choiceText}>
          <span className={forms.choiceTitle}>{TEXT.paid}</span>
          <span className={ui.muted}>{entryLabel(draft) || TEXT.price}</span>
        </span>
        <span className={forms.choiceDot} aria-hidden="true" />
      </label>
      {/* Figma shows the price inside the paid card; it needs somewhere to type it */}
      <div hidden={!paid} className={forms.field}>
        <Text
          name={FIELD.price}
          label={TEXT.price}
          inputMode="numeric"
          value={values.entry.kind === "paid" && values.entry.priceLkr ? String(values.entry.priceLkr) : ""}
          error={errors.price}
        />
        <Text
          name={FIELD.ticketUrl}
          label={TEXT.ticketUrl}
          value={values.entry.kind === "paid" ? values.entry.ticketUrl : ""}
          hint={TEXT.ticketHint}
        />
      </div>
    </Section>
  );

  const know = (
    <Section key="know" title={TEXT.know}>
      <p className={forms.hint}>{TEXT.knowHint}</p>
      <div className={forms.row2}>
        <Text name={FIELD.dressCode} label={TEXT.dressCode} value={values.know.dressCode} />
        <Text name={FIELD.bring} label={TEXT.bring} value={values.know.bring} />
      </div>
      <Text name={FIELD.parking} label={TEXT.parking} value={values.know.parking} />
      <Text name={FIELD.rules} label={TEXT.rules} value={values.know.rules} />
      <div className={forms.row2}>
        <Text name={FIELD.foodPrices} label={TEXT.foodPrices} value={values.know.foodPrices} />
        <Text name={FIELD.ifRains} label={TEXT.ifRains} value={values.know.ifRains} />
      </div>
    </Section>
  );

  // O54's order: what changed, the date card, the venue card and the map warning first
  const sections =
    mode === "public"
      ? [
          <div key="when" className={forms.card}>{when}</div>,
          venue,
          venueChanged && (
            <div key="map" className={`${forms.card} ${styles.mapCard}`}>
              <div className={ui.sectionHead}>
                <h3 className={styles.cardTitle}>{TEXT.venueMap}</h3>
                <Chip tone="warn">{TEXT.newMap}</Chip>
              </div>
              <p className={forms.hint}>{TEXT.newMapHint(initial.venueName)}</p>
            </div>
          ),
          basics,
          about,
          lineup,
          entry,
          know,
        ]
      : [basics, venue, about, lineup, entry, know];

  return (
    <Columns aside={aside}>
      {header}
      {message && (
        <p className={forms.alert} role="alert">
          {message}
        </p>
      )}
      {mode === "public" && changed && (
        <div className={styles.changeBanner} role="status">
          <span className={styles.changeDot} aria-hidden="true" />
          <span className={ui.rowText}>
            <span className={ui.rowTitle}>{TEXT.changed(changed)}</span>
            <span className={styles.bannerText}>{TEXT.told(audience?.going ?? 0, audience?.interested ?? 0)}</span>
          </span>
        </div>
      )}
      <form id={formId} action={formAction} onChange={onChange} className={forms.form} noValidate>
        {sections}
        {mode !== "public" && (
          <div className={forms.actions}>
            {submit("draft", TEXT.saveDraft, forms.bigButton)}
            {submit("publish", TEXT.publish, `${forms.bigButton} ${forms.bigButtonPrimary}`)}
          </div>
        )}
      </form>
    </Columns>
  );
}

// One section of the form: a heading ("Basics") over a white card.
function Section({ title, hideTitle, children }: { title: string; hideTitle?: boolean; children: React.ReactNode }) {
  const id = useId();
  return (
    <section className={forms.section} aria-labelledby={id}>
      <h2 id={id} className={hideTitle ? shell.srOnly : ui.sectionTitle}>
        {title}
      </h2>
      <div className={forms.card}>{children}</div>
    </section>
  );
}

type FieldProps = {
  label: string;
  name: string;
  error?: string;
  hint?: string;
  // the input itself, given the props that tie it to the label, hint and error
  children: (props: { id: string; name: string; "aria-invalid"?: boolean; "aria-describedby"?: string }) => React.ReactNode;
};

// A label, one input, and an optional hint or error under it, all tied together for screen readers.
function Field({ label, name, error, hint, children }: FieldProps) {
  const id = useId();
  const noteId = `${id}-note`;
  return (
    <div className={forms.field}>
      <label htmlFor={id} className={forms.label}>
        {label}
      </label>
      {children({ id, name, "aria-invalid": error ? true : undefined, "aria-describedby": error || hint ? noteId : undefined })}
      {error ? (
        <p id={noteId} className={forms.error}>
          {error}
        </p>
      ) : (
        hint && (
          <p id={noteId} className={forms.hint}>
            {hint}
          </p>
        )
      )}
    </div>
  );
}

type TextProps = {
  name: string;
  label: string;
  value: string;
  error?: string;
  hint?: string;
  type?: "text" | "date" | "time";
  inputMode?: "numeric";
  required?: boolean;
};

// A Field with a plain input in it.
function Text({ name, label, value, error, hint, type = "text", inputMode, required }: TextProps) {
  return (
    <Field label={label} name={name} error={error} hint={hint}>
      {(props) => (
        <input {...props} type={type} inputMode={inputMode} defaultValue={value} className={forms.input} required={required} />
      )}
    </Field>
  );
}
