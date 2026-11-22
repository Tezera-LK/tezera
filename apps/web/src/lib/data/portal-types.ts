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

// ---------- Hiring (O14, O17–O21, O77–O79, O89) ----------

// "Top Rated" dark, "Rising" pale, "New" grey (O17)
export type ProviderBadge = "Top Rated" | "Rising" | "New";

// a vendor or freelancer an organiser can hire, as their profile shows them (O18)
export type HireProvider = {
  id: string;
  name: string;
  kind: "Vendor" | "Freelancer";
  // what they are ("Photographer") and the category they're ranked in ("Photography")
  role: string;
  category: string;
  // the category as they word it on their profile, e.g. "Photography and video"
  categoryLabel: string;
  districts: string[];
  verified: boolean;
  badge: ProviderBadge | null;
  rating: number;
  reviews: number;
  jobs: number;
  fromLkr: number;
  // their place on the category's leaderboard in their first district; null when unranked
  rank: number | null;
  bio: string;
  services: { name: string; detail: string; fromLkr: number }[];
  // one entry per portfolio item; true for a video
  portfolio: boolean[];
  ratings: { quality: number; punctuality: number; communication: number; value: number };
  reviewList: { id: string; by: string; byRole: string; event: string; month: string; stars: number; text: string }[];
  // days they're already booked ("2026-12-13")
  bookedDates: string[];
};

// one payment of a booking: the deposit or an instalment. `due` is a date ("2026-11-30"), or
// empty when it's due on accepting.
export type PaymentPart = { label: string; amountLkr: number; due: string };

// what a booking request asks for, past the date and price (O19). Empty fields aren't shown.
export type Brief = {
  service: string;
  duration: string;
  audience: string;
  deliverables: string;
  runOfShow: string;
  equipment: string;
};

// a provider's answer with their own price and terms (O78)
export type OwnQuote = {
  priceLkr: number;
  payments: PaymentPart[];
  cancellation: string;
  message: string;
};

// a booking request (O19), and the booking it becomes once accepted (O14 "Confirmed bookings")
export type BookingRequest = {
  id: string;
  eventId: string;
  providerId: string;
  date: string;
  startTime: string;
  endTime: string;
  location: string;
  budgetLkr: number;
  brief: Brief;
  payments: PaymentPart[];
  sentAt: string;
  // waiting for a reply, answered with their own quote, accepted (a booking), declined, or a
  // booking that was later cancelled
  status: "waiting" | "quoted" | "accepted" | "declined" | "cancelled";
  answeredAt: string | null;
  quote: OwnQuote | null;
  // the job post it came from, when the organiser accepted a quote there (O89)
  fromJob: string | null;
  // ---- once it's a booking (O22, O83–O88); left out until something happens ----
  // when the organiser marked it completed (O88), which opens reviews
  completedAt?: string | null;
  // who cancelled (O84, O85), when, why, and the note to the other side
  cancelledBy?: "you" | "provider" | null;
  cancelledAt?: string | null;
  cancelReason?: string;
  cancelNote?: string;
  // new terms the organiser proposed and the provider hasn't answered yet (O83)
  proposedTerms?: ProposedTerms | null;
  // problems reported to an admin (O87)
  reports?: { reason: string; text: string; at: string }[];
};

// "Propose new terms" (O83): a new price, times and instalments, for the provider to accept
export type ProposedTerms = {
  priceLkr: number;
  startTime: string;
  endTime: string;
  payments: PaymentPart[];
  note: string;
  sentAt: string;
};

// a provider's quote on a job post (O21)
export type JobQuote = {
  id: string;
  providerId: string;
  priceLkr: number;
  message: string;
  status: "open" | "accepted" | "not-chosen";
};

