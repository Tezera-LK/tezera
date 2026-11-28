import type { Metadata } from "next";
import Link from "next/link";
import Chip from "@/components/portal/Chip";
import Columns from "@/components/portal/Columns";
import Panel from "@/components/portal/Panel";
import Dialog from "@/components/portal/events/Dialog";
import forms from "@/components/portal/forms.module.css";
import hiring from "@/components/portal/hiring/Hiring.module.css";
import Choice from "@/components/portal/provider/Choice";
import styles from "@/components/portal/provider/Provider.module.css";
import tables from "@/components/portal/tables.module.css";
import ui from "@/components/portal/ui.module.css";
import EmptyState from "@/components/states/EmptyState";
import { requireRole } from "@/lib/auth/session";
import { getProviderState } from "@/lib/data/provider";
import type { CalendarMark } from "@/lib/data/provider-types";
import { day, noon } from "@/lib/provider";
import { routes } from "@/lib/routes";
import { clearDates, markDates } from "./actions";

export const metadata: Metadata = { title: "Availability" };

const TEXT = {
  title: "Availability",
  lede: "Organisers can filter providers by free date. Confirmed bookings are added for you.",
  prev: "Previous month",
  next: "Next month",
  markBooked: "Mark booked",
  markUnavailable: "Mark unavailable",
  weekdays: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
  legend: { booked: "Booked", unavailable: "Unavailable", quote: "Quote out", free: "Free" },
  onCalendar: "On your calendar",
  nothing: "Nothing marked this month.",
  auto: "Auto",
  clear: "Clear",
  howTitle: "How organisers see it",
  how: (d: string) => `In provider search, an organiser who picks ${d} will not see you as free that day.`,
  emptyTitle: "No calendar yet",
  emptyText: "Your bookings and the days you mark busy show up here.",
  // V42
  close: "Close",
  markTitle: "Mark dates",
  from: "From",
  to: "To",
  bookedElsewhere: "Booked elsewhere",
  bookedHint: "An event outside Tezera. Organisers see you as busy.",
  unavailable: "Unavailable",
  unavailableHint: "Holiday or time off. Organisers see you as busy.",
  note: "Note for yourself",
  noteHint: "Only you see this",
  cancel: "Cancel",
  mark: "Mark dates",
  datesError: "Pick a start date, and an end date on or after it.",
} as const;

type Props = { searchParams: Promise<{ month?: string; dialog?: string; kind?: string; error?: string }> };

// "2026-12" → the month after or before
function shiftMonth(month: string, by: number): string {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + by, 1));
  return d.toISOString().slice(0, 7);
}

