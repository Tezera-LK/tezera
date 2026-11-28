// What the vendor and freelancer pages show (Figma "vendor high fids" V… and "freelancer high fids" F…).
// Vendors and freelancers share one set of pages at /vendor; the freelancer file is the vendor file
// without stalls, so one set of types covers both. Written by hand, like portal-types.ts, until the
// backend has a schema (EN-03).
import type { AccountSettings, Community, CommunityThread, Conversation, PortalNotification, Verification } from "@/lib/data/portal-types";

// A chat with an organiser (V22). Damian's Conversation is the organiser's side, talking to providers.
export type ProviderConversation = Omit<Conversation, "kind" | "providerId"> & { organiserId: string };

export type ProviderKind = "vendor" | "freelancer";

// An organiser as a provider sees them: on a request (V08's "Check the organiser first") and on
// their profile (V54).
export type OrganiserCard = {
  id: string;
  name: string;
  verified: boolean;
  district: string;
  // "Concerts and festivals · Colombo · since 2023"
  about: string;
  pastEvents: number;
  // "Galle Beach Party, Oct"
  lastEvent: string;
  rating: number;
  reviews: number;
  scores: { payment: number; communication: number; planning: number };
  // share of bookings paid by the due date, 0–100
  paidOnTime: number;
  lateCancellations: number;
  upcoming: { title: string; date: string; note: string }[];
  reviewList: { id: string; by: string; byKind: "Vendor" | "Freelancer"; stars: number; event: string; text: string }[];
};

// One payment on a request, quote or booking: a deposit or an instalment.
export type ProviderPayment = {
  // "Deposit" or "Final instalment"
  label: string;
  amountLkr: number;
  // the share of the price, for the deposit ("30%"); null for instalments
  percent: number | null;
  // an ISO date, or null for "when you accept"
  due: string | null;
  // when the provider marked it received (V68); null while it's still due
  receivedAt: string | null;
};

// What the provider agrees to if they accept (V08's "Terms you agree to").
export type CancellationTerms = {
  // "If the organiser cancels within 7 days of the event, you keep the deposit."
  organiser: string;
  // "If you cancel, the deposit is refunded in full. …"
  provider: string;
};

// The organiser's brief, with only the fields they filled (V08).
export type ProviderBrief = {
  service: string;
  duration: string;
  audience: string;
  deliverables: string;
  equipment: string;
  file: { name: string; sizeKb: number; pages: number } | null;
};

// The provider's own quote (V09), as sent.
export type ProviderQuote = {
  priceLkr: number;
  includes: string;
  payments: ProviderPayment[];
  cancellation: string[];
  message: string;
  sentAt: string;
  // the organiser's answer, once they gave one (V52, V53)
  decidedAt: string | null;
  note: string;
};

// A booking request from an organiser (V47, V08).
//   new       waiting for the provider: accept, quote or decline
//   quoted    the provider sent their own quote; the organiser hasn't answered (V51)
//   accepted  a booking: the provider accepted, or the organiser accepted their quote (V49, V52)
//   declined  the provider declined (V50), or the organiser declined their quote (V53)
export type IncomingRequest = {
  id: string;
  organiserId: string;
  eventTitle: string;
  // "Crew catering", the request's title after the organiser's name
  title: string;
  date: string;
  startTime: string;
  endTime: string;
  venue: string;
  budgetLkr: number;
  receivedAt: string;
  brief: ProviderBrief;
  payments: ProviderPayment[];
  cancellation: CancellationTerms;
  status: "new" | "quoted" | "accepted" | "declined";
  quote: ProviderQuote | null;
  // why the provider declined, and their note to the organiser (V50)
  declined: { reason: string; note: string; at: string } | null;
  // the booking it became
  bookingId: string | null;
  // "today", "yesterday · 26 hours left": computed by the page; the record only holds times
};

// A job post from an organiser, matched to the provider's category and districts (V10, V57).
export type OpenJob = {
  id: string;
  organiserId: string;
  eventTitle: string;
  title: string;
  date: string;
  venue: string;
  district: string;
  tags: string[];
  budgetMinLkr: number;
  budgetMaxLkr: number;
  quotesBy: string;
  quotes: number;
  brief: ProviderBrief;
  saved: boolean;
  // false shows "Outside your districts"
  inYourDistricts: boolean;
  postedAt: string;
  // the provider's application, once sent (V11, V58–V61)
  application: {
    priceLkr: number;
    message: string;
    availableOnDate: boolean;
    sentAt: string;
    status: "waiting" | "accepted" | "not-chosen" | "withdrawn";
    decidedAt: string | null;
    bookingId: string | null;
  } | null;
};

