import type { EventStatus, ProviderKind, PublicEvent, PublicOrganiser, PublicProvider } from "@/lib/data/types";
import { formatDateTime } from "@/lib/format";

// Words shared by the public teasers. EN-07-T4 moves these into translation files.

// "published" needs no label: only postponed and cancelled events get a pill
export const EVENT_STATUS_LABEL: Record<Exclude<EventStatus, "published">, string> = {
  postponed: "Postponed",
  cancelled: "Cancelled",
};

export const PROVIDER_KIND_LABEL: Record<ProviderKind, string> = {
  vendor: "Vendor",
  freelancer: "Freelancer",
};

export const PUBLIC_TEXT = {
  verified: "Verified",
  logIn: "Log in",
  dashboard: "Your dashboard",
} as const;

// The box at the end of each teaser (SignInPrompt.tsx)
export type TeaserKind = "event" | "profile";

export const SIGN_IN_TEXT = {
  title: "See more on Tezera",
  body: (kind: TeaserKind) => `Log in or create an account to see the whole ${kind}.`,
  logIn: "Log in",
  signUp: "Create an account",
  loggedInTitle: "You're logged in",
  loggedInBody: (kind: TeaserKind) => `Full ${kind} pages are coming soon.`,
  dashboard: "Go to your dashboard",
} as const;

// One-line descriptions for search results and link-preview cards (generateMetadata), built from the
// teaser's own fields so a preview never shows more than the page.

export function eventDescription(event: PublicEvent): string {
  const when = `${formatDateTime(event.startsAt)} in ${event.district}. Organised by ${event.organiserName}.`;
  return event.status === "published" ? when : `${EVENT_STATUS_LABEL[event.status]}. ${when}`;
}

export function organiserDescription(organiser: PublicOrganiser): string {
  return `Event organiser in ${organiser.district}${organiser.verified ? ", verified on Tezera" : ""}.`;
}

export function providerDescription(provider: PublicProvider): string {
  const who = `${provider.category}. ${PROVIDER_KIND_LABEL[provider.kind]} on Tezera`;
  return `${who}${provider.verified ? ", verified" : ""}.`;
}
