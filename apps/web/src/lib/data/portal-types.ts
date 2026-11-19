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

// ---------- An organiser's own event: My events (O07), create and edit (O08, O54), its pages ----------

// unpublished = taken down by an admin (O55); the organiser still sees it, the public doesn't
export type ManagedEventStatus = OrganiserEventStatus | "unpublished";

export type AgeRating = "all" | "18+" | "21+";

// one row of "Line-up or schedule": "18:00" and what happens then
export type LineupItem = { time: string; act: string };

export type Entry =
  | { kind: "free" }
  | { kind: "paid"; priceLkr: number | null; ticketUrl: string };

// "Know before you go": each field shows on the event page only when it's filled in
export type KnowBeforeYouGo = {
  dressCode: string;
  bring: string;
  parking: string;
  rules: string;
  foodPrices: string;
  ifRains: string;
};

// What the create and edit forms send. Dates and times are as the inputs give them:
// date "2026-12-12", times "18:00" (Sri Lanka time).
export type EventDraft = {
  title: string;
  category: string;
  ageRating: AgeRating;
  date: string;
  startTime: string;
  endTime: string;
  venueName: string;
  address: string;
  description: string;
  lineup: LineupItem[];
  entry: Entry;
  know: KnowBeforeYouGo;
};

export type ManagedEvent = EventDraft & {
  id: string;
  status: ManagedEventStatus;
  // ISO 8601, built from date + time; null while a draft has no date
  startsAt: string | null;
  endsAt: string | null;
  going: number;
  interested: number;
  bookings: { confirmed: number; requested: number } | null;
  stalls: { approved: number; offered: number } | null;
  liveStatus: { kind: "late"; newStartAt: string } | null;
  publishedAt: string | null;
  editedAt: string;
  // when an admin unpublished it (O55): the reason they gave
  unpublishedReason: string | null;
  // the start it had before it was postponed (O10), shown as "New date: …"; null if never moved
  postponedFrom: string | null;
  // why it was cancelled (O53), shown on the event page
  cancelReason: string | null;
  // sent announcements, newest first (O09, O56)
  announcements: Announcement[];
  // questions people asked on the event page (O15)
  questions: Question[];
};

// who an announcement goes to (O56)
export type Audience = "going" | "interested" | "followers";

export type Announcement = {
  id: string;
  text: string;
  sentAt: string;
  audience: Audience[];
};

export type Question = {
  id: string;
  text: string;
  askedBy: string;
  // "Consumer", "Vendor"…
  askedByRole: string;
  askedAt: string;
  answer: string | null;
  answeredAt: string | null;
};

// one thread on the event's discussion board (O16). Read-only until the People slice (O25, O93).
export type BoardThread = {
  id: string;
  title: string;
  author: string;
  authorRole: string;
  verified: boolean;
  replies: number;
  upvotes: number;
  pinned: boolean;
  postedAt: string;
};

// a booking on a finished event that still needs closing (O57)
export type BookingToClose = {
  id: string;
  provider: string;
  kind: "Vendor" | "Freelancer";
  service: string;
  status: "completed" | "not-marked";
};

// a stall vendor on a finished event (O57)
export type StallToReview = { id: string; vendor: string; category: string; stall: string };

// ---------- One event's stalls (O13, O72–O76) ----------

export type StallType = "Food" | "Drinks" | "Merchandise" | "Crafts" | "Other";

// one row of "Stall slots": how many stalls of a type, what they cost and until when vendors can
// apply. Dates are as the inputs give them ("2026-11-27"). `applied` counts every application
// ever made for the type; `approved` every stall given out.
export type StallSlot = {
  type: StallType;
  slots: number;
  feeLkr: number;
  closesOn: string;
  feeDue: string;
  rules: string;
  applied: number;
  approved: number;
};

// a vendor as the organiser sees them when inviting one or reading an application
export type StallVendor = {
  id: string;
  name: string;
  type: StallType;
  rating: number;
  verified: boolean;
  city: string;
};

// a vendor who applied for a stall, or one the organiser invited (waiting for them to accept)
export type StallApplication = {
  id: string;
  vendor: StallVendor;
  type: StallType;
  receivedAt: string;
  status: "applied" | "invited";
  message: string;
  // the fee offered with an invitation; applications pay the slot's fee
  feeLkr?: number;
};

// one thing on an approved vendor's menu or price list (O74). `note` says why the organiser
// might hide it, e.g. it breaks one of the event's rules.
export type ListingItem = { id: string; name: string; kind: string; priceLkr: number; hidden: boolean; note?: string };

// a vendor with a stall. `number` is their place on the venue map ("B-14"); null until given one.
export type ApprovedStall = {
  id: string;
  vendor: StallVendor;
  type: StallType;
  number: string | null;
  fee: "paid" | "paid-outside" | "due";
  feeDue: string;
  listing: { blurb: string; items: ListingItem[] } | null;
  // the organiser hid the whole listing from the event page
  hidden: boolean;
};

// an area of the venue map and the stall numbers in it, e.g. "Food court": B-12 to B-16
export type StallZone = { name: string; numbers: string[]; taken: string[] };

export type EventStalls = {
  slots: StallSlot[];
  applications: StallApplication[];
  approved: ApprovedStall[];
  // stall fees paid so far, in the app or outside it
  collected: { paid: number; amountLkr: number };
  zones: Record<StallType, StallZone>;
};