// a job post (O20): providers who match send quotes until it closes
export type JobPost = {
  id: string;
  eventId: string;
  title: string;
  category: string;
  date: string;
  startTime: string;
  endTime: string;
  district: string;
  brief: Brief;
  budgetMinLkr: number;
  budgetMaxLkr: number;
  closesAt: string;
  status: "open" | "closed";
  postedAt: string;
  // how many matching providers it was shown to (O79)
  seenBy: number;
  quotes: JobQuote[];
};

// ---------- Payments (O60–O65) ----------

// The organiser's PayHere merchant account (O61). Sandbox only for now.
export type PaymentAccount = { merchantId: string; accountName: string; connectedAt: string };

// One line of "History and receipts" (O60), and the receipt behind it (O64).
// paid = the organiser paid a provider; received = a vendor paid a stall fee; refunded = money
// came back; commission = Tezera's 5%, shown but not charged.
export type PaymentRecord = {
  // the receipt number, "TZ-R-55302"
  id: string;
  kind: "paid" | "received" | "refunded" | "commission";
  // who the money went to or came from
  party: string;
  // "Deposit paid · photography"
  label: string;
  amountLkr: number;
  at: string;
  eventId: string | null;
  // the booking and which of its payments, for money paid or refunded on a booking
  requestId: string | null;
  partIndex: number | null;
  // "PayHere sandbox · card ending 4242", or "Outside Tezera"
  method: string;
};

// ---------- Feed and analytics (O26, O99, O94, O50) ----------

// a comment under a feed post (O94). `mine` = written by the organiser; `hidden` = hidden by them.
export type PostComment = { id: string; by: string; text: string; at: string; mine: boolean; hidden: boolean };

// a post the organiser put on the feed (O26). Media needs storage (EN-03), so only the file's
// name is kept for now.
export type FeedPost = {
  id: string;
  kind: "reel" | "poster" | "image";
  eventId: string | null;
  caption: string;
  fileName: string;
  // a reel's cover frame, in seconds from the start (O99)
  coverSeconds?: number;
  postedAt: string;
  likes: number;
  views: number;
  // taps through to the event page (O50)
  clicks: number;
  comments: PostComment[];
};

// the numbers on Analytics (O50) that don't come from other records yet
export type AnalyticsExtras = {
  pageViews: number;
  newFollowers: number;
  // share of event page views from each place, in percent
  sources: { label: string; percent: number }[];
  // followers at the end of each of the last weeks, oldest first
  followerWeeks: number[];
};

// ---------- The organiser's profile (O27, O42–O45) ----------

export type OrganiserProfile = {
  name: string;
  // "Concerts and festivals"
  eventTypes: string;
  basedIn: string;
  about: string;
  phone: string;
  email: string;
  website: string;
  // "agastra", for tezera.lk/agastra; it can change once every 30 days
  shortLink: string;
  shortLinkChangedAt: string | null;
  // what shows on the public profile (O42's switches)
  showContact: boolean;
  showTrackRecord: boolean;
  showFollowers: boolean;
  verified: boolean;
  verifiedAt: string | null;
  // a renamed organiser keeps the badge while an admin checks the new name
  nameCheckPending: boolean;
  badge: "Top Rated" | "Rising" | null;
  rating: number;
  reviews: number;
  // place among organisers on the leaderboard
  rank: number | null;
  followers: number;
  followersThisWeek: number;
  eventsRun: number;
  trackRecord: { wentAhead: number; postponed: number; cancelled: number; paidOnTimePercent: number };
  // events from before Tezera's records, for "Past events" (O45)
  history: { id: string; title: string; venue: string; date: string; going: number; rating: number | null }[];
};

// someone who follows the organiser (O43)
export type Follower = {
  id: string;
  name: string;
  role: "Consumer" | "Vendor" | "Freelancer";
  // "going to Colombo Music Fest", "followed Mon"
  detail: string;
  // a vendor or freelancer's profile, when they have one
  providerId: string | null;
};

// ---------- Verification (O28, O38–O41) ----------

// one document sent for verification. Files need storage (EN-03), so only the name is kept.
// fix = the admin asked for a clearer copy
export type VerificationDocument = { id: string; name: string; kind: string; state: "sent" | "ok" | "fix" };

