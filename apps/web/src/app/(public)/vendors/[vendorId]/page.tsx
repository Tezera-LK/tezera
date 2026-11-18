import type { Metadata } from "next";
import { notFound } from "next/navigation";
import palette from "@/components/Palette.module.css";
import styles from "@/components/public/Public.module.css";
import { VENDOR_KIND_LABEL } from "@/components/public/text";
import { getPublicVendor } from "@/lib/data/public";
import { formatList } from "@/lib/format";

// cached like the event page: same HTML for everyone, rebuilt at most once a minute (Decision 4b)
export const dynamic = "force-static";
export const revalidate = 60;

type VendorPageProps = { params: Promise<{ vendorId: string }> };

export async function generateMetadata({ params }: VendorPageProps): Promise<Metadata> {
  const vendor = await getPublicVendor((await params).vendorId);
  return vendor ? { title: vendor.name, description: vendor.description } : {};
}

// Public profile for vendors and freelancers alike (/vendors/<id>, decided 3 Nov).
// The route and data path only; the finished design is US-P01-T3.
export default async function VendorPage({ params }: VendorPageProps) {
  const vendor = await getPublicVendor((await params).vendorId);
  if (!vendor) notFound();

  return (
    <article className={`${palette.root} ${styles.card}`} data-palette="ven">
      <p className={styles.eyebrow}>{VENDOR_KIND_LABEL[vendor.kind]}</p>
      <div className={styles.titleRow}>
        <h1 className={styles.title}>{vendor.name}</h1>
        {vendor.verified && <span className={styles.pill}>Verified</span>}
      </div>
      <p className={styles.summary}>{vendor.description}</p>
      <dl className={styles.facts}>
        <dt>What they do</dt>
        <dd>{vendor.category}</dd>
        <dt>Works in</dt>
        <dd>{formatList(vendor.districtsServed)}</dd>
      </dl>
    </article>
  );
}
