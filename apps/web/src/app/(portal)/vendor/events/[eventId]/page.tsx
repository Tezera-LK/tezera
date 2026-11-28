import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import Chip from "@/components/portal/Chip";
import Columns from "@/components/portal/Columns";
import Panel from "@/components/portal/Panel";
import Tabs from "@/components/portal/Tabs";
import Thumb from "@/components/portal/Thumb";
import CopyLink from "@/components/portal/events/CopyLink";
import Dialog from "@/components/portal/events/Dialog";
import events from "@/components/portal/events/EventPages.module.css";
import forms from "@/components/portal/forms.module.css";
import hiring from "@/components/portal/hiring/Hiring.module.css";
import styles from "@/components/portal/provider/Provider.module.css";
import StallMap from "@/components/portal/provider/StallMap";
import ui from "@/components/portal/ui.module.css";
import { requireRole } from "@/lib/auth/session";
import { getProviderState } from "@/lib/data/provider";
import type { ProviderEvent } from "@/lib/data/provider-types";
import { daysFrom, formatWhen } from "@/lib/format";
import { clock, day, lkr, organiserName, shortDay, stillDue } from "@/lib/provider";
import { routes } from "@/lib/routes";
import { followOrganiser } from "../../home-actions";
import { askOrganiser } from "../actions";

export const metadata: Metadata = { title: "Event" };

const TEXT = {
  when: (d: string, from: string, to: string, venue: string) => `${d} · ${from} – ${to} · ${venue}`,
  verifiedOrganiser: "✓ Verified organiser",
  organiserLine: (r: number, n: number) => `Organiser · ★ ${r} from providers · ${n} past events`,
  follow: "Follow",
  myStall: (n: string) => `My stall · ${n}`,
  myBooking: (what: string) => `My booking · ${what}`,
  ask: "Ask a question",
  share: "Share",
  tabsLabel: "About the event",
  // Figma's order; vendors open on Stall vendors (V07), freelancers on Line-up (F07)
  tabs: { about: "About", lineup: "Line-up", vendors: "Stall vendors", qa: "Q&A" },
  vendorsTitle: (n: number) => `Stall vendors · ${n} confirmed`,
  findOnMap: "Find on map",
  you: "You",
  noVendors: "No stalls confirmed yet.",
  about: "About",
  entry: "Entry",
  category: "Category",
  organiser: "Organiser",
  lineup: "Line-up",
  noLineup: "The organiser hasn't posted a line-up yet.",
  shotList: "Line-up · your shot list",
  openBrief: "Open the brief",
  qaTitle: "Questions and answers",
  askTitle: "Ask the organiser",
  public: "Questions and answers are public",
  post: "Post question",
  questionError: "Write a question first, up to 300 characters.",
  answeredBy: (who: string, answer: string) => `Answered by ${who}: ${answer}`,
  daysAgo: (n: number) => (n <= 0 ? "today" : n === 1 ? "yesterday" : `${n} days ago`),
  waiting: "Waiting",
  waitingFor: "Waiting for the organiser",
  youAsked: (when: string) => `You asked · ${when}`,
  noQuestions: "No questions yet.",
  venueMap: "Venue map",
  openMyStall: "Open my stall on the map",
  check: "Check the organiser",
  checked: "Checked by Tezera admins",
  since: "Since 2023",
  rating: (r: number) => `★ ${r} from providers`,
  ratingSub: (n: number) => `${n} reviews · payment, communication, planning`,
  paidOnTime: (pct: number) => `${pct}% paid on time`,
  paidNote: "Share of bookings paid by the due date",
  stallSlots: "Stall slots",
  slotLine: (type: string, left: number) => `${type} · ${left} left`,
  slotSub: (fee: string, by: string) => `${fee} · apply by ${by}`,
  apply: "Apply",
  status: "Event status",
  updated: (on: string) => `Last updated by the organiser ${on}`,
  board: "Event board",
  boardText: (n: number, vendor: boolean) => `${n} posts · ${vendor ? "vendors share setup tips here." : "crew and vendors share tips here."}`,
  // the freelancer's booking at this event (F07)
  yourBooking: "Your booking",
  confirmed: "Confirmed",
  due: "Due",
  dueOn: (amount: string, on: string) => `${amount} · due ${on}`,
  paidInFull: "Paid in full",
  openBoard: "Open board",
  privateTitle: "Private question?",
  privateText: "Use chat for anything about your booking.",
  message: (who: string) => `Message ${who}`,
  close: "Close",
  shareTitle: (t: string) => `Share ${t}`,
  shareSub: "A short link with a preview image",
  copy: "Copy link",
  copied: "Copied",
  shareTo: ["WhatsApp", "Instagram", "Facebook", "Email"],
} as const;

