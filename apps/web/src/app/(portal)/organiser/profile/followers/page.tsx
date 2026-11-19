import type { Metadata } from "next";
import Link from "next/link";
import Columns from "@/components/portal/Columns";
import MaybeLink from "@/components/portal/MaybeLink";
import Panel from "@/components/portal/Panel";
import Thumb from "@/components/portal/Thumb";
import { compactCount } from "@/components/portal/events/eventText";
import forms from "@/components/portal/forms.module.css";
import hiring from "@/components/portal/hiring/Hiring.module.css";
import shell from "@/components/portal/PortalShell.module.css";
import styles from "@/components/portal/profile/Profile.module.css";
import tables from "@/components/portal/tables.module.css";
import ui from "@/components/portal/ui.module.css";
import { requireRole } from "@/lib/auth/session";
import { getMyOrganiserProfile, listFollowers } from "@/lib/data/portal";
import { routes } from "@/lib/routes";

export const metadata: Metadata = { title: "Followers" };

const TEXT = {
  title: "Followers",
  lede: (n: string, name: string) => `${n} people follow ${name}`,
  search: "Search followers",
  message: "Message",
  messageWho: (name: string) => `Message ${name}`,
  view: "View",
  viewWho: (name: string) => `View ${name}'s profile`,
  none: "No followers match.",
  growth: "Growth",
  analytics: "Analytics",
  thisWeek: "this week",
} as const;

// Followers (Figma O43): who follows the organiser, searchable. Providers open their profile;
// everyone else can be messaged (the Messages slice).
export default async function FollowersPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const session = await requireRole("organiser");
  const q = (await searchParams).q ?? "";
  const [profile, followers] = await Promise.all([getMyOrganiserProfile(session), listFollowers(session, q)]);

  const aside = (
    <Panel title={TEXT.growth} link={{ label: TEXT.analytics, href: routes.analytics }}>
      <p className={styles.bigNumber}>{`+${profile?.followersThisWeek ?? 0}`}</p>
      <p className={tables.panelText}>{TEXT.thisWeek}</p>
    </Panel>
  );

  return (
    <Columns aside={aside}>
      <header className={hiring.pageHeadText}>
        <h1 className={hiring.pageTitle}>{TEXT.title}</h1>
        <p className={hiring.lede}>{TEXT.lede(compactCount(profile?.followers ?? 0), profile?.name ?? "you")}</p>
      </header>
      <form action={routes.followers} role="search">
        <label className={shell.srOnly} htmlFor="follower-search">
          {TEXT.search}
        </label>
        <input id="follower-search" type="search" name="q" defaultValue={q} placeholder={TEXT.search} className={`${forms.input} ${hiring.searchBox}`} />
      </form>
      {followers.length === 0 ? (
        <p className={ui.muted}>{TEXT.none}</p>
      ) : (
        <ul className={ui.rows}>
          {followers.map((f) => (
            <li key={f.id} className={styles.personRow}>
              <Thumb size={40} shape="round" />
              <span className={ui.rowText}>
                <span className={ui.rowTitle}>{f.name}</span>
                <span className={hiring.sub}>{`${f.role} · ${f.detail}`}</span>
              </span>
              {f.providerId ? (
                <Link href={routes.provider(f.providerId)} className={ui.rowButton} aria-label={TEXT.viewWho(f.name)}>
                  {TEXT.view}
                </Link>
              ) : (
                // conversations are the Messages slice
                <MaybeLink className={ui.rowButton}>
                  <span aria-hidden="true">{TEXT.message}</span>
                  <span className={shell.srOnly}>{TEXT.messageWho(f.name)}</span>
                </MaybeLink>
              )}
            </li>
          ))}
        </ul>
      )}
    </Columns>
  );
}