// A booking: a request the provider accepted, or a quote the organiser accepted (V12, V13).
export type ProviderBooking = {
  id: string;
  // "TZ-24817"
  ref: string;
  requestId: string | null;
  organiserId: string;
  eventTitle: string;
  // "crew catering", after the event's name
  service: string;
  // "Crew and artist catering, 120 people"
  serviceDetail: string;
  date: string;
  // "tea 4:00 PM, dinner 7:30 PM"
  times: string;
  venue: string;
  priceLkr: number;
  bookedAt: string;
  payments: ProviderPayment[];
  cancellation: CancellationTerms;
  // when the organiser marked it completed (V69); reviews open then
  completedAt: string | null;
  reviewed: boolean;
  cancelled: { by: "you" | "organiser"; at: string; reason: string; note: string } | null;
  // new terms: ones the provider proposed and is waiting on (V66), or ones the organiser proposed (V67)
  // date is set when the change moves the event day (V67)
  termsChange: { from: "you" | "organiser"; priceLkr: number; payments: ProviderPayment[]; date: string | null; note: string; at: string } | null;
  reports: { reason: string; text: string; at: string }[];
};

export type StallType = "Food" | "Drinks" | "Merchandise" | "Crafts" | "Other";

// A stall call at an event (V14, V74–V76). Vendors only.
export type StallCall = {
  id: string;
  organiserId: string;
  eventTitle: string;
  eventId: string | null;
  date: string;
  venue: string;
  types: StallType[];
  feeLkr: number;
  applyBy: string;
  slotsLeft: number;
  // an organiser's invitation to this stall (V76): accepting it counts as approval
  invited: boolean;
  // what the invitation offers besides the fee, and the organiser's note (V76)
  offer?: { setup: string; power: string; crowd: string; message: string };
  application: {
    status: "pending" | "approved" | "rejected" | "declined";
    // "B-14" once approved
    stall: string | null;
    zone: string;
    type: StallType;
    note: string;
    sentAt: string;
    decidedAt: string | null;
    // the stall fee (V78–V80)
    fee: { paidAt: string | null; due: string; receipt: string | null };
  } | null;
};

// What consumers see for one approved stall (V15, V77, V82).
export type StallListing = {
  stallId: string;
  description: string;
  useProfilePrices: boolean;
  // searchWords: what guests type to find the stall (V77); breaksRules: flagged by the organiser (V82)
  items: { id: string; name: string; kind: string; priceLkr: number; searchWords: string[]; soldOut: boolean; breaksRules: boolean }[];
  // the organiser hid it for breaking the event rules (V82)
  hidden: { at: string; reason: string } | null;
};

// A day on the availability calendar (V17, V42). Bookings and quotes are added for you.
export type CalendarMark = {
  date: string;
  kind: "booked" | "unavailable" | "quote";
  // "Music Fest", "Colombo Music Fest · confirmed booking"
  label: string;
  detail: string;
  // added from a booking, a stall or a quote; false = marked by hand
  auto: boolean;
};

// Money in and out (V21, V70). Received payments come from bookings; stall fees go out.
export type ProviderMoney = {
  id: string;
  kind: "received" | "stall-fee";
  party: string;
  label: string;
  amountLkr: number;
  at: string;
  method: string;
  bookingId: string | null;
};

export type ProviderProfile = {
  name: string;
  // what the home page greets them by: "Spice Route", "Nethmi"
  shortName: string;
  // "F&B stall" or "Photographer"
  category: string;
  // where they rank ("F&B" or "Photography")
  rankCategory: string;
  districts: string[];
  bio: string;
  badge: "Top Rated" | "Rising" | "New";
  rating: number;
  reviews: number;
  // how the reviews split (V19 "From organisers · 21", "From guests · 17"); freelancers only get
  // organisers' reviews. The pages list a few of them; these are the totals.
  reviewSplit: { organisers: number; guests: number };
  // the track record organisers see (V39): bookings completed through Tezera, and since when
  completedBookings: number;
  since: string;
  rank: number | null;
  // rank score out of 100 (V19)
  rankScore: number;
  // average score per part, e.g. ["Quality", 4.8] (V19)
  scores: [string, number][];
  lateCancellations: number;
  services: { id: string; name: string; detail: string; priceLkr: number; from: boolean }[];
  // "menu" is a menu for vendors and a promo for freelancers; views feed "Most viewed this month" (V36)
  portfolio: { id: string; title: string; kind: "photo" | "video" | "menu"; views?: { count: number; organisers: number } }[];
  phone: string;
  email: string;
  website: string;
};

