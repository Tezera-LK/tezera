import type { Metadata } from "next";
import Link from "next/link";
import Chip from "@/components/portal/Chip";
import Columns from "@/components/portal/Columns";
import Panel from "@/components/portal/Panel";
import Tabs from "@/components/portal/Tabs";
import Thumb from "@/components/portal/Thumb";
import Dialog from "@/components/portal/events/Dialog";
import events from "@/components/portal/events/EventPages.module.css";
import forms from "@/components/portal/forms.module.css";
import hiring from "@/components/portal/hiring/Hiring.module.css";
import Choice from "@/components/portal/provider/Choice";
import FileName from "@/components/portal/provider/FileName";
import styles from "@/components/portal/provider/Provider.module.css";
import tables from "@/components/portal/tables.module.css";
import ui from "@/components/portal/ui.module.css";
import EmptyState from "@/components/states/EmptyState";
import { requireRole } from "@/lib/auth/session";
import { getProviderState } from "@/lib/data/provider";
import type { ProviderState } from "@/lib/data/provider-types";
import { formatDayMonth } from "@/lib/format";
import { day, lkr, shortDay } from "@/lib/provider";
import { routes } from "@/lib/routes";
import { addPortfolio, deletePortfolio } from "./actions";

export const metadata: Metadata = { title: "Profile" };

const TEXT = {
  edit: "Edit profile",
  viewAs: "View as organiser",
  verified: "Verified",
  reviewsChip: (r: number, n: number) => `${r} · ${n} reviews`,
  rankChip: (n: number, cat: string, district: string) => `#${n} ${cat} · ${district}`,
  noLate: "No late cancellations",
  tabsLabel: "Profile sections",
  tabs: { services: "Services", portfolio: "Portfolio", reviews: "Reviews", availability: "Availability" },
  servicesTitle: "Services and indicative prices",
  from: (p: string) => `from ${p}`,
  portfolio: "Portfolio",
  addMedia: "+ Add photos or videos",
  // the third kind is a menu for vendors and a promo for freelancers (V36, F36)
  kinds: (vendor: boolean) => ({ photo: "Photo", video: "Video", menu: vendor ? "Menu" : "Promo" }),
  filters: (vendor: boolean) => ({ all: "All", photo: "Photos", video: "Videos", menu: vendor ? "Menus" : "Promos" }),
  mostViewed: "Most viewed this month",
  views: (n: number, organisers: number) => `${n} views${organisers ? ` · ${organisers} organisers` : ""}`,
  noReviews: "No reviews yet.",
  saved: "Saved. Your profile, provider search and quotes show the changes.",
  verification: "Verification",
  verifiedBusiness: "Verified business",
  verifiedIdentity: "Verified identity",
  approvedOn: (on: string) => `Approved ${on} · needed to accept bookings`,
  notVerified: "Not verified yet",
  getVerified: "Get verified",
  availability: "Availability",
  calendar: "Calendar",
  booked: "booked",
  off: "off",
  reviews: "Reviews",
  seeAll: "See all",
  reviewsFrom: (n: number, vendor: boolean) => (vendor ? `${n} reviews from organisers and guests` : `${n} reviews from organisers`),
  late: "Late cancellations",
  lateText: "None on record. Cancelling within 7 days of an event shows here.",
  tips: "Tips",
  tipsText: "Organisers look at portfolios before they book. Tag each item with the event so they can see what you did where.",
  emptyTitle: "No profile yet",
  emptyText: "Your profile shows up here once it's set up.",
  // V37, V38
  close: "Close",
  addTitle: "Add to your portfolio",
  addSub: "Photos and videos of past work",
  file: "Photo or video",
  fileHint: "JPG, PNG or MP4 · up to 50 MB each",
  caption: "Caption",
  event: "Event",
  kind: "Kind",
  cancel: "Cancel",
  add: "Add to portfolio",
  addError: "Pick a file or write a caption, and choose its kind.",
  delete: "Delete",
} as const;

type Tab = keyof typeof TEXT.tabs;
const TABS = Object.keys(TEXT.tabs) as Tab[];
type Kind = keyof ReturnType<typeof TEXT.filters>;
const KINDS: Kind[] = ["all", "photo", "video", "menu"];

type Props = { searchParams: Promise<{ tab?: string; kind?: string; dialog?: string; item?: string; error?: string; saved?: string }> };

