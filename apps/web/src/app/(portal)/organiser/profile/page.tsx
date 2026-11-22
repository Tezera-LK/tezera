import type { Metadata } from "next";
import Link from "next/link";
import Chip from "@/components/portal/Chip";
import Columns from "@/components/portal/Columns";
import MaybeLink from "@/components/portal/MaybeLink";
import Panel from "@/components/portal/Panel";
import Thumb from "@/components/portal/Thumb";
import CopyLink from "@/components/portal/events/CopyLink";
import Dialog from "@/components/portal/events/Dialog";
import events from "@/components/portal/events/EventPages.module.css";
import { compactCount } from "@/components/portal/events/eventText";
import forms from "@/components/portal/forms.module.css";
import hiring from "@/components/portal/hiring/Hiring.module.css";
import styles from "@/components/portal/profile/Profile.module.css";
import tables from "@/components/portal/tables.module.css";
import ui from "@/components/portal/ui.module.css";
import { requireRole } from "@/lib/auth/session";
import { getMyOrganiserProfile, getPastEventSummary, listMyEvents } from "@/lib/data/portal";
import type { ManagedEvent } from "@/lib/data/portal-types";
import { formatCount, formatDayMonth, formatShortDate } from "@/lib/format";
import { routes } from "@/lib/routes";

export const metadata: Metadata = { title: "Profile" };

const TEXT = {
  verified: "Verified",
  noBackend: "Your profile needs the backend (EN-03), which isn't connected yet.",
  lede: (types: string, place: string) => `${types} · ${place} · this is how others see your profile`,
  edit: "Edit profile",
  saved: "Profile saved.",
  nameCheck: "An admin is checking your new name. Your Verified badge stays meanwhile.",
  reviews: (n: number) => `${formatCount(n)} reviews`,
  rank: "among organisers",
  followers: "followers",
  eventsRun: "events run",
  copyShort: "Copy short link",
  copied: "Copied",
  share: "Share",
  tabsLabel: "Profile sections",
  upcoming: "Upcoming",
  past: "Past events",
  reviewsTab: "Reviews",
  eventLine: (e: ManagedEvent) => [e.postponedFrom ? `Postponed to ${formatDayMonth(e.startsAt ?? "")}` : formatDayMonth(e.startsAt ?? ""), e.venueName, `${formatCount(e.going)} going`].join(" · "),
  postponed: "Postponed",
  noUpcoming: "No upcoming events. Create one from My events.",
  trackRecord: "Track record",
  wentAhead: "went ahead as planned",
  postponedWord: "postponed",
  cancelledWord: "cancelled",
  paidOnTime: "providers paid on time",
  event: "Event",
  date: "Date",
  going: "Going",
  rating: "Rating",
  noPast: "No past events yet.",
  verification: "Verification",
  seeVerification: "See verification",
  approved: (when: string) => `Approved ${when}. The badge shows on your profile, events and posts.`,
  notVerified: "Not verified yet. Get verified so providers and attendees can trust your events.",
  contact: "Contact",
  phone: "Phone",
  email: "Email",
  reviewsTitle: "Reviews",
  seeAllReviews: "See all reviews",
  fromReviews: (n: number) => `from ${formatCount(n)} reviews`,
} as const;

type Props = { searchParams: Promise<{ tab?: string; dialog?: string; saved?: string }> };