// Availability (Figma V17, F17): a month calendar with booked, unavailable and quoted days, what's on
// it this month, and marking days by hand (V42) at ?dialog=mark.
export default async function AvailabilityPage({ searchParams }: Props) {
  const session = await requireRole("vendor", "freelancer");
  const state = await getProviderState(session);
  const q = await searchParams;
  const today = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Colombo" });
  // the month with the next booking by default, as Figma opens on December
  const firstBooked = state?.calendar.filter((m) => m.date >= today).sort((a, b) => a.date.localeCompare(b.date))[0]?.date;
  const month = /^\d{4}-\d{2}$/.test(q.month ?? "") ? (q.month as string) : (firstBooked ?? today).slice(0, 7);
  const here = `${routes.vendorArea.availability}?month=${month}`;

  if (!state) {
    return (
      <>
        <Header month={month} here={here} />
        <EmptyState title={TEXT.emptyTitle} description={TEXT.emptyText} />
      </>
    );
  }

  const marks = new Map(state.calendar.map((m) => [m.date, m]));
  const [y, m] = month.split("-").map(Number);
  const daysInMonth = new Date(Date.UTC(y, m, 0)).getUTCDate();
  // Monday first: how many empty cells before the 1st
  const lead = (new Date(Date.UTC(y, m - 1, 1)).getUTCDay() + 6) % 7;
  const cells: (string | null)[] = [...Array(lead).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => `${month}-${String(i + 1).padStart(2, "0")}`)];
  const inMonth = state.calendar.filter((mk) => mk.date.startsWith(month)).sort((a, b) => a.date.localeCompare(b.date));
  // hand-marked runs of days with the same note, so 25 and 26 Dec show as one "25 – 26 Dec" line
  const runs: CalendarMark[][] = [];
  for (const mk of inMonth) {
    const last = runs.at(-1)?.at(-1);
    const nextDay = last && new Date(Date.parse(`${last.date}T00:00:00Z`) + 86_400_000).toISOString().slice(0, 10);
    if (last && !mk.auto && !last.auto && last.kind === mk.kind && last.detail === mk.detail && nextDay === mk.date) runs.at(-1)?.push(mk);
    else runs.push([mk]);
  }
  const firstBusy = inMonth.find((mk) => mk.kind === "booked");

  const aside = (
    <>
      <Panel title={TEXT.onCalendar} empty={runs.length === 0 ? TEXT.nothing : undefined}>
        {runs.length > 0 &&
          runs.map((run) => {
            const first = run[0];
            const last = run.at(-1) ?? first;
            const title = run.length > 1 ? `${new Date(noon(first.date)).getUTCDate()} – ${day(last.date).replace(/^\w+ /, "")}` : day(first.date);
            return (
              <div key={first.date} className={hiring.whiteRow}>
                <span className={ui.rowText}>
                  <span className={ui.rowTitle}>{title}</span>
                  <span className={hiring.sub}>{first.detail}</span>
                </span>
                {first.auto ? (
                  <Chip tone="soft">{TEXT.auto}</Chip>
                ) : (
                  <form action={clearDates.bind(null, month, run.map((r) => r.date))}>
                    <button type="submit" className={ui.rowButton}>
                      {TEXT.clear}
                    </button>
                  </form>
                )}
              </div>
            );
          })}
      </Panel>
      <div className={hiring.notePanel}>
        <p className={hiring.notePanelTitle}>{TEXT.howTitle}</p>
        <p className={styles.foot}>{TEXT.how(firstBusy ? day(firstBusy.date) : "a busy day")}</p>
      </div>
    </>
  );

  return (
    <>
      <Columns aside={aside}>
        <Header month={month} here={here} />
        <div className={styles.calendar} role="grid" aria-label={new Date(noon(`${month}-15`)).toLocaleDateString("en-GB", { month: "long", year: "numeric", timeZone: "Asia/Colombo" })}>
          {TEXT.weekdays.map((w) => (
            <span key={w} className={styles.weekday} role="columnheader">
              {w}
            </span>
          ))}
          {cells.map((date, i) => {
            if (!date) return <span key={`pad-${i}`} aria-hidden="true" />;
            const mk = marks.get(date);
            const cls = mk?.kind === "booked" ? styles.dayBooked : mk?.kind === "unavailable" ? styles.dayOff : mk?.kind === "quote" ? styles.dayQuote : "";
            return (
              <span key={date} className={`${styles.day} ${cls}`} role="gridcell" aria-label={`${day(date)}${mk ? `, ${mk.label}` : ", free"}`}>
                <span>{Number(date.slice(8))}</span>
                {mk && <span className={styles.dayLabel}>{mk.label}</span>}
              </span>
            );
          })}
        </div>
        <p className={styles.legend}>
          <span>
            <span className={`${styles.swatch} ${styles.dayBooked}`} />
            {TEXT.legend.booked}
          </span>
          <span>
            <span className={`${styles.swatch} ${styles.dayOff}`} />
            {TEXT.legend.unavailable}
          </span>
          <span>
            <span className={`${styles.swatch} ${styles.dayQuote}`} />
            {TEXT.legend.quote}
          </span>
          <span>
            <span className={`${styles.swatch} ${styles.swatchFree}`} />
            {TEXT.legend.free}
          </span>
        </p>
      </Columns>

      {q.dialog === "mark" && (
        <Dialog title={TEXT.markTitle} closeHref={here} closeLabel={TEXT.close} narrow>
          <form action={markDates.bind(null, month)} className={tables.dialogForm}>
            <div className={forms.row2}>
              <label className={forms.field}>
                <span className={forms.label}>{TEXT.from}</span>
                <input type="date" name="from" required min={today} defaultValue={`${month}-01` < today ? today : `${month}-01`} className={forms.input} />
              </label>
              <label className={forms.field}>
                <span className={forms.label}>{TEXT.to}</span>
                <input type="date" name="to" min={today} className={forms.input} />
              </label>
            </div>
            <Choice type="radio" name="kind" value="booked" title={TEXT.bookedElsewhere} hint={TEXT.bookedHint} defaultChecked={q.kind === "booked"} />
            <Choice type="radio" name="kind" value="unavailable" title={TEXT.unavailable} hint={TEXT.unavailableHint} defaultChecked={q.kind !== "booked"} />
            <label className={forms.field}>
              <span className={forms.label}>{TEXT.note}</span>
              <input name="note" className={forms.input} />
              <span className={forms.hint}>{TEXT.noteHint}</span>
            </label>
            {q.error === "dates" && <p className={forms.error}>{TEXT.datesError}</p>}
            <div className={tables.dialogActions}>
              <Link href={here} scroll={false} className={`${forms.bigButton} ${forms.bigButtonQuiet}`}>
                {TEXT.cancel}
              </Link>
              <button type="submit" className={`${forms.bigButton} ${forms.bigButtonPrimary}`}>
                {TEXT.mark}
              </button>
            </div>
          </form>
        </Dialog>
      )}
    </>
  );
}

function Header({ month, here }: { month: string; here: string }) {
  const name = new Date(noon(`${month}-15`)).toLocaleDateString("en-GB", { month: "long", year: "numeric", timeZone: "Asia/Colombo" });
  return (
    <>
      <header className={hiring.pageHeadText}>
        <h1 className={hiring.pageTitle}>{TEXT.title}</h1>
        <p className={hiring.lede}>{TEXT.lede}</p>
      </header>
      <div className={hiring.cardHead}>
        <span className={styles.inline}>
          <Link href={`${routes.vendorArea.availability}?month=${shiftMonth(month, -1)}`} className={ui.rowButton} aria-label={TEXT.prev}>
            ‹
          </Link>
          <h2 className={hiring.cardTitle}>{name}</h2>
          <Link href={`${routes.vendorArea.availability}?month=${shiftMonth(month, 1)}`} className={ui.rowButton} aria-label={TEXT.next}>
            ›
          </Link>
        </span>
        <span className={styles.inline}>
          <Link href={`${here}&dialog=mark&kind=booked`} scroll={false} className={`${ui.rowButton} ${ui.rowButtonPrimary}`}>
            {TEXT.markBooked}
          </Link>
          <Link href={`${here}&dialog=mark&kind=unavailable`} scroll={false} className={ui.rowButton}>
            {TEXT.markUnavailable}
          </Link>
        </span>
      </div>
    </>
  );
}