// The provider's own profile (Figma V16, F16): services, portfolio (V36), reviews and
// availability, with verification and reviews on the right. Adding to the portfolio (V37) and
// viewing an item (V38) open as dialogs.
export default async function ProfilePage({ searchParams }: Props) {
  const session = await requireRole("vendor", "freelancer");
  const state = await getProviderState(session);
  const q = await searchParams;
  if (!state) return <EmptyState title={TEXT.emptyTitle} description={TEXT.emptyText} />;
  const p = state.profile;
  const vendor = state.kind === "vendor";
  const tab: Tab = TABS.find((t) => t === q.tab) ?? "services";
  const here = tab === "services" ? routes.vendorArea.profile : `${routes.vendorArea.profile}?tab=${tab}`;
  const join = here.includes("?") ? "&" : "?";
  const v = state.verification;
  const viewing = p.portfolio.find((x) => x.id === q.item);
  // the portfolio tab's "Most viewed this month" (V36): the two items organisers opened most
  const mostViewed = p.portfolio.filter((x) => x.views).sort((a, b) => (b.views?.count ?? 0) - (a.views?.count ?? 0)).slice(0, 2);
  const busy = state.calendar.filter((m) => m.date >= new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Colombo" })).slice(0, 3);

  const aside = (
    <>
      <Panel title={TEXT.verification}>
        <Link href={routes.vendorArea.verification} className={hiring.whiteRow}>
          <span className={ui.rowText}>
            <span className={ui.rowTitle}>{v.status === "approved" ? (vendor ? TEXT.verifiedBusiness : TEXT.verifiedIdentity) : TEXT.notVerified}</span>
            <span className={hiring.sub}>{v.status === "approved" && v.decidedAt ? TEXT.approvedOn(shortDay(v.decidedAt.slice(0, 10))) : TEXT.getVerified}</span>
          </span>
          {v.status === "approved" && (
            <span className={styles.tick} aria-label="verified">
              ✓
            </span>
          )}
        </Link>
      </Panel>
      {tab === "portfolio" ? (
        <>
          <Panel title={TEXT.tips}>
            <p className={styles.foot}>{TEXT.tipsText}</p>
          </Panel>
          {mostViewed.length > 0 && (
            <Panel title={TEXT.mostViewed}>
              {mostViewed.map((x) => (
                <Link key={x.id} href={`${here}${join}item=${x.id}`} scroll={false} className={hiring.whiteRow}>
                  <Thumb size={36} />
                  <span className={ui.rowText}>
                    <span className={ui.rowTitle}>{x.title}</span>
                    <span className={hiring.sub}>{TEXT.views(x.views?.count ?? 0, x.views?.organisers ?? 0)}</span>
                  </span>
                </Link>
              ))}
            </Panel>
          )}
        </>
      ) : (
        <>
          <Panel title={TEXT.availability} link={{ label: TEXT.calendar, href: routes.vendorArea.availability }}>
            <ul className={ui.chipList}>
              {busy.map((m) => (
                <li key={m.date} className={`${styles.pill} ${m.kind === "booked" ? styles.pillOn : styles.pillGrey}`}>
                  {`${shortDay(m.date)} · ${m.kind === "booked" ? TEXT.booked : TEXT.off}`}
                </li>
              ))}
            </ul>
          </Panel>
          <Panel title={TEXT.reviews} link={{ label: TEXT.seeAll, href: routes.vendorArea.reviews }}>
            <span className={styles.inline}>
              <span className={hiring.pageTitle}>{p.rating}</span>
              <span className={hiring.sub}>{TEXT.reviewsFrom(p.reviews, vendor)}</span>
            </span>
            {state.reviews[0] && (
              <div className={hiring.whiteRow}>
                <span className={ui.rowText}>
                  <span className={ui.rowTitle}>{`“${state.reviews[0].text.split(",")[0]}.”`}</span>
                  <span className={hiring.sub}>{`${state.reviews[0].by} · ${state.reviews[0].event}`}</span>
                </span>
              </div>
            )}
          </Panel>
          <Panel title={TEXT.late}>
            <p className={styles.foot}>{p.lateCancellations === 0 ? TEXT.lateText : `${p.lateCancellations} on record.`}</p>
          </Panel>
        </>
      )}
    </>
  );

  return (
    <>
      <Columns aside={aside}>
        <ProfileTop state={state} />
        {q.saved && (
          <p className={styles.foot} role="status">
            {TEXT.saved}
          </p>
        )}
        <Tabs label={TEXT.tabsLabel} current={tab} tabs={TABS.map((t) => ({ key: t, label: TEXT.tabs[t], href: t === "services" ? routes.vendorArea.profile : `${routes.vendorArea.profile}?tab=${t}` }))} />

        {tab === "services" && (
          <>
            <Services state={state} />
            <Portfolio state={state} kind="all" join={`${routes.vendorArea.profile}?`} limit={6} />
          </>
        )}
        {tab === "portfolio" && <Portfolio state={state} kind={KINDS.find((k) => k === q.kind) ?? "all"} join={`${here}${join}`} filters />}
        {tab === "reviews" && (
          <section className={events.card} aria-label={TEXT.reviews}>
            {state.reviews.length === 0 && <p className={ui.muted}>{TEXT.noReviews}</p>}
            {state.reviews.map((r) => (
              <div key={r.id} className={styles.greyRow}>
                <span className={ui.rowText}>
                  <span className={ui.rowTitle}>{`${r.by} · ${"★".repeat(r.stars)}`}</span>
                  <span className={hiring.sub}>{`${r.event} · ${formatDayMonth(r.at)}`}</span>
                  <span className={styles.foot}>{r.text}</span>
                </span>
              </div>
            ))}
          </section>
        )}
        {tab === "availability" && (
          <section className={events.card} aria-label={TEXT.availability}>
            {state.calendar.map((m) => (
              <div key={m.date} className={styles.greyRow}>
                <span className={ui.rowText}>
                  <span className={ui.rowTitle}>{day(m.date)}</span>
                  <span className={hiring.sub}>{m.detail}</span>
                </span>
                <Chip tone={m.kind === "booked" ? "good" : "neutral"}>{m.label}</Chip>
              </div>
            ))}
            <Link href={routes.vendorArea.availability} className={ui.wideButton}>
              {TEXT.calendar}
            </Link>
          </section>
        )}
      </Columns>

      {q.dialog === "add" && (
        <Dialog title={TEXT.addTitle} subtitle={TEXT.addSub} closeHref={here} closeLabel={TEXT.close} narrow>
          <form action={addPortfolio} className={tables.dialogForm}>
            <label className={forms.field}>
              <span className={forms.label}>{TEXT.file}</span>
              <FileName name="file" accept="image/jpeg,image/png,video/mp4" label={TEXT.file} />
              <span className={forms.hint}>{TEXT.fileHint}</span>
            </label>
            <div className={forms.row2}>
              <label className={forms.field}>
                <span className={forms.label}>{TEXT.caption}</span>
                <input name="caption" className={forms.input} />
              </label>
              <label className={forms.field}>
                <span className={forms.label}>{TEXT.event}</span>
                <input name="event" list="past-events" className={forms.input} />
                <datalist id="past-events">
                  {state.bookings.map((b) => (
                    <option key={b.id} value={b.eventTitle} />
                  ))}
                </datalist>
              </label>
            </div>
            <fieldset className={hiring.plainFieldset}>
              <legend className={forms.label}>{TEXT.kind}</legend>
              <div className={styles.pills}>
                {(["photo", "video", "menu"] as const).map((k, i) => (
                  <Choice key={k} type="radio" name="kind" value={k} title={TEXT.kinds(vendor)[k]} defaultChecked={i === 0} />
                ))}
              </div>
            </fieldset>
            {q.error === "fields" && <p className={forms.error}>{TEXT.addError}</p>}
            <div className={tables.dialogActions}>
              <Link href={here} scroll={false} className={`${forms.bigButton} ${forms.bigButtonQuiet}`}>
                {TEXT.cancel}
              </Link>
              <button type="submit" className={`${forms.bigButton} ${forms.bigButtonPrimary}`}>
                {TEXT.add}
              </button>
            </div>
          </form>
        </Dialog>
      )}
      {viewing && (
        <Dialog title={viewing.title} subtitle={TEXT.kinds(vendor)[viewing.kind]} closeHref={here} closeLabel={TEXT.close}>
          <span className={styles.fluid}>
            <Thumb size={560} height={320} shape="image" />
          </span>
          <div className={tables.dialogActions}>
            <form action={deletePortfolio.bind(null, viewing.id)}>
              <button type="submit" className={`${forms.bigButton} ${forms.bigButtonDanger}`}>
                {TEXT.delete}
              </button>
            </form>
            <Link href={here} scroll={false} className={`${forms.bigButton} ${forms.bigButtonQuiet}`}>
              {TEXT.close}
            </Link>
          </div>
        </Dialog>
      )}
    </>
  );
}

// The cover, logo, name and badges at the top of the profile (V16).
function ProfileTop({ state }: { state: ProviderState }) {
  const p = state.profile;
  return (
    <>
      <span className={`${styles.cover} ${styles.fluid}`}>
        <Thumb size={744} height={180} shape="image" />
      </span>
      <div className={styles.profileHead}>
        <span className={styles.logo}>
          <Thumb size={112} shape="round" />
        </span>
        <span className={ui.rowText}>
          <h1 className={hiring.pageTitle}>{p.name}</h1>
          <span className={hiring.sub}>{`${p.category} · ${p.districts.join(", ")}`}</span>
        </span>
        <span className={styles.inline}>
          <Link href={routes.vendorArea.editProfile} className={`${ui.rowButton} ${ui.rowButtonPrimary}`}>
            {TEXT.edit}
          </Link>
          <Link href={routes.vendorArea.profilePreview} className={`${ui.rowButton} ${ui.rowButtonWhite}`}>
            {TEXT.viewAs}
          </Link>
        </span>
      </div>
      <ul className={ui.chipList}>
        {state.verification.status === "approved" && (
          <li>
            <Chip tone="soft">{TEXT.verified}</Chip>
          </li>
        )}
        <li>
          <Chip tone="soft">{p.badge}</Chip>
        </li>
        <li className={styles.pill}>{TEXT.reviewsChip(p.rating, p.reviews)}</li>
        {p.rank && <li className={styles.pill}>{TEXT.rankChip(p.rank, p.rankCategory, p.districts[0])}</li>}
        {p.lateCancellations === 0 && (
          <li>
            <Chip tone="good">{TEXT.noLate}</Chip>
          </li>
        )}
      </ul>
    </>
  );
}

function Services({ state }: { state: ProviderState }) {
  return (
    <section className={events.card} aria-labelledby="services-title">
      <h2 id="services-title" className={hiring.cardTitle}>
        {TEXT.servicesTitle}
      </h2>
      {state.profile.services.map((s) => (
        <div key={s.id} className={styles.greyRow}>
          <span className={ui.rowText}>
            <span className={ui.rowTitle}>{s.name}</span>
            <span className={hiring.sub}>{s.detail}</span>
          </span>
          <span className={styles.amount}>{s.from ? TEXT.from(lkr(s.priceLkr)) : lkr(s.priceLkr)}</span>
        </div>
      ))}
    </section>
  );
}

// The portfolio grid (V16, V36): tiles with their kind, each opening the viewer (V38).
function Portfolio({ state, kind, join, limit, filters }: { state: ProviderState; kind: Kind; join: string; limit?: number; filters?: boolean }) {
  const all = state.profile.portfolio;
  const items = all.filter((x) => kind === "all" || x.kind === kind).slice(0, limit ?? all.length);
  const count = (k: Kind) => all.filter((x) => k === "all" || x.kind === k).length;
  const names = TEXT.filters(state.kind === "vendor");
  const kinds = TEXT.kinds(state.kind === "vendor");
  return (
    <section className={styles.stack} aria-labelledby="portfolio-title">
      <div className={hiring.cardHead}>
        <h2 id="portfolio-title" className={hiring.cardTitle}>
          {TEXT.portfolio}
        </h2>
        <Link href={`${routes.vendorArea.profile}?tab=portfolio&dialog=add`} scroll={false} className={ui.textLink}>
          {TEXT.addMedia}
        </Link>
      </div>
      {filters && (
        <div className={styles.pills}>
          {KINDS.map((k) => (
            <Link key={k} href={k === "all" ? `${routes.vendorArea.profile}?tab=portfolio` : `${routes.vendorArea.profile}?tab=portfolio&kind=${k}`} scroll={false} className={`${styles.pill} ${k === kind ? styles.pillOn : ""}`}>
              {`${names[k]} · ${count(k)}`}
            </Link>
          ))}
        </div>
      )}
      <ul className={styles.grid3}>
        {items.map((x) => (
          <li key={x.id}>
            <Link href={`${join}item=${x.id}`} scroll={false} className={`${styles.tile} ${styles.fluid}`}>
              <Thumb size={240} height={150} shape="image" />
              {x.kind !== "photo" && <span className={`${styles.tileTag} ${styles.pill}`}>{kinds[x.kind]}</span>}
            </Link>
            <p className={styles.tileCaption}>{x.title}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}