type Tab = keyof typeof TEXT.tabs;
const TABS = Object.keys(TEXT.tabs) as Tab[];

type Props = { params: Promise<{ eventId: string }>; searchParams: Promise<{ tab?: string; dialog?: string; error?: string }> };

// An event as vendors and freelancers see it (Figma V07 stall vendors, V88 about, V89 Q&A): the
// provider's own stall or booking, the organiser check and the venue map. Share (V87) opens as a
// dialog with ?dialog=share.
export default async function ProviderEventPage({ params, searchParams }: Props) {
  const session = await requireRole("vendor", "freelancer");
  const { eventId } = await params;
  const state = await getProviderState(session);
  const event = state?.events.find((e) => e.id === eventId);
  if (!state || !event) notFound();
  const q = await searchParams;
  const vendor = state.kind === "vendor";
  const first: Tab = vendor ? "vendors" : "lineup";
  const tab: Tab = TABS.find((t) => t === q.tab) ?? first;
  const here = routes.vendorArea.event(event.id);
  const tabHref = (t: Tab) => (t === first ? here : `${here}?tab=${t}`);
  const now = new Date();
  const who = organiserName(state, event.organiserId);
  const organiser = state.organisers.find((o) => o.id === event.organiserId);
  const myStall = state.stalls.find((s) => s.eventId === event.id && s.application?.status === "approved")?.application?.stall ?? null;
  const myBooking = state.bookings.find((b) => b.eventTitle === event.title && !b.cancelled);
  const following = state.following.includes(event.organiserId);
  const nextPayment = myBooking ? stillDue(myBooking)[0] : undefined;
  const ago = (iso: string) => TEXT.daysAgo(-daysFrom(now, iso));

  const aside = (
    <>
      {tab === "about" && (
        <>
          <Panel title={TEXT.status}>
            <div className={hiring.whiteRow}>
              <span className={ui.rowText}>
                <span className={ui.rowTitle}>{event.status}</span>
                <span className={hiring.sub}>{TEXT.updated(shortDay(event.statusUpdated))}</span>
              </span>
              <Chip tone={event.status === "On time" ? "good" : "warn"}>{event.status}</Chip>
            </div>
          </Panel>
          <Panel title={TEXT.board}>
            <p className={styles.foot}>{TEXT.boardText(event.boardPosts, vendor)}</p>
            <Link href={routes.vendorArea.board(event.id)} className={ui.wideButton}>
              {TEXT.openBoard}
            </Link>
          </Panel>
        </>
      )}
      {tab === "qa" && (
        <Panel title={TEXT.privateTitle}>
          <p className={styles.foot}>{TEXT.privateText}</p>
          <Link href={`${routes.vendorArea.messages}?to=${event.organiserId}`} className={ui.wideButton}>
            {TEXT.message(who)}
          </Link>
        </Panel>
      )}
      {(tab === "vendors" || tab === "lineup") && (
        <>
          {!vendor && myBooking && (
            <Panel title={TEXT.yourBooking}>
              <div className={hiring.whiteRow}>
                <span className={ui.rowText}>
                  <span className={ui.rowTitle}>{myBooking.serviceDetail.split(",")[0]}</span>
                  <span className={hiring.sub}>{`${day(myBooking.date)} · ${lkr(myBooking.priceLkr)}`}</span>
                </span>
                <Chip tone="good">{TEXT.confirmed}</Chip>
              </div>
              <div className={hiring.whiteRow}>
                <span className={ui.rowText}>
                  <span className={ui.rowTitle}>{nextPayment ? nextPayment.label : TEXT.paidInFull}</span>
                  {nextPayment && <span className={hiring.sub}>{TEXT.dueOn(lkr(nextPayment.amountLkr), nextPayment.due ? day(nextPayment.due) : "")}</span>}
                </span>
                {nextPayment && <Chip tone="warn">{TEXT.due}</Chip>}
              </div>
              <Link href={`${routes.vendorArea.messages}?to=${event.organiserId}`} className={ui.wideButton}>
                {TEXT.message(who)}
              </Link>
            </Panel>
          )}
          {vendor && event.zones.length > 0 && (
            <Panel title={TEXT.venueMap}>
              <StallMap zones={event.zones} mine={myStall} small />
              {myStall && (
                <Link href={routes.vendorArea.venueMap} className={ui.wideButton}>
                  {TEXT.openMyStall}
                </Link>
              )}
            </Panel>
          )}
          {organiser && (
            <Panel title={TEXT.check}>
              <div className={hiring.whiteRow}>
                <span className={ui.rowText}>
                  <span className={ui.rowTitle}>{organiser.verified ? "Verified organiser ✓" : "Not verified yet"}</span>
                  <span className={hiring.sub}>{TEXT.checked}</span>
                </span>
              </div>
              <div className={hiring.whiteRow}>
                <span className={ui.rowText}>
                  <span className={ui.rowTitle}>{`${organiser.pastEvents} past events`}</span>
                  <span className={hiring.sub}>{organiser.about}</span>
                </span>
              </div>
              <div className={hiring.whiteRow}>
                <span className={ui.rowText}>
                  <span className={ui.rowTitle}>{TEXT.rating(organiser.rating)}</span>
                  <span className={hiring.sub}>{TEXT.ratingSub(organiser.reviews)}</span>
                </span>
              </div>
              <div className={hiring.whiteRow}>
                <span className={ui.rowText}>
                  <span className={ui.rowTitle}>{TEXT.paidOnTime(organiser.paidOnTime)}</span>
                  <span className={hiring.sub}>{TEXT.paidNote}</span>
                </span>
              </div>
            </Panel>
          )}
          {!vendor && (
            <Panel title={TEXT.board}>
              <p className={styles.foot}>{TEXT.boardText(event.boardPosts, vendor)}</p>
              <Link href={routes.vendorArea.board(event.id)} className={ui.wideButton}>
                {TEXT.openBoard}
              </Link>
            </Panel>
          )}
          {vendor && event.slots.length > 0 && (
            <Panel title={TEXT.stallSlots}>
              {event.slots.map((slot) => {
                const call = state.stalls.find((s) => s.eventId === event.id && !s.application);
                return (
                  <div key={slot.type} className={hiring.whiteRow}>
                    <span className={ui.rowText}>
                      <span className={ui.rowTitle}>{TEXT.slotLine(slot.type, slot.left)}</span>
                      <span className={hiring.sub}>{TEXT.slotSub(lkr(slot.feeLkr), shortDay(slot.applyBy))}</span>
                    </span>
                    {call && (
                      <Link href={routes.vendorArea.applyForStall(call.id)} className={`${ui.rowButton} ${ui.rowButtonPrimary}`}>
                        {TEXT.apply}
                      </Link>
                    )}
                  </div>
                );
              })}
            </Panel>
          )}
        </>
      )}
    </>
  );

  return (
    <>
      <Columns aside={aside}>
        <span className={styles.fluid}>
          <Thumb size={744} height={180} shape="image" />
        </span>
        <header className={hiring.pageHeadText}>
          <div className={styles.inline}>
            <h1 className={hiring.pageTitle}>{event.title}</h1>
            <Chip tone={event.status === "On time" ? "good" : "warn"}>{event.status}</Chip>
          </div>
          <p className={hiring.lede}>{TEXT.when(day(event.date), clock(event.startTime), clock(event.endTime), event.venue)}</p>
        </header>
        <div className={hiring.whiteRow}>
          <Thumb size={40} shape="round" />
          <Link href={routes.vendorArea.organiser(event.organiserId)} className={`${ui.rowText} ${styles.plainLink}`}>
            <span className={ui.rowTitle}>{organiser?.verified ? `${who} ✓` : who}</span>
            {organiser && <span className={hiring.sub}>{TEXT.organiserLine(organiser.rating, organiser.pastEvents)}</span>}
          </Link>
          {!following && (
            <form action={followOrganiser.bind(null, event.organiserId, true, tabHref(tab))}>
              <button type="submit" className={`${ui.rowButton} ${ui.rowButtonPrimary}`}>
                {TEXT.follow}
              </button>
            </form>
          )}
        </div>
        <div className={styles.buttonRow}>
          {myStall ? (
            <Link href={routes.vendorArea.listing} className={`${forms.bigButton} ${forms.bigButtonPrimary}`}>
              {TEXT.myStall(myStall)}
            </Link>
          ) : (
            myBooking && (
              <Link href={routes.vendorArea.booking(myBooking.id)} className={`${forms.bigButton} ${forms.bigButtonPrimary}`}>
                {TEXT.myBooking(myBooking.service.split(" ").pop() ?? myBooking.service)}
              </Link>
            )
          )}
          <Link href={`${here}?tab=qa`} className={forms.bigButton}>
            {TEXT.ask}
          </Link>
          <Link href={`${here}?tab=${tab}&dialog=share`} scroll={false} className={forms.bigButton}>
            {TEXT.share}
          </Link>
        </div>
        <Tabs label={TEXT.tabsLabel} current={tab} tabs={TABS.map((t) => ({ key: t, label: TEXT.tabs[t], href: tabHref(t) }))} />

        {tab === "vendors" && (
          <section className={events.card} aria-labelledby="vendors-title">
            <h2 id="vendors-title" className={hiring.cardTitle}>
              {TEXT.vendorsTitle(event.vendors.length)}
            </h2>
            {event.vendors.length === 0 && <p className={ui.muted}>{TEXT.noVendors}</p>}
            {event.vendors.map((v) => (
              <div key={v.stall} className={styles.greyRow}>
                <span className={ui.rowText}>
                  <span className={ui.rowTitle}>{`${v.stall} · ${v.name}`}</span>
                  <span className={hiring.sub}>{`${v.type} · ${v.detail} · ★ ${v.rating}`}</span>
                </span>
                {v.mine && <Chip tone="soft">{TEXT.you}</Chip>}
                {vendor && (
                  <Link href={`${routes.vendorArea.venueMap}?q=${encodeURIComponent(v.items[0]?.name ?? v.detail)}`} className={`${ui.rowButton} ${ui.rowButtonWhite}`}>
                    {TEXT.findOnMap}
                  </Link>
                )}
              </div>
            ))}
          </section>
        )}
        {tab === "vendors" && vendor && <QuestionsCard event={event} who={who} here={here} ago={ago} />}

        {tab === "about" && (
          <section className={events.card} aria-labelledby="about-title">
            <h2 id="about-title" className={hiring.cardTitle}>
              {TEXT.about}
            </h2>
            <p className={styles.foot}>{event.about}</p>
            <dl className={events.facts}>
              <dt>{TEXT.entry}</dt>
              <dd>{event.entry}</dd>
              <dt>{TEXT.category}</dt>
              <dd>{event.category}</dd>
              <dt>{TEXT.organiser}</dt>
              <dd>{organiser?.verified ? `${who} ✓` : who}</dd>
            </dl>
            {event.lineup.length > 0 && <LineUp lineup={event.lineup} />}
          </section>
        )}

        {tab === "lineup" &&
          (vendor ? (
            <section className={events.card} aria-labelledby="lineup-title">
              {event.lineup.length ? <LineUp lineup={event.lineup} /> : <p className={ui.muted}>{TEXT.noLineup}</p>}
            </section>
          ) : (
            <>
              <section className={events.card} aria-labelledby="lineup-title">
                <div className={hiring.cardHead}>
                  <h2 id="lineup-title" className={hiring.cardTitle}>
                    {TEXT.shotList}
                  </h2>
                  {myBooking && (
                    <Link href={routes.vendorArea.booking(myBooking.id)} className={ui.textLink}>
                      {TEXT.openBrief}
                    </Link>
                  )}
                </div>
                {event.lineup.length === 0 && <p className={ui.muted}>{TEXT.noLineup}</p>}
                {[...event.lineup]
                  .sort((a, b) => a.time.localeCompare(b.time))
                  .map((l) => (
                    <div key={`${l.stage}-${l.time}`} className={styles.greyRow}>
                      <span className={ui.rowText}>
                        <span className={ui.rowTitle}>{l.act}</span>
                        <span className={hiring.sub}>{`${l.stage} · ${clock(l.time)}`}</span>
                      </span>
                      {l.shot && <Chip tone="soft">{l.shot}</Chip>}
                    </div>
                  ))}
              </section>
              <QuestionsCard event={event} who={who} here={here} ago={ago} />
            </>
          ))}

        {tab === "qa" && (
          <>
            <form action={askOrganiser.bind(null, event.id)} className={forms.card}>
              <label className={forms.field}>
                <span className={hiring.cardTitle}>{TEXT.askTitle}</span>
                <textarea name="question" rows={2} required maxLength={300} className={forms.input} />
                <span className={forms.hint}>{TEXT.public}</span>
              </label>
              {q.error === "question" && <p className={forms.error}>{TEXT.questionError}</p>}
              <button type="submit" className={`${forms.bigButton} ${forms.bigButtonPrimary}`}>
                {TEXT.post}
              </button>
            </form>
            <section className={events.card} aria-labelledby="qa-title">
              <h2 id="qa-title" className={hiring.cardTitle}>
                {TEXT.qaTitle}
              </h2>
              {event.questions.length === 0 && <p className={ui.muted}>{TEXT.noQuestions}</p>}
              {event.questions.map((question) => (
                <div key={question.id} className={styles.greyRow}>
                  <span className={ui.rowText}>
                    <span className={ui.rowTitle}>{question.text}</span>
                    <span className={hiring.sub}>
                      {question.answer
                        ? `${TEXT.answeredBy(who, question.answer)} · ${ago(question.answeredAt ?? question.askedAt)}`
                        : question.mine
                          ? TEXT.youAsked(formatWhen(question.askedAt, now))
                          : TEXT.waitingFor}
                    </span>
                  </span>
                  {!question.answer && <Chip tone="neutral">{TEXT.waiting}</Chip>}
                </div>
              ))}
            </section>
          </>
        )}
      </Columns>

      {q.dialog === "share" && (
        <Dialog title={TEXT.shareTitle(event.title)} subtitle={TEXT.shareSub} closeHref={tabHref(tab)} closeLabel={TEXT.close} narrow>
          <span className={styles.fluid}>
            <Thumb size={520} height={160} shape="image" />
          </span>
          <p className={ui.rowTitle}>{`${event.title} · ${day(event.date)}`}</p>
          <div className={styles.searchRow}>
            <span className={`${forms.input} ${styles.inline}`}>{event.link}</span>
            <CopyLink path={routes.event(event.id)} label={TEXT.copy} copied={TEXT.copied} />
          </div>
          <ul className={ui.chipList}>
            {TEXT.shareTo.map((s) => (
              <li key={s} className={`${styles.pill} ${styles.pillGrey}`}>
                {s}
              </li>
            ))}
          </ul>
        </Dialog>
      )}
    </>
  );
}