// The organiser's own profile (Figma O27; ?tab=past is O45): the header card as others see it,
// upcoming or past events, and verification, contact and review panels. ?dialog=share opens
// "Share your profile" (O44). The Reviews tab opens the Reviews page.
export default async function ProfilePage({ searchParams }: Props) {
  const session = await requireRole("organiser");
  const query = await searchParams;
  const [profile, mine] = await Promise.all([getMyOrganiserProfile(session), listMyEvents(session)]);
  if (!profile) {
    return <p className={ui.muted}>{TEXT.noBackend}</p>;
  }
  const now = new Date();
  const past = query.tab === "past";
  const publicPath = routes.organiser("org-agastra");

  const upcoming = mine
    .filter((e) => (e.status === "published" || e.status === "postponed") && e.startsAt && Date.parse(e.endsAt ?? e.startsAt) > now.getTime())
    .sort((a, b) => (a.startsAt ?? "").localeCompare(b.startsAt ?? ""));
  // events that have ended, from Tezera's records and from before them
  const ended = mine.filter((e) => e.status === "published" && e.endsAt && Date.parse(e.endsAt) <= now.getTime());
  const summaries = await Promise.all(ended.map((e) => getPastEventSummary(session, e.id)));
  const pastRows = [
    ...ended.map((e, i) => ({ id: e.id, title: e.title, venue: e.venueName, date: e.date, going: e.going, rating: summaries[i]?.rating ?? null, href: routes.manageEvent(e.id) })),
    ...profile.history.map((h) => ({ ...h, href: undefined as string | undefined })),
  ].sort((a, b) => b.date.localeCompare(a.date));

  const aside = (
    <>
      <Panel title={TEXT.verification} link={{ label: TEXT.seeVerification, href: routes.verification }}>
        {/* wrapped so the chip keeps its own width in the panel's grid */}
        {profile.verified && (
          <div>
            <Chip tone="good">{TEXT.verified}</Chip>
          </div>
        )}
        <p className={tables.panelText}>{profile.verified && profile.verifiedAt ? TEXT.approved(formatShortDate(profile.verifiedAt)) : TEXT.notVerified}</p>
      </Panel>
      {profile.showContact && (
        <Panel title={TEXT.contact}>
          {profile.phone && <ContactRow value={profile.phone} label={TEXT.phone} href={`tel:${profile.phone.replace(/\s/g, "")}`} />}
          {profile.email && <ContactRow value={profile.email} label={TEXT.email} href={`mailto:${profile.email}`} />}
        </Panel>
      )}
      <Panel title={TEXT.reviewsTitle} link={{ label: TEXT.seeAllReviews, href: routes.reviews }}>
        <p className={styles.bigNumber}>{profile.rating}</p>
        <p className={tables.panelText}>{TEXT.fromReviews(profile.reviews)}</p>
      </Panel>
    </>
  );

  return (
    <>
      <Columns aside={aside}>
        <section className={hiring.profileCard} aria-labelledby="profile-name">
          <div className={hiring.profileTop}>
            <Thumb size={88} shape="round" />
            <div className={hiring.providerText}>
              <div className={hiring.nameLine}>
                <h1 id="profile-name" className={hiring.profileName}>
                  {profile.name}
                </h1>
                {profile.verified && <Chip tone="good">{TEXT.verified}</Chip>}
                {profile.badge && <Chip tone={profile.badge === "Top Rated" ? "strong" : "soft"}>{profile.badge}</Chip>}
              </div>
              <span className={hiring.meta}>{TEXT.lede(profile.eventTypes, profile.basedIn)}</span>
            </div>
            <Link href={routes.editProfile} className={`${ui.rowButton} ${ui.rowButtonPrimary} ${styles.editButton}`}>
              {TEXT.edit}
            </Link>
          </div>
          <p className={hiring.bio}>{profile.about}</p>
          <dl className={hiring.profileTiles}>
            <Tile value={String(profile.rating)} label={TEXT.reviews(profile.reviews)} />
            <Tile value={profile.rank ? `#${profile.rank}` : "–"} label={TEXT.rank} />
            {profile.showFollowers && <Tile value={compactCount(profile.followers)} label={TEXT.followers} href={routes.followers} />}
            <Tile value={String(profile.eventsRun)} label={TEXT.eventsRun} />
          </dl>
          <div className={hiring.chipRow}>
            <CopyLink path={publicPath} label={TEXT.copyShort} copied={TEXT.copied} className={`${ui.rowButton} ${ui.rowButtonWhite}`} />
            <Link href={`${routes.myProfile}?dialog=share`} scroll={false} className={`${ui.rowButton} ${ui.rowButtonWhite}`}>
              {TEXT.share}
            </Link>
          </div>
        </section>

        {query.saved && (
          <p className={styles.notice} role="status">
            {TEXT.saved}
          </p>
        )}
        {profile.nameCheckPending && <p className={styles.notice}>{TEXT.nameCheck}</p>}

        <nav className={styles.tabs} aria-label={TEXT.tabsLabel}>
          <Link href={routes.myProfile} className={styles.tab} aria-current={!past ? "page" : undefined}>
            {TEXT.upcoming}
          </Link>
          <Link href={`${routes.myProfile}?tab=past`} className={styles.tab} aria-current={past ? "page" : undefined}>
            {TEXT.past}
          </Link>
          <Link href={routes.reviews} className={styles.tab}>
            {TEXT.reviewsTab}
          </Link>
        </nav>

        {!past ? (
          upcoming.length === 0 ? (
            <p className={ui.muted}>{TEXT.noUpcoming}</p>
          ) : (
            <ul className={ui.rows}>
              {upcoming.map((e) => (
                <li key={e.id}>
                  <Link href={routes.manageEvent(e.id)} className={styles.eventRow}>
                    <Thumb size={80} height={56} radius={8} />
                    <span className={ui.rowText}>
                      <span className={ui.rowTitle}>{e.title}</span>
                      <span className={hiring.sub}>{TEXT.eventLine(e)}</span>
                    </span>
                    {e.status === "postponed" && <Chip tone="warn">{TEXT.postponed}</Chip>}
                  </Link>
                </li>
              ))}
            </ul>
          )
        ) : (
          <>
            {profile.showTrackRecord && (
              <section className={tables.section} aria-labelledby="track-title">
                <h2 id="track-title" className={ui.sectionTitle}>
                  {TEXT.trackRecord}
                </h2>
                <dl className={styles.track}>
                  <Tile value={String(profile.eventsRun)} label={TEXT.eventsRun} />
                  <Tile value={String(profile.trackRecord.wentAhead)} label={TEXT.wentAhead} />
                  <Tile value={String(profile.trackRecord.postponed)} label={TEXT.postponedWord} />
                  <Tile value={String(profile.trackRecord.cancelled)} label={TEXT.cancelledWord} />
                  <Tile value={`${profile.trackRecord.paidOnTimePercent}%`} label={TEXT.paidOnTime} />
                </dl>
              </section>
            )}
            {pastRows.length === 0 ? (
              <p className={ui.muted}>{TEXT.noPast}</p>
            ) : (
              <div className={tables.tableCard}>
                <table className={`${tables.table} ${styles.pastTable}`}>
                  <thead>
                    <tr>
                      <th scope="col">{TEXT.event}</th>
                      <th scope="col">{TEXT.date}</th>
                      <th scope="col">{TEXT.going}</th>
                      <th scope="col">{TEXT.rating}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pastRows.map((r) => (
                      <tr key={r.id}>
                        <th scope="row">
                          {r.href ? (
                            <Link href={r.href} className={`${tables.strong} ${styles.rowLink}`}>
                              {r.title}
                            </Link>
                          ) : (
                            <span className={tables.strong}>{r.title}</span>
                          )}
                          <span className={tables.small}>{r.venue}</span>
                        </th>
                        <td>{pastDate(r.date, now)}</td>
                        <td>{formatCount(r.going)}</td>
                        <td>{r.rating ?? "–"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </Columns>
      {query.dialog === "share" && <ShareDialog shortLink={profile.shortLink} publicPath={publicPath} />}
    </>
  );
}

// "Sat 24 Oct", with the year when it isn't this year: "Sat 13 Dec 2025"
function pastDate(date: string, now: Date): string {
  const label = formatDayMonth(`${date}T12:00:00+05:30`);
  return date.slice(0, 4) === String(now.getFullYear()) ? label : `${label} ${date.slice(0, 4)}`;
}

// One white tile: the value big, the label under it. Followers opens the followers list.
function Tile({ value, label, href }: { value: string; label: string; href?: string }) {
  const inside = (
    <>
      <dt className={`${ui.muted} ${events.tileLabel}`}>{label}</dt>
      <dd className={events.tileValue}>{value}</dd>
    </>
  );
  return href ? (
    <Link href={href} className={`${events.tile} ${styles.tileLink}`}>
      {inside}
    </Link>
  ) : (
    <div className={events.tile}>{inside}</div>
  );
}

function ContactRow({ value, label, href }: { value: string; label: string; href: string }) {
  return (
    <a href={href} className={hiring.whiteRow}>
      <Thumb size={24} radius={4} />
      <span className={ui.rowText}>
        <span className={ui.rowTitle}>{value}</span>
        <span className={hiring.sub}>{label}</span>
      </span>
    </a>
  );
}

const SHARE = {
  title: "Share your profile",
  subtitle: "Anyone with the link can see your profile and events",
  shortLink: "Short link",
  copy: "Copy",
  copied: "Copied",
  whatsapp: "WhatsApp",
  story: "Instagram story",
  facebook: "Facebook",
  qr: "QR code",
  note: "The link shows a preview image with your logo and next event.",
  done: "Done",
  close: "Close",
  shareText: "See our events on Tezera",
} as const;

// "Share your profile" (Figma O44): the short link and four ways to share it. WhatsApp and
// Facebook open their own share pages; the story image and QR code come later (US-C15).
function ShareDialog({ shortLink, publicPath }: { shortLink: string; publicPath: string }) {
  const close = routes.myProfile;
  // the full address is only known in the browser; these share pages take the public path's
  // address as text, which WhatsApp and Facebook turn into a link
  const text = encodeURIComponent(`${SHARE.shareText}: https://tezera.lk${publicPath}`);
  return (
    <Dialog title={SHARE.title} subtitle={SHARE.subtitle} closeHref={close} closeLabel={SHARE.close} narrow>
      <div className={forms.field}>
        <span className={forms.label}>{SHARE.shortLink}</span>
        <div className={styles.linkBox}>
          <span>{`tezera.lk/${shortLink}`}</span>
          <CopyLink path={publicPath} label={SHARE.copy} copied={SHARE.copied} className={`${ui.rowButton} ${styles.plain}`} />
        </div>
      </div>
      <div className={styles.shareGrid}>
        <a href={`https://wa.me/?text=${text}`} target="_blank" rel="noopener noreferrer" className={styles.shareTile}>
          <span className={styles.shareIcon} aria-hidden="true" />
          {SHARE.whatsapp}
        </a>
        <MaybeLink className={styles.shareTile}>
          <span className={styles.shareIcon} aria-hidden="true" />
          {SHARE.story}
        </MaybeLink>
        <a href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(`https://tezera.lk${publicPath}`)}`} target="_blank" rel="noopener noreferrer" className={styles.shareTile}>
          <span className={styles.shareIcon} aria-hidden="true" />
          {SHARE.facebook}
        </a>
        <MaybeLink className={styles.shareTile}>
          <span className={styles.shareIcon} aria-hidden="true" />
          {SHARE.qr}
        </MaybeLink>
      </div>
      <p className={tables.panelText}>{SHARE.note}</p>
      <Link href={close} scroll={false} className={`${forms.bigButton} ${forms.bigButtonPrimary}`}>
        {SHARE.done}
      </Link>
    </Dialog>
  );
}
