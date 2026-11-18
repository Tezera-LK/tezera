import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { teaserMetadata } from "@/components/public/metadata";
import ProviderTeaser from "@/components/public/ProviderTeaser";
import { providerDescription } from "@/components/public/text";
import { getPublicProvider } from "@/lib/data/public";

// cached like the event page: same HTML for everyone, rebuilt at most once a minute (Decision 4b)
export const dynamic = "force-static";
export const revalidate = 60;

type FreelancerPageProps = { params: Promise<{ freelancerId: string }> };

export async function generateMetadata({ params }: FreelancerPageProps): Promise<Metadata> {
  const freelancer = await getPublicProvider("freelancer", (await params).freelancerId);
  return freelancer ? teaserMetadata(freelancer.name, providerDescription(freelancer)) : {};
}

// The teaser of a freelancer's profile. Until 18 Nov freelancers shared /vendors/<id>.
export default async function FreelancerPage({ params }: FreelancerPageProps) {
  const freelancer = await getPublicProvider("freelancer", (await params).freelancerId);
  if (!freelancer) notFound();

  return <ProviderTeaser provider={freelancer} />;
}
