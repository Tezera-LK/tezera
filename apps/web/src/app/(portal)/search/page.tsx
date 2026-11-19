import type { Metadata } from "next";
import Chip from "@/components/portal/Chip";
import Columns from "@/components/portal/Columns";
import MaybeLink from "@/components/portal/MaybeLink";
import PageHeader from "@/components/portal/PageHeader";
import Panel from "@/components/portal/Panel";
import Tabs from "@/components/portal/Tabs";
import Thumb from "@/components/portal/Thumb";
import ui from "@/components/portal/ui.module.css";
import EmptyState from "@/components/states/EmptyState";
import { requireSession } from "@/lib/auth/session";
import { getRecentSearches, searchPortal } from "@/lib/data/portal";
import type { CommunityResult, EventResult, ProviderResult, SearchTab } from "@/lib/data/portal-types";
import { formatCount, formatDayMonth } from "@/lib/format";
import { routes } from "@/lib/routes";
import styles from "./search.module.css";

export const metadata: Metadata = { title: "Search" };

// Words on this page, in one place for the translation files (EN-07-T4).
const TEXT = {
  title: "Search",
  resultsFor: (query: string) => `Results for “${query}”`,
  prompt: "Search for providers, events and communities from the box at the top.",
  noResults: "Nothing matches that. Try a shorter word or a category, like “DJ”.",
  noResultsTitle: "No results",
  tabsLabel: "Result types",
  recent: "Recent searches",
  events: "Events",
  seeAllProviders: (count: number) => `See all ${count} in Find providers`,
  members: (count: number) => `${formatCount(count)} members`,
  kind: { vendor: "Vendor", freelancer: "Freelancer" },
  from: (lkr: number) => `from LKR ${formatCount(lkr)}`,
  by: (name: string) => `by ${name}`,
} as const;

// How many providers show before "See all" (O80 shows three)
const PROVIDERS_SHOWN = 3;

// "18 providers", "1 community"
function counted(count: number, one: string, many: string) {
  return `${count} ${count === 1 ? one : many}`;
}

// Reads ?tab= and falls back to providers, the first tab.
function pickTab(value: string | string[] | undefined): SearchTab {
  return value === "events" || value === "communities" ? value : "providers";
}

// Search results for the top bar's box (Figma O80): providers, events and communities, with a tab
// for each. The providers tab also lists matching events under the providers, as Figma draws it.
export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string | string[]; tab?: string | string[] }>;
}) {
  const session = await requireSession();
  const params = await searchParams;
  const query = typeof params.q === "string" ? params.q.trim() : "";
  const tab = pickTab(params.tab);
  // only organisers hire, so only they get links to profiles and Find providers
  const hiring = session.role === "organiser";
  const [results, recent] = await Promise.all([searchPortal(session, query), getRecentSearches(session)]);
  const { providers, events, communities } = results;
  const total = providers.length + events.length + communities.length;

  const aside =
    recent.length > 0 ? (
      <Panel title={TEXT.recent}>
        <ul className={ui.chipList}>
          {recent.map((term) => (
            <li key={term}>
              <MaybeLink href={routes.searchFor(term)} className={ui.searchChip}>
                {term}
              </MaybeLink>
            </li>
          ))}
        </ul>
      </Panel>
    ) : null;

  const header = (
    <PageHeader
      title={query ? TEXT.resultsFor(query) : TEXT.title}
      description={
        query
          ? // "18 providers, 2 events, 1 community", as in Figma
            [
              counted(providers.length, "provider", "providers"),
              counted(events.length, "event", "events"),
              counted(communities.length, "community", "communities"),
            ].join(", ")
          : undefined
      }
    />
  );

  // Builds a tab's link: the same search, another tab.
  const tabHref = (key: SearchTab) => `${routes.searchFor(query)}${key === "providers" ? "" : `&tab=${key}`}`;

  return (
    <Columns aside={aside}>
      {header}
      {!query ? (
        <EmptyState title={TEXT.title} description={TEXT.prompt} />
      ) : total === 0 ? (
        <EmptyState title={TEXT.noResultsTitle} description={TEXT.noResults} />
      ) : (
        <>
          <Tabs
            label={TEXT.tabsLabel}
            current={tab}
            tabs={[
              { key: "providers", label: `Providers · ${providers.length}`, href: tabHref("providers") },
              { key: "events", label: `Events · ${events.length}`, href: tabHref("events") },
              { key: "communities", label: `Communities · ${communities.length}`, href: tabHref("communities") },
            ]}
          />

          {tab === "providers" && (
            <>
              <ProviderList providers={providers.slice(0, PROVIDERS_SHOWN)} hiring={hiring} />
              {providers.length > PROVIDERS_SHOWN && (
                // Find providers (O17) is the organiser's; other roles get it in their own slices
                <MaybeLink
                  href={hiring ? `${routes.hiring}?q=${encodeURIComponent(query)}` : undefined}
                  className={`${ui.wideButton} ${styles.seeAll}`}
                >
                  {TEXT.seeAllProviders(providers.length)}
                </MaybeLink>
              )}
              {events.length > 0 && (
                <section className={styles.section} aria-labelledby="search-events">
                  <h2 id="search-events" className={ui.sectionTitle}>
                    {TEXT.events}
                  </h2>
                  <EventList events={events} />
                </section>
              )}
            </>
          )}
          {tab === "events" && <EventList events={events} />}
          {tab === "communities" && <CommunityList communities={communities} />}
        </>
      )}
    </Columns>
  );
}

