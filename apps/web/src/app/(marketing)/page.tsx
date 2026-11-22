import type { Metadata } from "next";
import LandingShow from "@/components/landing/LandingShow";
import site from "@/content/site.json";

const title = "Tezera | Every event in Sri Lanka, in one place";
const description =
  "Tezera brings organisers, vendors, freelancers and attendees onto one platform. Hire verified people, fill your stalls, share the venue map and find what's on in Sri Lanka.";

export const metadata: Metadata = {
  title: { absolute: title },
  description,
  metadataBase: new URL(site.url),
  openGraph: {
    type: "website",
    siteName: site.name,
    title,
    description: "Organisers, vendors, freelancers and attendees on one stage. Hire verified people, fill stalls and find what's on.",
    images: [{
      url: "/images/marketing/meta/og-image.png",
      width: 1200,
      height: 630,
      alt: "The Tezera LED stage with a crowd and the headline Every event in Sri Lanka, in one place",
    }],
  },
  twitter: { card: "summary_large_image" },
};

export const viewport = { themeColor: "#0e0c0d" };

export default function Home() {
  return <LandingShow />;
}
