import type { Metadata } from "next";
import { notFound } from "next/navigation";
import palette from "@/components/Palette.module.css";
import { teaserMetadata } from "@/components/public/metadata";
import styles from "@/components/public/Public.module.css";
import SignInPrompt from "@/components/public/SignInPrompt";
import { PUBLIC_TEXT, organiserDescription } from "@/components/public/text";
import { getPublicOrganiser } from "@/lib/data/public";

// cached like the event page: same HTML for everyone, rebuilt at most once a minute (Decision 4b)
export const dynamic = "force-static";
export const revalidate = 60;

type OrganiserPageProps = { params: Promise<{ organiserId: string }> };

export async function generateMetadata({ params }: OrganiserPageProps): Promise<Metadata> {
  const organiser = await getPublicOrganiser((await params).organiserId);
  return organiser ? teaserMetadata(organiser.name, organiserDescription(organiser)) : {};
}

// The teaser of an organiser's profile: name, district and the Verified badge. Their events, reviews
// and contact details need an account. The full profile is US-P04-T3.
export default async function OrganiserPage({ params }: OrganiserPageProps) {
  const organiser = await getPublicOrganiser((await params).organiserId);
  if (!organiser) notFound();

  return (
    <article className={`${palette.root} ${styles.card}`} data-palette="org">
      <p className={styles.eyebrow}>Organiser</p>
      <div className={styles.titleRow}>
        <h1 className={styles.title}>{organiser.name}</h1>
        {organiser.verified && <span className={styles.pill}>{PUBLIC_TEXT.verified}</span>}
      </div>
      <dl className={styles.facts}>
        <dt>Based in</dt>
        <dd>{organiser.district}</dd>
      </dl>
      <SignInPrompt kind="profile" />
    </article>
  );
}