export type Verification = {
  // not-started → pending → approved or rejected; a rejected one can be sent again
  status: "not-started" | "pending" | "rejected" | "approved";
  documents: VerificationDocument[];
  submittedAt: string | null;
  decidedAt: string | null;
  // why it wasn't approved, from the admin
  reason: string;
};

// ---------- Reviews and leaderboards (O29–O31, O46–O49) ----------

// a review someone wrote about the organiser (O29 from providers, O49 from consumers)
export type ReceivedReview = {
  id: string;
  from: "provider" | "consumer";
  by: string;
  // "Vendor", "Freelancer"; empty for consumers
  byRole: string;
  event: string;
  at: string;
  overall: number;
  // the parts, e.g. Payment 5, Communication 5, Planning 4.5
  scores: { label: string; value: number }[];
  text: string;
  // the organiser's one reply (O46)
  reply: string | null;
  // set once the organiser reported it (O47); an admin decides (EN-08)
  reported: { reason: string; note: string; at: string } | null;
};

// a provider or stall vendor the organiser can review after an event (O30)
export type ReviewTask = {
  id: string;
  name: string;
  // "Sound and lighting", "Stall vendor"
  kind: string;
  eventTitle: string;
  completedOn: string;
  // reviews close two weeks after the event
  closesOn: string;
};

// a review the organiser wrote, or saved to finish later (O30, O48)
export type WrittenReview = {
  taskId: string;
  // who it's about, kept so "Review posted" (O48) can name them after the task is done
  about: string;
  scores: Record<string, number>;
  text: string;
  at: string;
  submitted: boolean;
};

// one row of "Top organisers" (O31)
export type OrganiserRank = { rank: number; name: string; rating: number; reviews: number; tier: "Top Rated" | "Rising" | "New"; districts: string[]; you: boolean };

// ---------- Messages and community (O23–O25, O90–O93) ----------

// one message in a conversation (O23). A file needs storage (EN-03), so only its name is kept.
export type ChatMessage = {
  id: string;
  mine: boolean;
  at: string;
  text: string;
  file: { name: string; label: string } | null;
  // a picture, drawn as a placeholder until storage
  image: boolean;
};

export type Conversation = {
  id: string;
  name: string;
  kind: "Freelancer" | "Vendor" | "Consumer";
  // "Photographer · Verified"
  detail: string;
  providerId: string | null;
  unread: number;
  blocked: boolean;
  blockedAt?: string;
  // set once the organiser reported them (O92)
  reported: string | null;
  messages: ChatMessage[];
};

// a community the organiser can join (O24)
export type Community = { id: string; name: string; about: string; members: number; newPosts: number; joined: boolean };

// a reply under a thread (O25)
export type ThreadReply = { id: string; author: string; authorRole: string; verified: boolean; at: string; text: string; upvotes: number; voted?: boolean };

// a thread on an event's board or in a community (O16, O24, O25)
export type CommunityThread = {
  id: string;
  eventId: string | null;
  communityId: string | null;
  title: string;
  body: string;
  author: string;
  authorRole: string;
  verified: boolean;
  at: string;
  upvotes: number;
  // the replies shown; `replyCount` counts older ones too
  replies: ThreadReply[];
  replyCount: number;
  pinned: boolean;
  // an event linked from the post
  linkedEventId: string | null;
  reported: boolean;
  // the organiser upvoted it
  voted?: boolean;
};

// ---------- Account settings (O32, O95–O98) ----------

export type AccountSettings = {
  email: string;
  passwordChangedAt: string;
  // a new email or phone waiting for its code (O95)
  pendingContact: string | null;
  // which notifications to send, by key; bookings are always on (O32)
  notify: Record<"bookings" | "messages" | "stalls" | "questions" | "likes", boolean>;
  language: "en" | "si" | "ta";
  theme: "light" | "dark" | "system";
};