// Provider rows: a round picture, the name, "Freelancer · Photographer · ★ 4.8 · from LKR 30,000"
// and a badge. An organiser can open each profile (O18); other roles get profiles in their own slices.
function ProviderList({ providers, hiring }: { providers: ProviderResult[]; hiring: boolean }) {
  return (
    <ul className={ui.rows}>
      {providers.map((p) => (
        <li key={p.id}>
          <MaybeLink href={hiring ? routes.provider(p.id) : undefined} className={`${ui.row} ${styles.providerRow}`}>
            <Thumb size={40} shape="round" />
            <span className={ui.rowText}>
              <span className={ui.rowTitle}>{p.name}</span>
              <span className={ui.muted}>
                {`${TEXT.kind[p.kind]} · ${p.category} · ★ ${p.rating} · ${TEXT.from(p.priceFrom)}`}
              </span>
            </span>
            {p.badge && <Chip tone={p.badge === "Top Rated" ? "strong" : "soft"}>{p.badge}</Chip>}
          </MaybeLink>
        </li>
      ))}
    </ul>
  );
}

// Event rows: a square picture, the title and "Sat 23 Jan · BMICH · by TechLK". Events with a
// public page link to it.
function EventList({ events }: { events: EventResult[] }) {
  return (
    <ul className={ui.rows}>
      {events.map((e) => (
        <li key={e.id}>
          <MaybeLink href={e.href} className={`${ui.row} ${styles.eventRow}`}>
            <Thumb size={36} radius={8} />
            <span className={ui.rowText}>
              <span className={ui.rowTitle}>{e.title}</span>
              <span className={ui.muted}>
                {`${formatDayMonth(e.startsAt)} · ${e.venueName} · ${TEXT.by(e.organiserName)}`}
              </span>
            </span>
          </MaybeLink>
        </li>
      ))}
    </ul>
  );
}

// Community rows. Figma draws no community result, so these reuse the event row's shape.
// Communities (O24) are in the People slice, so rows don't link yet.
function CommunityList({ communities }: { communities: CommunityResult[] }) {
  return (
    <ul className={ui.rows}>
      {communities.map((c) => (
        <li key={c.id}>
          <MaybeLink className={`${ui.row} ${styles.eventRow}`}>
            <Thumb size={36} radius={8} />
            <span className={ui.rowText}>
              <span className={ui.rowTitle}>{c.name}</span>
              <span className={ui.muted}>{TEXT.members(c.members)}</span>
            </span>
          </MaybeLink>
        </li>
      ))}
    </ul>
  );
}