// The first questions under the main tab, with a link to ask one (V07, F07).
function QuestionsCard({ event, who, here, ago }: { event: ProviderEvent; who: string; here: string; ago: (iso: string) => string }) {
  return (
    <section className={events.card} aria-labelledby="questions-title">
      <div className={hiring.cardHead}>
        <h2 id="questions-title" className={hiring.cardTitle}>
          {TEXT.qaTitle}
        </h2>
        <Link href={`${here}?tab=qa`} className={ui.textLink}>
          {TEXT.ask}
        </Link>
      </div>
      {event.questions.length === 0 && <p className={ui.muted}>{TEXT.noQuestions}</p>}
      {event.questions.slice(0, 2).map((question) => (
        <div key={question.id} className={styles.greyRow}>
          <span className={ui.rowText}>
            <span className={ui.rowTitle}>{question.text}</span>
            <span className={hiring.sub}>{question.answer ? `${TEXT.answeredBy(who, question.answer)} · ${ago(question.answeredAt ?? question.askedAt)}` : TEXT.waitingFor}</span>
          </span>
          {!question.answer && <Chip tone="neutral">{TEXT.waiting}</Chip>}
        </div>
      ))}
    </section>
  );
}

function LineUp({ lineup }: { lineup: { stage: string; time: string; act: string }[] }) {
  return (
    <>
      <h3 className={hiring.cardTitle}>{TEXT.lineup}</h3>
      <dl className={events.facts}>
        {lineup.map((l) => (
          <Row key={`${l.stage}-${l.time}`} label={`${l.stage} · ${clock(l.time)}`} value={l.act} />
        ))}
      </dl>
    </>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <>
      <dt>{label}</dt>
      <dd>{value}</dd>
    </>
  );
}
