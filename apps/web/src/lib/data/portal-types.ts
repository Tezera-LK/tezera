// What the signed-in portal pages show. Written by hand, like types.ts, until EN-03's schema exists.
// Shapes follow the Figma organiser screens O05 (dashboard), O06 and O81 (notifications), O80 (search)
// and O82 (profile menu).
import type { PortalRole } from "@/lib/portal-roles";

// A link to another screen. `href` is missing while that screen isn't built yet: the UI then draws
// the same thing without a link, as the sidebar does.
export type Target = { label: string; href?: string };

// Who is signed in, for the profile menu's header.
export type Account = {
  name: string;
  email: string;
  role: PortalRole;
};

// ---------- Notifications ----------

// The tabs on the notifications page (O06), plus "all"
export type NotificationType = "bookings" | "stalls" | "messages" | "account";

export type PortalNotification = {
  id: string;
  type: NotificationType;
  // e.g. "Tharindu Jayawardena accepted your booking request"
  title: string;
  // the grey line under the title, e.g. "Photography · Colombo Music Fest · the booking is confirmed"
  detail: string;
  // the dropdown (O81) uses shorter wording than the page
  shortTitle: string;
  shortDetail: string;
  // the word before the time on the page: "Booking", "Quotes", "Stalls", "Message", "Account"
  kind: string;
  // ISO 8601
  at: string;
  unread: boolean;
  // the button on the right of the row, e.g. { label: "Compare" }
  action: Target;
};

// ---------- Organiser dashboard (O05) ----------

export type OrganiserEventStatus = "draft" | "published" | "postponed" | "cancelled";

// one row of "Your events"
export type OrganiserEventRow = {
  id: string;
  title: string;
  // ISO 8601; drafts show "Not published" instead
  startsAt: string;
  status: OrganiserEventStatus;
  going: number;
  interested: number;
  // confirmed bookings of booking requests sent; null when none were sent
  bookings: { confirmed: number; requested: number } | null;
  // approved stall applications of stalls offered; null when the event has no stalls
  stalls: { approved: number; offered: number } | null;
};

// the big card at the top: the organiser's next event
export type FeaturedEvent = OrganiserEventRow & {
  endsAt: string;
  venueName: string;
  // what the organiser last told attendees (O09's "Live status"); null = on time
  liveStatus: { kind: "late"; newStartAt: string } | null;
};

// one row of "Needs your attention"
export type AttentionItem = {
  id: string;
  title: string;
  detail: string;
  href?: string;
};

export type Rank = {
  position: number;
  // who they're ranked against, e.g. "organisers"
  among: string;
  rating: number;
  reviews: number;
  // e.g. "Top Rated"; null when they have no badge
  badge: string | null;
};

export type OrganiserDashboard = {
  organiserName: string;
  featured: FeaturedEvent | null;
  events: OrganiserEventRow[];
  attention: AttentionItem[];
  rank: Rank | null;
};

// ---------- Search (O80) ----------

export type SearchTab = "providers" | "events" | "communities";

export type ProviderResult = {
  id: string;
  name: string;
  kind: "vendor" | "freelancer";
  category: string;
  rating: number;
  // the lowest price they quote, in LKR
  priceFrom: number;
  // "Top Rated" is drawn dark, "Rising" pale (O80)
  badge: "Top Rated" | "Rising" | null;
};

export type EventResult = {
  id: string;
  title: string;
  startsAt: string;
  venueName: string;
  organiserName: string;
  // events that have a public page link to it
  href?: string;
};

export type CommunityResult = {
  id: string;
  name: string;
  members: number;
};

export type SearchResults = {
  query: string;
  providers: ProviderResult[];
  events: EventResult[];
  communities: CommunityResult[];
};
