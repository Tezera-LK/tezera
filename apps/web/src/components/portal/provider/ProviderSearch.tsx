import Link from "next/link";
import { followOrganiser } from "@/app/(portal)/vendor/home-actions";
import Columns from "@/components/portal/Columns";
import Panel from "@/components/portal/Panel";
import Thumb from "@/components/portal/Thumb";
import hiring from "@/components/portal/hiring/Hiring.module.css";
import ui from "@/components/portal/ui.module.css";
import type { ProviderState } from "@/lib/data/provider-types";
import { daysFrom } from "@/lib/format";
import { day, lkr, noon, organiserName } from "@/lib/provider";
import { routes } from "@/lib/routes";
import styles from "./Provider.module.css";

const TEXT = {
  title: "Search",
  prompt: "Search events, organisers and job posts from the box at the top.",
  resultsFor: (q: string) => `Results for “${q}”`,
  counted: (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`,
  tabs: { all: "All", events: "Events", organisers: "Organisers", jobs: "Job posts", stalls: "Stall slots" },
  seeAll: (n: number) => `See all ${n}`,
  stallsOpen: (n: number) => `${n} stall${n === 1 ? "" : "s"} open`,
  booked: "you are booked",
  hiring: "hiring",
  organiserLine: (kind: string, district: string, events: number) => `${kind} · ${district} · ${events} events`,
  jobLine: (who: string, min: number, max: number, by: string) => `${who} · ${lkr(min)} – ${lkr(max).replace("LKR ", "")} · quotes by ${by}`,
  slotLine: (type: string, fee: number, by: string) => `${type} · ${lkr(fee)} · apply by ${by}`,
  follow: "Follow",
  noResults: "Nothing matches that. Try a shorter word, a town or an organiser's name.",
  filters: "Filters",
  district: "District",
  date: "Date",
  next3: "Next 3 months",
  onlyWith: (vendor: boolean) => (vendor ? "Has stall slots" : "Has job posts"),
  on: "On",
  off: "Off",
  recent: "Recent searches",
} as const;

type TabKey = keyof typeof TEXT.tabs;

type ProviderSearchProps = {
  state: ProviderState;
  query: string;
  tab?: string;
  // "1" keeps only events with stall slots (vendors) or job posts (freelancers)
  only?: string;
  now: Date;
};

// Search results for vendors and freelancers (Figma V84, F84): events, organisers, job posts and,
// for vendors, stall slots, from the top bar's box. Events are the next three months.
export default function ProviderSearch({ state, query, tab: rawTab, only, now }: ProviderSearchProps) {
  const vendor = state.kind === "vendor";
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  const matches = (...fields: string[]) => {
    const text = fields.join(" ").toLowerCase();
    // "festival" also finds "festivals"; every word has to be there somewhere
    return words.length > 0 && words.every((w) => text.includes(w.replace(/s$/, "")));
  };
  const onlyWith = only === "1";
  // stall calls the vendor hasn't answered; an invitation opens its own dialog instead of Apply
  const openCalls = state.stalls.filter((s) => !s.application);
  const openJobs = state.jobs.filter((j) => !j.application && Date.parse(j.quotesBy) > now.getTime());

  const events = state.events
    .filter((e) => daysFrom(now, noon(e.date)) >= 0 && daysFrom(now, noon(e.date)) <= 92)
    .filter((e) => matches(e.title, e.category, e.venue, e.about, organiserName(state, e.organiserId)))
    .filter((e) => !onlyWith || (vendor ? openCalls.some((s) => s.eventId === e.id) : openJobs.some((j) => j.eventTitle === e.title)));
  const organisers = state.organisers.filter((o) => matches(o.name, o.about, o.district));
  const jobs = openJobs.filter((j) => matches(j.title, j.eventTitle, j.tags.join(" "), organiserName(state, j.organiserId)));
  const slots = vendor ? openCalls.filter((s) => matches(s.eventTitle, s.venue, s.types.join(" "), organiserName(state, s.organiserId))) : [];

  const keys: TabKey[] = vendor ? ["all", "events", "organisers", "jobs", "stalls"] : ["all", "events", "organisers", "jobs"];
  const tab: TabKey = keys.find((k) => k === rawTab) ?? "all";
  const counts: Record<TabKey, number> = { all: 0, events: events.length, organisers: organisers.length, jobs: jobs.length, stalls: slots.length };
  const href = (changes: { tab?: TabKey; only?: boolean }) => {
    const t = changes.tab ?? tab;
    const o = changes.only ?? onlyWith;
    return `${routes.searchFor(query)}${t === "all" ? "" : `&tab=${t}`}${o ? "&only=1" : ""}`;
  };
  const here = href({});
  const show = (k: TabKey) => tab === "all" || tab === k;
  const total = events.length + organisers.length + jobs.length + slots.length;

  // what's going on at an event for this provider: open stalls, their booking, or hiring
  const eventNote = (id: string, title: string) => {
    if (vendor) {
      const call = openCalls.find((s) => s.eventId === id);
      return call ? TEXT.stallsOpen(call.slotsLeft) : "";
    }
    if (state.bookings.some((b) => b.eventTitle === title && !b.cancelled)) return TEXT.booked;
    return openJobs.some((j) => j.eventTitle === title) ? TEXT.hiring : "";
  };

  const aside = (
    <>
      <Panel title={TEXT.filters}>
        <div className={hiring.whiteRow}>
          <span className={ui.rowText}>
            <span className={ui.rowTitle}>{TEXT.district}</span>
            <span className={hiring.sub}>{state.profile.districts.join(", ")}</span>
          </span>
        </div>
        <div className={hiring.whiteRow}>
          <span className={ui.rowText}>
            <span className={ui.rowTitle}>{TEXT.date}</span>
            <span className={hiring.sub}>{TEXT.next3}</span>
          </span>
        </div>
        <Link href={href({ only: !onlyWith })} scroll={false} className={hiring.whiteRow}>
          <span className={ui.rowText}>
            <span className={ui.rowTitle}>{TEXT.onlyWith(vendor)}</span>
          </span>
          <span className={`${styles.pill} ${onlyWith ? styles.pillOn : styles.pillGrey}`}>{onlyWith ? TEXT.on : TEXT.off}</span>
        </Link>
      </Panel>
      {state.recentSearches.length > 0 && (
        <Panel title={TEXT.recent}>
          <ul className={ui.chipList}>
            {state.recentSearches.map((term) => (
              <li key={term}>
                <Link href={routes.searchFor(term)} className={ui.searchChip}>
                  {term}
                </Link>
              </li>
            ))}
          </ul>
        </Panel>
      )}
    </>
  );

  return (
    <Columns aside={aside}>
      <header className={hiring.pageHeadText}>
        <h1 className={hiring.pageTitle}>{query ? TEXT.resultsFor(query) : TEXT.title}</h1>
        {query && (
          <p className={hiring.lede}>
            {[TEXT.counted(events.length, "event", "events"), TEXT.counted(organisers.length, "organiser", "organisers"), TEXT.counted(jobs.length, "job post", "job posts")].join(", ")}
          </p>
        )}
      </header>
      {!query ? (
        <p className={ui.muted}>{TEXT.prompt}</p>
      ) : total === 0 ? (
        <p className={ui.muted}>{TEXT.noResults}</p>
      ) : (
        <>
          <nav className={styles.pills} aria-label={TEXT.title}>
            {keys.map((k) => (
              <Link key={k} href={href({ tab: k })} scroll={false} className={`${styles.pill} ${k === tab ? styles.pillOn : ""}`} aria-current={k === tab ? "page" : undefined}>
                {k === "all" ? TEXT.tabs[k] : `${TEXT.tabs[k]} · ${counts[k]}`}
              </Link>
            ))}
          </nav>

          {show("events") && events.length > 0 && (
            <section className={styles.stack} aria-labelledby="events-title">
              <div className={hiring.cardHead}>
                <h2 id="events-title" className={hiring.cardTitle}>
                  {TEXT.tabs.events}
                </h2>
                {tab === "all" && events.length > 2 && (
                  <Link href={href({ tab: "events" })} className={ui.textLink}>
                    {TEXT.seeAll(events.length)}
                  </Link>
                )}
              </div>
              <ul className={styles.feed}>
                {(tab === "all" ? events.slice(0, 2) : events).map((e) => (
                  <li key={e.id}>
                    <Link href={routes.vendorArea.event(e.id)} className={`${styles.feedCard} ${styles.plainLink}`}>
                      <span className={styles.fluid}>
                        <Thumb size={330} height={150} shape="image" />
                      </span>
                      <span className={styles.feedText}>
                        <span className={ui.rowTitle}>{e.title}</span>
                        <span className={hiring.sub}>{[day(e.date), e.venue, eventNote(e.id, e.title)].filter(Boolean).join(" · ")}</span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {show("organisers") && organisers.length > 0 && (
            <section className={styles.stack} aria-labelledby="organisers-title">
              <h2 id="organisers-title" className={hiring.cardTitle}>
                {TEXT.tabs.organisers}
              </h2>
              {organisers.map((o) => (
                <div key={o.id} className={hiring.whiteRow}>
                  <Thumb size={36} shape="round" />
                  <Link href={routes.vendorArea.organiser(o.id)} className={`${ui.rowText} ${styles.plainLink}`}>
                    <span className={ui.rowTitle}>{o.verified ? `${o.name} ✓` : o.name}</span>
                    <span className={hiring.sub}>{TEXT.organiserLine(o.about.split(" · ")[0], o.district, o.pastEvents)}</span>
                  </Link>
                  {!state.following.includes(o.id) && (
                    <form action={followOrganiser.bind(null, o.id, true, here)}>
                      <button type="submit" className={`${ui.rowButton} ${ui.rowButtonPrimary}`}>
                        {TEXT.follow}
                      </button>
                    </form>
                  )}
                </div>
              ))}
            </section>
          )}

          {show("jobs") && jobs.length > 0 && (
            <section className={styles.stack} aria-labelledby="jobs-title">
              <h2 id="jobs-title" className={hiring.cardTitle}>
                {TEXT.tabs.jobs}
              </h2>
              {jobs.map((j) => (
                <Link key={j.id} href={routes.vendorArea.job(j.id)} className={hiring.whiteRow}>
                  <Thumb size={32} />
                  <span className={ui.rowText}>
                    <span className={ui.rowTitle}>{j.title}</span>
                    <span className={hiring.sub}>{TEXT.jobLine(organiserName(state, j.organiserId), j.budgetMinLkr, j.budgetMaxLkr, day(j.quotesBy.slice(0, 10)))}</span>
                  </span>
                </Link>
              ))}
            </section>
          )}

          {vendor && show("stalls") && slots.length > 0 && (
            <section className={styles.stack} aria-labelledby="stalls-title">
              <h2 id="stalls-title" className={hiring.cardTitle}>
                {TEXT.tabs.stalls}
              </h2>
              {slots.map((s) => (
                <Link key={s.id} href={s.invited ? `${routes.vendorArea.stalls}?dialog=invitation&stall=${s.id}` : routes.vendorArea.applyForStall(s.id)} className={hiring.whiteRow}>
                  <Thumb size={32} />
                  <span className={ui.rowText}>
                    <span className={ui.rowTitle}>{s.eventTitle}</span>
                    <span className={hiring.sub}>{TEXT.slotLine(s.types.join(", "), s.feeLkr, day(s.applyBy))}</span>
                  </span>
                </Link>
              ))}
            </section>
          )}
        </>
      )}
    </Columns>
  );
}