// A review of the provider (V19), from an organiser or a guest who marked the event Going.
export type ProviderReview = {
  id: string;
  by: string;
  from: "organiser" | "guest";
  event: string;
  at: string;
  tags: string[];
  stars: number;
  text: string;
  reply: string | null;
  reported: { reason: string; note: string; at: string } | null;
};

// An organiser the provider can review (V19's "Review organisers", V20).
export type OrganiserReviewTask = {
  id: string;
  organiserId: string;
  name: string;
  eventTitle: string;
  closesOn: string;
  submitted: { scores: Record<string, number>; text: string; at: string } | null;
};

// One place on a category's leaderboard (V40).
export type LeaderboardRow = { rank: number; name: string; badge: "Top Rated" | "Rising" | "New"; rating: number; reviews: number; you: boolean };

// A post in the home feed from an organiser the provider follows (V06).
export type HomePost = {
  id: string;
  organiserId: string;
  organiser: string;
  kind: "event" | "stalls" | "promo" | "job";
  tag: string;
  title: string;
  detail: string;
  // the note on the right, e.g. "6 food stalls open"; empty shows how long ago it was posted
  side: string;
  eventId: string | null;
  at: string;
  liked: boolean;
  stallId: string | null;
  jobId: string | null;
  comments: { id: string; by: string; text: string; at: string }[];
  // a promo's counts from everyone who saw it, for the promo viewer (V86)
  reach?: { likes: number; comments: number };
};

// Everything one provider's pages read, kept together in the dev store (provider-store.ts).
// An event as providers see it (V07, V88, V89) and its venue map (V81).
export type ProviderEvent = {
  id: string;
  title: string;
  organiserId: string;
  date: string;
  startTime: string;
  endTime: string;
  venue: string;
  // "On time", "Postponed", "Cancelled", and when the organiser last changed it
  status: string;
  statusUpdated: string;
  about: string;
  entry: string;
  category: string;
  // shot: a freelancer's note for that set, from their shot list (F07)
  lineup: { stage: string; time: string; act: string; shot?: string }[];
  // confirmed stalls; mine marks the provider's own
  vendors: { stall: string; name: string; type: string; detail: string; rating: number; items: { name: string; priceLkr: number }[]; mine: boolean }[];
  // the venue map's zones, each with its stall numbers
  zones: { name: string; label: string; stalls: string[] }[];
  slots: { type: string; left: number; feeLkr: number; applyBy: string }[];
  questions: { id: string; text: string; answer: string | null; askedAt: string; answeredAt: string | null; mine: boolean }[];
  rules: string[];
  boardPosts: number;
  // the short share link (V87)
  link: string;
};

// A notification as V23 and F23 show it: the shared shape, plus its tab on the provider's page
// (vendors have Stalls, freelancers Job posts) and whether an SMS went out too.
export type ProviderNotificationTab = "bookings" | "stalls" | "jobs" | "messages" | "events" | "account";
export type ProviderNotification = PortalNotification & { tab: ProviderNotificationTab; sms?: boolean };

export type ProviderState = {
  kind: ProviderKind;
  profile: ProviderProfile;
  verification: Verification;
  organisers: OrganiserCard[];
  requests: IncomingRequest[];
  jobs: OpenJob[];
  bookings: ProviderBooking[];
  stalls: StallCall[];
  listings: StallListing[];
  calendar: CalendarMark[];
  money: ProviderMoney[];
  payout: { bank: string; accountName: string; last4: string; connectedAt: string } | null;
  reviews: ProviderReview[];
  reviewTasks: OrganiserReviewTask[];
  leaderboard: LeaderboardRow[];
  posts: HomePost[];
  events: ProviderEvent[];
  following: string[];
  suggestions: { id: string; name: string; detail: string }[];
  notifications: ProviderNotification[];
  // the search page's "Recent searches" (V84)
  recentSearches: string[];
  conversations: ProviderConversation[];
  // people the provider blocked (V103)
  blocked: { id: string; name: string; at: string }[];
  communities: Community[];
  threads: CommunityThread[];
  settings: AccountSettings;
  // replies within 48 hours over the last 90 days, 0–100 (V47)
  responseRate: number;
};
