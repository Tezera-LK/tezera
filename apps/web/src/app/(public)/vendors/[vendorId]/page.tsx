import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { teaserMetadata } from "@/components/public/metadata";
import ProviderTeaser from "@/components/public/ProviderTeaser";
import { providerDescription } from "@/components/public/text";
import { getPublicProvider } from "@/lib/data/public";

// cached like the event page: same HTML for everyone, rebuilt at most once a minute (Decision 4b)
export const dynamic = "force-static";
export const revalidate = 60;

type VendorPageProps = { params: Promise<{ vendorId: string }> };

export async function generateMetadata({ params }: VendorPageProps): Promise<Metadata> {
  const vendor = await getPublicProvider("vendor", (await params).vendorId);
  return vendor ? teaserMetadata(vendor.name, providerDescription(vendor)) : {};
}

// The teaser of a vendor's profile. Freelancers have their own address, /freelancers/<id>.
export default async function VendorPage({ params }: VendorPageProps) {
  const vendor = await getPublicProvider("vendor", (await params).vendorId);
  if (!vendor) notFound();

  return <ProviderTeaser provider={vendor} />;
}
