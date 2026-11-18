import type { Metadata } from "next";

// Title and description for search results and link previews. WhatsApp and Instagram build their
// preview cards from the Open Graph tags, so the same words go there too. The preview image and short
// links belong to US-C15-T4.
export function teaserMetadata(title: string, description: string): Metadata {
  return {
    title,
    description,
    openGraph: { title, description, siteName: "Tezera", type: "website" },
  };
}
