import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import Columns from "@/components/portal/Columns";
import Panel from "@/components/portal/Panel";
import forms from "@/components/portal/forms.module.css";
import hiring from "@/components/portal/hiring/Hiring.module.css";
import styles from "@/components/portal/provider/Provider.module.css";
import StallMap from "@/components/portal/provider/StallMap";
import ui from "@/components/portal/ui.module.css";
import EmptyState from "@/components/states/EmptyState";
import { requireRole } from "@/lib/auth/session";
import { getProviderState } from "@/lib/data/provider";
import { lkr } from "@/lib/provider";
import { routes } from "@/lib/routes";

export const metadata: Metadata = { title: "Venue map" };

const TEXT = {
  title: (event: string) => `${event} · venue map`,
  yours: (stall: string, zone: string, label: string) => `Your stall is ${stall} in ${zone}, the ${label.toLowerCase()}`,
  search: "Search items on the map",
  searchButton: "Search",
  sells: (n: number, word: string) => `${n} stall${n === 1 ? "" : "s"} sell “${word}”`,
  yoursHighlighted: " · yours is highlighted",
  none: (word: string) => `No stall sells “${word}”.`,
  you: "You",
  zoneStalls: (zone: string) => `${zone} stalls`,
  myListing: "My stall listing",
  eventPage: "Event page",
  entrances: "Entrances · Gate C is for vendors",
  emptyTitle: "No venue map yet",
  emptyText: "The map shows up once an organiser approves your stall and publishes the map.",
} as const;

// The venue map for the vendor's approved stall (Figma V81): their stall highlighted, an item
// search that outlines every stall selling it, and the list of stalls in their zone.
export default async function VenueMapPage({ searchParams }: { searchParams: Promise<{ q?: string; stall?: string }> }) {
  const session = await requireRole("vendor", "freelancer");
  if (session.role === "freelancer") redirect(routes.vendorArea.requests);
  const state = await getProviderState(session);
  const query = await searchParams;
  const stall = (state?.stalls ?? []).find((s) => (query.stall ? s.id === query.stall : s.application?.status === "approved" && s.application.stall));
  const event = state?.events.find((e) => e.id === stall?.eventId);
  const number = stall?.application?.stall;
  if (!state || !stall || !event || !number || event.zones.length === 0) {
    return <EmptyState title={TEXT.emptyTitle} description={TEXT.emptyText} />;
  }

  const zone = event.zones.find((z) => z.stalls.includes(number));
  const listing = state.listings.find((l) => l.stallId === stall.id);
  const word = (query.q ?? listing?.items.flatMap((i) => i.searchWords)[0] ?? "").trim().toLowerCase();
  // the vendor's own stall, with their listing's items, plus the other confirmed stalls
  const vendors = event.vendors.map((v) => (v.mine && listing ? { ...v, items: listing.items.filter((i) => !i.soldOut).map((i) => ({ name: i.name, priceLkr: i.priceLkr })) } : v));
  const selling = word ? vendors.filter((v) => v.items.some((i) => i.name.toLowerCase().includes(word)) || v.detail.toLowerCase().includes(word)) : [];
  const inZone = vendors.filter((v) => zone?.stalls.includes(v.stall)).sort((a, b) => a.stall.localeCompare(b.stall));

  const aside = (
    <>
      <Panel title={TEXT.search}>
        <form action={routes.vendorArea.venueMap} className={styles.searchRow}>
          <input type="search" name="q" defaultValue={word} aria-label={TEXT.search} className={`${forms.input} ${styles.whiteField}`} />
          <button type="submit" className={`${ui.rowButton} ${ui.rowButtonPrimary}`}>
            {TEXT.searchButton}
          </button>
        </form>
        {selling.map((v) => (
          <div key={v.stall} className={hiring.whiteRow}>
            <span className={ui.rowText}>
              <span className={ui.rowTitle}>{`${v.stall} · ${v.name}`}</span>
              <span className={hiring.sub}>{v.items.filter((i) => !word || i.name.toLowerCase().includes(word)).map((i) => `${v.mine ? `${TEXT.you} · ` : ""}${i.name.toLowerCase()} ${lkr(i.priceLkr)}`)[0] ?? v.detail}</span>
            </span>
          </div>
        ))}
      </Panel>
      {zone && (
        <Panel title={TEXT.zoneStalls(zone.name)}>
          {inZone.map((v) => (
            <div key={v.stall} className={hiring.whiteRow}>
              <span className={ui.rowText}>
                <span className={ui.rowTitle}>{`${v.stall} · ${v.name}`}</span>
                <span className={hiring.sub}>{v.mine ? `${v.type} · you` : v.type}</span>
              </span>
            </div>
          ))}
        </Panel>
      )}
    </>
  );

  return (
    <Columns aside={aside}>
      <header className={hiring.pageHeadText}>
        <h1 className={hiring.pageTitle}>{TEXT.title(stall.eventTitle)}</h1>
        {zone && <p className={hiring.lede}>{TEXT.yours(number, zone.name, zone.label)}</p>}
      </header>
      {word && (
        <p className={ui.rowTitle} role="status">
          {selling.length ? `${TEXT.sells(selling.length, word)}${selling.some((v) => v.mine) ? TEXT.yoursHighlighted : ""}` : TEXT.none(word)}
        </p>
      )}
      <StallMap zones={event.zones} mine={number} matches={selling.map((v) => v.stall)} />
      <p className={styles.foot}>{TEXT.entrances}</p>
      <div className={styles.pair}>
        <Link href={`${routes.vendorArea.listing}?stall=${stall.id}`} className={`${forms.bigButton} ${forms.bigButtonPrimary}`}>
          {TEXT.myListing}
        </Link>
        <Link href={routes.vendorArea.event(event.id)} className={forms.bigButton}>
          {TEXT.eventPage}
        </Link>
      </div>
    </Columns>
  );
}
