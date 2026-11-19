import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import Columns from "@/components/portal/Columns";
import Panel from "@/components/portal/Panel";
import { compactCount } from "@/components/portal/events/eventText";
import hiring from "@/components/portal/hiring/Hiring.module.css";
import styles from "@/components/portal/people/People.module.css";
import ThreadList from "@/components/portal/people/ThreadList";
import tables from "@/components/portal/tables.module.css";
import ui from "@/components/portal/ui.module.css";
import { requireRole } from "@/lib/auth/session";
import { listCommunities, listThreads } from "@/lib/data/portal";
import { routes } from "@/lib/routes";
import { setMembership } from "../../actions";

export const metadata: Metadata = { title: "Community" };

const TEXT = {
  lede: (members: number) => `${compactCount(members)} members`,
  join: "Join",
  leave: "Leave",
  newThread: "New thread",
  threads: "Threads",
  about: "About this community",
} as const;

// One community's threads. Figma draws a single thread (O25) but not the list it comes from, so
// this page is the list, in the same style as the event board (O16).
export default async function CommunityThreadsPage({ params }: { params: Promise<{ communityId: string }> }) {
  const session = await requireRole("organiser");
  const { communityId } = await params;
  const [communities, threads] = await Promise.all([listCommunities(session), listThreads(session)]);
  const community = communities.find((c) => c.id === communityId);
  if (!community) notFound();
  const here = routes.communityPage(community.id);

  const aside = (
    <Panel title={TEXT.about}>
      <p className={tables.panelText}>{community.about}</p>
    </Panel>
  );

  return (
    <Columns aside={aside}>
      <header className={styles.headRow}>
        <div className={hiring.pageHeadText}>
          <h1 className={hiring.pageTitle}>{community.name}</h1>
          <p className={hiring.lede}>{TEXT.lede(community.members)}</p>
        </div>
        <div className={styles.threadButtons}>
          <form action={setMembership.bind(null, community.id, !community.joined, here)}>
            <button type="submit" className={`${ui.rowButton} ${ui.rowButtonWhite}`}>
              {community.joined ? TEXT.leave : TEXT.join}
            </button>
          </form>
          {community.joined && (
            <Link href={`${routes.community}?dialog=new&in=community:${community.id}`} className={`${ui.rowButton} ${ui.rowButtonPrimary}`}>
              {TEXT.newThread}
            </Link>
          )}
        </div>
      </header>
      <section className={tables.section} aria-labelledby="threads-title">
        <h2 id="threads-title" className={ui.sectionTitle}>
          {TEXT.threads}
        </h2>
        <ThreadList threads={threads.filter((t) => t.communityId === community.id)} back={here} />
      </section>
    </Columns>
  );
}
