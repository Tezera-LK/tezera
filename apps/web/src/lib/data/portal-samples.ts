// Made-up portal records for `next dev`, copied from the Figma organiser screens, so the dashboard,
// notifications and search have something to show before the backend exists.
// Never used in production builds (see lib/data/portal.ts).
//
// Times are built from "now" on every request, so "Tonight", "Today" and "Mon" stay true whenever
// someone runs the app. Names are the Figma file's; "(sample)" isn't added because these screens
// never leave `next dev`.
import { colomboDay, formatShortDate } from "@/lib/format";
import type { PortalRole } from "@/lib/portal-roles";
import type {
  Account,
  BoardThread,
  BookingToClose,
  ManagedEvent,
  Question,
  StallToReview,
  AccountSettings,
  Community,
  CommunityThread,
  Conversation,
  OrganiserRank,
  ReceivedReview,
  ReviewTask,
  Verification,
  Follower,
  OrganiserProfile,
  AnalyticsExtras,
  FeedPost,
  PaymentAccount,
  PaymentRecord,
  BookingRequest,
  HireProvider,
  JobPost,
  EventStalls,
  StallType,
  StallVendor,
  StallZone,
  CommunityResult,
  EventResult,
  OrganiserDashboard,
  PortalNotification,
  ProviderResult,
} from "@/lib/data/portal-types";

// An ISO time `days` calendar days from today in Sri Lanka, at hh:mm Sri Lanka time.
export function dayAt(now: Date, days: number, hhmm: string): string {
  const today = Date.parse(`${colomboDay(now)}T00:00:00Z`);
  const day = new Date(today + days * 86_400_000).toISOString().slice(0, 10);
  return `${day}T${hhmm}:00+05:30`;
}

// An ISO time `minutes` before now.
function minutesAgo(now: Date, minutes: number): string {
  return new Date(now.getTime() - minutes * 60_000).toISOString();
}

// ---------- Profile menu (O82) ----------

export const sampleAccounts: Record<PortalRole, Account> = {
  organiser: { name: "Agastra Events", email: "agastra@example.com", role: "organiser" },
  vendor: { name: "Spice Route", email: "spiceroute@example.com", role: "vendor" },
  freelancer: { name: "Nethmi Perera", email: "nethmi@example.com", role: "freelancer" },
  attendee: { name: "Sanduni Fernando", email: "sanduni@example.com", role: "attendee" },
  admin: { name: "Tezera admin", email: "admin@example.com", role: "admin" },
};

// ---------- The organiser's events (O05, O07, O08, O52) ----------

// The parts of the dashboard that aren't events: who the organiser is, what's waiting, their rank.
export const sampleOrganiserExtras: Omit<OrganiserDashboard, "featured" | "events"> = {
  organiserName: "Agastra Events",
  attention: [
    { id: "att-qa", title: "3 questions to answer", detail: "Colombo Music Fest · Q&A", href: "/organiser/events/evt-colombo-music-fest/qa" },
    { id: "att-stalls", title: "4 stall applications", detail: "Colombo Music Fest · Stalls" },
    { id: "att-quotes", title: "4 new quotes", detail: "2 photographers, 12 Dec" },
    { id: "att-dilshan", title: "Dilshan Perera sent a quote", detail: "DJ set · LKR 45,000" },
  ],
  rank: { position: 4, among: "organisers", rating: 4.6, reviews: 214, badge: "Top Rated" },
};

// The organiser's followers, for "your 1.2k followers see it in their feed" (O51) and the
// organiser card on the event page (O52)
export const sampleOrganiserProfile = { name: "Agastra Events", rating: 4.6, followers: 1200, verified: true };

const noKnow = { dressCode: "", bring: "", parking: "", rules: "", foodPrices: "", ifRains: "" };

// One event in the store, filled in with the defaults every seed shares.
function seed(now: Date, fields: Partial<ManagedEvent> & Pick<ManagedEvent, "id" | "title" | "status">): ManagedEvent {
  return {
    category: "Music · concert",
    ageRating: "all",
    date: "",
    startTime: "",
    endTime: "",
    venueName: "",
    address: "",
    description: "",
    lineup: [],
    entry: { kind: "free" },
    know: noKnow,
    startsAt: null,
    endsAt: null,
    going: 0,
    interested: 0,
    bookings: null,
    stalls: null,
    liveStatus: null,
    publishedAt: null,
    editedAt: now.toISOString(),
    unpublishedReason: null,
    postponedFrom: null,
    cancelReason: null,
    announcements: [],
    questions: [],
    ...fields,
  };
}

// One question on the event page; answered when `answer` is given.
function q(id: string, text: string, askedBy: string, askedAt: string, answer?: string, answeredAt?: string): Question {
  return { id, text, askedBy, askedByRole: "Consumer", askedAt, answer: answer ?? null, answeredAt: answeredAt ?? null };
}

// Sets date, startTime, endTime, startsAt and endsAt together, `days` from today.
function when(now: Date, days: number, start: string, end: string) {
  const startsAt = dayAt(now, days, start);
  return { date: startsAt.slice(0, 10), startTime: start, endTime: end, startsAt, endsAt: dayAt(now, days, end) };
}

// The events the organiser store starts with in `next dev`: Figma's four upcoming events, the
// draft, and a few past ones for the Past tab.
export function sampleManagedEvents(now: Date): ManagedEvent[] {
  return [
    seed(now, {
      id: "evt-colombo-music-fest",
      title: "Colombo Music Fest",
      status: "published",
      ...when(now, 0, "18:00", "23:30"),
      venueName: "Viharamahadevi Park",
      address: "Viharamahadevi Park, Colombo 07",
      description: "A night of Sri Lankan bands and DJs under the stars, with food and drink stalls around the park.",
      lineup: [
        { time: "18:00", act: "Opening DJ set · Dilshan Perera" },
        { time: "19:30", act: "Midnight Monsoon" },
        { time: "21:00", act: "Headline set · Lanka Sound Collective" },
      ],
      entry: { kind: "paid", priceLkr: 3500, ticketUrl: "mytickets.lk/colombo-music-fest" },
      know: {
        dressCode: "Casual · comfortable shoes",
        bring: "NIC, power bank, rain jacket",
        parking: "Paid parking at Town Hall · PickMe drop-off at Gate 2",
        rules: "18+ after 9 PM · no re-entry · no outside drinks",
        foodPrices: "LKR 500 – 2,000",
        ifRains: "Covered stage; event goes ahead",
      },
      going: 1284,
      interested: 3402,
      bookings: { confirmed: 3, requested: 6 },
      stalls: { approved: 16, offered: 20 },
      liveStatus: { kind: "late", newStartAt: dayAt(now, 0, "18:45") },
      publishedAt: dayAt(now, -17, "10:00"),
      announcements: [
        { id: "ann-1", text: "Bring your NIC: 18+ after 9 PM", sentAt: dayAt(now, 0, "11:00"), audience: ["going", "interested", "followers"] },
        { id: "ann-2", text: "The line-up is on the feed", sentAt: dayAt(now, -3, "18:00"), audience: ["going", "interested", "followers"] },
      ],
      questions: [
        q("q-1", "What time do gates open?", "Sanduni Fernando", dayAt(now, 0, "09:10")),
        q("q-2", "Is there parking for motorbikes?", "Ravindu Jayasuriya", dayAt(now, -1, "20:30")),
        q("q-3", "Can I bring my own water bottle?", "Ayesha Rahman", dayAt(now, -3, "14:00")),
        q("q-4", "Is there a coat check?", "Nimali Perera", dayAt(now, -4, "12:00"), "Yes, at Gate 1, LKR 200.", dayAt(now, -1, "09:00")),
        q("q-5", "Can I bring a camera?", "Kavindu Silva", dayAt(now, -5, "16:00"), "Phone and compact cameras only.", dayAt(now, -2, "10:00")),
        q("q-6", "Is there an area for kids?", "Fathima Nazeer", dayAt(now, -6, "11:00"), "No, this one is 18+ after 9 PM.", dayAt(now, -5, "09:00")),
      ],
    }),
    seed(now, {
      id: "evt-jazz-on-the-green",
      title: "Jazz on the Green",
      status: "published",
      ...when(now, 1, "16:00", "21:00"),
      venueName: "Race Course Grounds",
      address: "Race Course Grounds, Colombo 07",
      description: "An afternoon of jazz trios on the lawn. Bring a mat.",
      going: 642,
      interested: 1880,
      bookings: { confirmed: 2, requested: 3 },
      stalls: { approved: 6, offered: 8 },
      publishedAt: dayAt(now, -20, "09:00"),
    }),
    seed(now, {
      id: "evt-indie-night-4",
      title: "Indie Night Vol. 4",
      status: "postponed",
      ...when(now, 27, "19:30", "23:00"),
      venueName: "Barefoot Garden",
      address: "Barefoot Garden, Galle Road, Colombo 03",
      description: "Four indie bands, one garden. Moved to a new date because of the weather.",
      going: 210,
      interested: 955,
      bookings: { confirmed: 1, requested: 2 },
      publishedAt: dayAt(now, -30, "12:00"),
      postponedFrom: dayAt(now, -3, "19:30"),
    }),
    seed(now, {
      id: "evt-nye-countdown",
      title: "New Year’s Eve Countdown",
      status: "unpublished",
      ...when(now, 42, "21:00", "23:59"),
      venueName: "Galle Face Green",
      address: "Galle Face Green, Colombo 03",
      description: "Countdown, fireworks and a DJ by the sea.",
      publishedAt: dayAt(now, -6, "15:00"),
      unpublishedReason: "Reported as fake",
    }),
    seed(now, {
      id: "evt-rooftop-sessions-2",
      title: "Rooftop Sessions Vol. 2",
      status: "draft",
      ...when(now, 40, "19:00", "22:30"),
      venueName: "Cinnamon Red rooftop",
      editedAt: dayAt(now, -2, "17:20"),
    }),
    seed(now, {
      id: "evt-rooftop-sessions-1",
      title: "Rooftop Sessions Vol. 1",
      status: "published",
      ...when(now, -5, "19:00", "22:30"),
      venueName: "Cinnamon Lakeside rooftop",
      going: 318,
      interested: 910,
      publishedAt: dayAt(now, -60, "10:00"),
    }),
    seed(now, {
      id: "evt-kandy-lake-lights",
      title: "Kandy Lake Lights",
      status: "published",
      ...when(now, -61, "18:30", "22:00"),
      venueName: "Kandy Lake Round",
      going: 1150,
      interested: 2600,
      publishedAt: dayAt(now, -100, "10:00"),
    }),
    seed(now, {
      id: "evt-harbour-food-night",
      title: "Harbour Food Night",
      status: "published",
      ...when(now, -95, "17:00", "23:00"),
      venueName: "Port City Marina",
      going: 2210,
      interested: 4100,
      publishedAt: dayAt(now, -130, "10:00"),
    }),
  ];
}

// ---------- Notifications (O06, O81) ----------

export function sampleNotifications(now: Date): PortalNotification[] {
  return [
    {
      id: "ntf-1",
      type: "bookings",
      title: "Tharindu Jayawardena accepted your booking request",
      shortTitle: "Tharindu accepted your request",
      detail: "Photography · Colombo Music Fest · the booking is confirmed",
      shortDetail: "Photography · Colombo Music Fest",
      kind: "Booking",
      at: minutesAgo(now, 20),
      unread: true,
      action: { label: "Open" },
    },
    {
      id: "ntf-2",
      type: "bookings",
      title: "4 new quotes on 2 photographers, 12 Dec, Colombo",
      shortTitle: "4 new quotes",
      detail: "Job post for Colombo Music Fest · quotes close Fri 4 Dec",
      shortDetail: "2 photographers, 12 Dec",
      kind: "Quotes",
      at: minutesAgo(now, 70),
      unread: true,
      action: { label: "Compare" },
    },
    {
      id: "ntf-3",
      type: "stalls",
      title: "Kottu Corner applied for a food stall",
      shortTitle: "Kottu Corner applied for a stall",
      detail: "Colombo Music Fest · 4 applications waiting",
      shortDetail: "Colombo Music Fest",
      kind: "Stalls",
      at: minutesAgo(now, 140),
      unread: false,
      action: { label: "Review" },
    },
    {
      id: "ntf-4",
      type: "bookings",
      title: "Dilshan Perera sent their own quote",
      shortTitle: "Dilshan Perera sent a quote",
      detail: "DJ set · LKR 45,000 · Colombo Music Fest",
      shortDetail: "DJ set · LKR 45,000",
      kind: "Booking",
      at: dayAt(now, -2, "10:15"),
      unread: false,
      action: { label: "View" },
    },
    {
      id: "ntf-5",
      type: "bookings",
      title: "Lumen Stage Co. cancelled their booking",
      shortTitle: "Lumen Stage Co. cancelled",
      detail: "Staging · Colombo Music Fest · SMS sent",
      shortDetail: "Staging · Colombo Music Fest",
      kind: "Booking",
      at: dayAt(now, -2, "08:40"),
      unread: false,
      action: { label: "View" },
    },
    {
      id: "ntf-6",
      type: "messages",
      title: "New message from Sanduni Fernando",
      shortTitle: "Message from Sanduni Fernando",
      detail: "Is the show still on tonight?",
      shortDetail: "Is the show still on tonight?",
      kind: "Message",
      at: dayAt(now, -3, "20:05"),
      unread: false,
      action: { label: "Reply" },
    },
    {
      id: "ntf-7",
      type: "account",
      title: "Your verification was approved",
      shortTitle: "Verification approved",
      detail: "You can now open stall slots, post jobs and send booking requests",
      shortDetail: "You can now open stall slots",
      kind: "Account",
      at: dayAt(now, -48, "11:00"),
      unread: false,
      action: { label: "View" },
    },
  ];
}

// ---------- Search (O80) ----------

// The search page's providers (O80) are the hiring samples; see sampleHireProviders below.

export function sampleEventResults(now: Date): EventResult[] {
  return [
    {
      id: "evt-photo-expo",
      title: "Photography Expo Colombo",
      startsAt: dayAt(now, 65, "10:00"),
      venueName: "BMICH",
      organiserName: "TechLK",
    },
    {
      id: "evt-wedding-photo-walk",
      title: "Wedding Photography Walk",
      startsAt: dayAt(now, 80, "07:00"),
      venueName: "Galle Fort",
      organiserName: "Southern Lens",
    },
    {
      id: "evt-colombo-music-fest",
      title: "Colombo Music Fest",
      startsAt: dayAt(now, 0, "18:00"),
      venueName: "Viharamahadevi Park",
      organiserName: "Agastra Events",
    },
  ];
}

export const sampleCommunities: CommunityResult[] = [
  { id: "com-1", name: "Colombo Photographers", members: 1240 },
  { id: "com-2", name: "Hill Events Crew", members: 310 },
];

export const sampleRecentSearches = ["DJ", "sound and lighting", "Hill Events"];

// ---------- One event's pages (O09, O16, O55, O57) ----------

// Hiring, stalls and the map on the overview (O09), by event id. Read-only until the Hiring,
// Stalls and Venue map slices.
export const sampleEventWork: Record<string, { requestsSent: number; quotesReceived: number; mapVersion: number; mapPublishedAt: string }> = {
  "evt-colombo-music-fest": { requestsSent: 6, quotesReceived: 4, mapVersion: 3, mapPublishedAt: new Date(Date.now() - 2 * 3_600_000).toISOString() },
};

// Each event's discussion board threads (O16), by event id.
export function sampleBoard(now: Date): Record<string, BoardThread[]> {
  return {
    "evt-colombo-music-fest": [
      { id: "th-1", title: "Set times are up: see the Line-up tab", author: "Agastra Events", authorRole: "Organiser", verified: true, replies: 12, upvotes: 64, pinned: true, postedAt: dayAt(now, -2, "10:00") },
      { id: "th-2", title: "Who’s going? Meet at Gate 2 at 5:30", author: "Sanduni", authorRole: "Consumer", verified: false, replies: 34, upvotes: 52, pinned: false, postedAt: dayAt(now, -1, "21:00") },
      { id: "th-3", title: "Carpool from Nugegoda, 2 seats left", author: "Ravindu", authorRole: "Consumer", verified: false, replies: 8, upvotes: 17, pinned: false, postedAt: dayAt(now, 0, "08:00") },
      { id: "th-4", title: "Which stalls are worth it?", author: "Spice Route Catering", authorRole: "Vendor", verified: false, replies: 21, upvotes: 30, pinned: false, postedAt: dayAt(now, -3, "13:00") },
    ],
  };
}

// What's left to close after an event ended (O57), by event id.
export const samplePastEvent: Record<string, { rating: number; reviews: number; bookings: BookingToClose[]; stalls: StallToReview[] }> = {
  "evt-rooftop-sessions-1": {
    rating: 4.6,
    reviews: 41,
    bookings: [
      { id: "bk-1", provider: "Pulse Sound & Light", kind: "Vendor", service: "Sound and lighting", status: "completed" },
      { id: "bk-2", provider: "Ruwan Silva", kind: "Freelancer", service: "MC", status: "not-marked" },
    ],
    stalls: [{ id: "st-1", vendor: "Batik Lane", category: "Merchandise", stall: "A-03" }],
  },
};

// What an admin's unpublishing closed (O55), by event id.
export function sampleUnpublished(now: Date): Record<string, { at: string; detail: string; closed: { title: string; detail: string; state: "Closed" | "On hold" }[] }> {
  return {
    "evt-nye-countdown": {
      at: dayAt(now, -2, "10:00"),
      detail: "We could not confirm that Galle Face Green is booked for this date. Send a letter from the venue to get it published again.",
      closed: [
        { title: "Stall applications", detail: "6 applications closed · vendors told", state: "Closed" },
        { title: "Job posts", detail: "1 post closed · providers told", state: "Closed" },
        { title: "Bookings", detail: "2 bookings stay for now; an admin will contact both sides", state: "On hold" },
      ],
    },
  };
}

// The bookings and stall vendors on the past event that still want a review, for My events'
// "Reviews to write" panel (O07).
export const sampleReviewsToWrite = [
  { id: "rv-1", name: "Pulse Sound & Light", eventId: "evt-rooftop-sessions-1", eventTitle: "Rooftop Sessions Vol. 1" },
];

// ---------- Stalls (O13, O72–O76) ----------

// The vendors an organiser can invite (O73) and who applied (O13).
export const sampleStallVendors: StallVendor[] = [
  { id: "ven-kottu-corner", name: "Kottu Corner", type: "Food", rating: 4.4, verified: true, city: "Colombo" },
  { id: "ven-island-ice-cream", name: "Island Ice Cream", type: "Food", rating: 4.6, verified: true, city: "Negombo" },
  { id: "ven-lanka-threads", name: "Lanka Threads", type: "Merchandise", rating: 4.2, verified: false, city: "Kandy" },
  { id: "ven-thambili-bar", name: "Thambili Bar", type: "Drinks", rating: 4.5, verified: true, city: "Colombo" },
  { id: "ven-thambili-hut", name: "Thambili Hut", type: "Drinks", rating: 4.1, verified: false, city: "Gampaha" },
  { id: "ven-spice-route", name: "Spice Route Catering", type: "Food", rating: 4.7, verified: true, city: "Colombo" },
  { id: "ven-brew-bros", name: "Brew Bros", type: "Drinks", rating: 4.3, verified: true, city: "Colombo" },
  { id: "ven-hoppers-co", name: "Hoppers & Co", type: "Food", rating: 4.5, verified: false, city: "Dehiwala" },
  { id: "ven-batik-lane", name: "Batik Lane", type: "Merchandise", rating: 4.4, verified: true, city: "Galle" },
  { id: "ven-clay-kiln", name: "Clay & Kiln", type: "Crafts", rating: 4.6, verified: false, city: "Galle" },
];

const vendor = (id: string) => sampleStallVendors.find((v) => v.id === id)!;

// The venue map's stall areas. Taken numbers belong to approved stalls that aren't in the
// sample list below.
export const sampleStallZones: Record<StallType, StallZone> = {
  Food: { name: "Food court", numbers: ["B-12", "B-13", "B-14", "B-15", "B-16"], taken: ["B-12", "B-13"] },
  Drinks: { name: "Drinks zone", numbers: ["C-01", "C-02", "C-03", "C-04", "C-05"], taken: ["C-01", "C-03", "C-04"] },
  Merchandise: { name: "Market lane", numbers: ["A-01", "A-02", "A-03", "A-04", "A-05", "A-06"], taken: ["A-01"] },
  Crafts: { name: "Craft corner", numbers: ["A-07", "A-08", "A-09"], taken: [] },
  Other: { name: "Market lane", numbers: ["A-10", "A-11", "A-12"], taken: [] },
};

// Each event's stalls, by event id. Colombo Music Fest has Figma's O13. Its dates count back
// from the event, which the samples hold tonight.
export function sampleStalls(now: Date): Record<string, EventStalls> {
  const day = (days: number) => dayAt(now, days, "10:00").slice(0, 10);
  const rules = "No alcohol · gas cookers only · lights off by 11:30 PM";
  return {
    "evt-colombo-music-fest": {
      slots: [
        { type: "Food", slots: 10, feeLkr: 15000, closesOn: day(-3), feeDue: day(-1), rules, applied: 12, approved: 9 },
        { type: "Drinks", slots: 5, feeLkr: 12000, closesOn: day(-3), feeDue: day(-1), rules, applied: 5, approved: 5 },
        { type: "Merchandise", slots: 6, feeLkr: 8000, closesOn: day(-3), feeDue: day(-1), rules, applied: 3, approved: 2 },
      ],
      applications: [
        { id: "app-1", vendor: vendor("ven-kottu-corner"), type: "Food", receivedAt: dayAt(now, -7, "09:20"), status: "applied", message: "" },
        { id: "app-2", vendor: vendor("ven-island-ice-cream"), type: "Food", receivedAt: dayAt(now, -6, "14:05"), status: "applied", message: "" },
        { id: "app-3", vendor: vendor("ven-lanka-threads"), type: "Merchandise", receivedAt: dayAt(now, -5, "11:40"), status: "applied", message: "" },
        {
          id: "app-4",
          vendor: vendor("ven-thambili-bar"),
          type: "Drinks",
          receivedAt: dayAt(now, -4, "16:30"),
          status: "invited",
          message: "We would love your king coconuts in the drinks zone!",
        },
      ],
      approved: [
        {
          id: "stall-1",
          vendor: vendor("ven-spice-route"),
          type: "Food",
          number: "B-14",
          fee: "paid",
          feeDue: day(-1),
          hidden: false,
          listing: {
            blurb: "Kottu, isso wade and cold drinks. Halal kitchen, fast queue.",
            items: [
              { id: "it-1", name: "Chicken kottu", kind: "Main", priceLkr: 1200, hidden: false },
              { id: "it-2", name: "Isso wade", kind: "Short eat", priceLkr: 400, hidden: false },
              { id: "it-3", name: "Arrack cocktail", kind: "Drink", priceLkr: 900, hidden: false, note: "breaks your “no alcohol” rule" },
              { id: "it-4", name: "Water 500 ml", kind: "Drink", priceLkr: 150, hidden: false },
              { id: "it-5", name: "Egg hopper", kind: "Main", priceLkr: 250, hidden: false },
              { id: "it-6", name: "Vegetable roti", kind: "Short eat", priceLkr: 200, hidden: false },
              { id: "it-7", name: "Lime juice", kind: "Drink", priceLkr: 350, hidden: false },
              { id: "it-8", name: "Watalappan", kind: "Dessert", priceLkr: 450, hidden: false },
            ],
          },
        },
        {
          id: "stall-2",
          vendor: vendor("ven-brew-bros"),
          type: "Drinks",
          number: "C-02",
          fee: "paid-outside",
          feeDue: day(-1),
          hidden: false,
          listing: {
            blurb: "Iced coffee, tea and fresh juice.",
            items: [
              { id: "it-1", name: "Iced coffee", kind: "Drink", priceLkr: 650, hidden: false },
              { id: "it-2", name: "Ceylon tea", kind: "Drink", priceLkr: 300, hidden: false },
              { id: "it-3", name: "Passion fruit juice", kind: "Drink", priceLkr: 500, hidden: false },
              { id: "it-4", name: "Ginger beer", kind: "Drink", priceLkr: 400, hidden: false },
              { id: "it-5", name: "Water 500 ml", kind: "Drink", priceLkr: 150, hidden: false },
              { id: "it-6", name: "Cold brew", kind: "Drink", priceLkr: 750, hidden: false },
            ],
          },
        },
        {
          id: "stall-3",
          vendor: vendor("ven-hoppers-co"),
          type: "Food",
          number: "B-11",
          fee: "due",
          feeDue: day(-1),
          hidden: true,
          listing: {
            blurb: "Hoppers made to order, with sambol and curries.",
            items: [
              { id: "it-1", name: "Plain hopper", kind: "Main", priceLkr: 150, hidden: false },
              { id: "it-2", name: "Egg hopper", kind: "Main", priceLkr: 250, hidden: false },
              { id: "it-3", name: "String hoppers", kind: "Main", priceLkr: 400, hidden: false },
            ],
          },
        },
        { id: "stall-4", vendor: vendor("ven-batik-lane"), type: "Merchandise", number: null, fee: "due", feeDue: day(-1), hidden: false, listing: null },
      ],
      collected: { paid: 12, amountLkr: 168000 },
      zones: sampleStallZones,
    },
  };
}

// ---------- Hiring (O14, O17–O21, O77–O79, O89) ----------

const noBrief = { service: "", duration: "", audience: "", deliverables: "", runOfShow: "", equipment: "" };
const someReviews = (event: string) => [
  { id: "rv-1", by: "Hill Events", byRole: "Organiser", event, month: "Nov", stars: 5, text: "On time, easy to work with, and the results were what we asked for." },
];

// Vendors and freelancers an organiser can hire (O17, O18). The search page's providers (O80)
// come from this list too.
export const sampleHireProviders: HireProvider[] = [
  {
    id: "prv-1",
    name: "Tharindu Jayawardena",
    kind: "Freelancer",
    role: "Photographer",
    category: "Photography",
    categoryLabel: "Photographer",
    districts: ["Colombo", "Gampaha"],
    verified: true,
    badge: "Top Rated",
    rating: 4.8,
    reviews: 126,
    jobs: 210,
    fromLkr: 30000,
    rank: 2,
    bio: "Event and concert photographer. Fast edits, and calm on a busy stage.",
    services: [
      { name: "Event coverage, 6 hours", detail: "300 edited photos within 7 days", fromLkr: 35000 },
      { name: "Half-day coverage, 3 hours", detail: "120 edited photos within 5 days", fromLkr: 20000 },
      { name: "Photo booth with prints", detail: "Unlimited prints for 3 hours", fromLkr: 45000 },
    ],
    portfolio: [false, true, false, false, true, false],
    ratings: { quality: 4.9, punctuality: 4.8, communication: 4.7, value: 4.6 },
    reviewList: [
      { id: "rv-1", by: "Hill Events", byRole: "Organiser", event: "Kandy Food Carnival", month: "Nov", stars: 5, text: "Great shots of the food stalls, delivered in four days. We will book again." },
      { id: "rv-2", by: "Punchline LK", byRole: "Organiser", event: "Laugh Out Loud Comedy", month: "Oct", stars: 4, text: "Good photos. Arrived 20 minutes late but caught every set." },
    ],
    bookedDates: [],
  },
  {
    id: "prv-2",
    name: "Frame & Focus Studio",
    kind: "Vendor",
    role: "Photography and video",
    category: "Photography",
    categoryLabel: "Photography and video",
    districts: ["Colombo", "Kandy", "Galle"],
    verified: true,
    badge: "Top Rated",
    rating: 4.7,
    reviews: 98,
    jobs: 164,
    fromLkr: 45000,
    rank: 1,
    bio: "A studio of five shooters and two editors. Photo and video for festivals and launches.",
    services: [
      { name: "Photo and video, full day", detail: "Two shooters, a 3-minute highlight film", fromLkr: 120000 },
      { name: "Event photography, 6 hours", detail: "400 edited photos within 4 days", fromLkr: 45000 },
    ],
    portfolio: [true, false, false, true, false, false],
    ratings: { quality: 4.8, punctuality: 4.7, communication: 4.6, value: 4.5 },
    reviewList: someReviews("Galle Literary Night"),
    bookedDates: [],
  },
  {
    id: "prv-3",
    name: "Malsha Gunasekara",
    kind: "Freelancer",
    role: "Photographer",
    category: "Photography",
    categoryLabel: "Photographer",
    districts: ["Colombo", "Gampaha"],
    verified: true,
    badge: "Rising",
    rating: 4.6,
    reviews: 41,
    jobs: 58,
    fromLkr: 25000,
    rank: 3,
    bio: "Live music and crowd photography. Edits within five days.",
    services: [{ name: "Event coverage, 5 hours", detail: "250 edited photos within 5 days", fromLkr: 25000 }],
    portfolio: [false, false, true, false],
    ratings: { quality: 4.7, punctuality: 4.6, communication: 4.6, value: 4.5 },
    reviewList: someReviews("Rooftop Sessions Vol. 1"),
    bookedDates: [],
  },
  {
    id: "prv-8",
    name: "Nadeesha Perera",
    kind: "Freelancer",
    role: "Photographer",
    category: "Photography",
    categoryLabel: "Photographer",
    districts: ["Colombo"],
    verified: false,
    badge: "Rising",
    rating: 4.5,
    reviews: 30,
    jobs: 40,
    fromLkr: 28000,
    rank: 4,
    bio: "Portraits and events around Colombo.",
    services: [{ name: "Event coverage, 4 hours", detail: "200 edited photos within 7 days", fromLkr: 28000 }],
    portfolio: [false, false, false],
    ratings: { quality: 4.6, punctuality: 4.5, communication: 4.4, value: 4.4 },
    reviewList: [],
    bookedDates: [],
  },
  {
    id: "prv-9",
    name: "Chamath Rodrigo",
    kind: "Freelancer",
    role: "Photographer",
    category: "Photography",
    categoryLabel: "Photographer",
    districts: ["Colombo"],
    verified: false,
    badge: "New",
    rating: 4.3,
    reviews: 6,
    jobs: 9,
    fromLkr: 18000,
    rank: 5,
    bio: "New on Tezera. Three outdoor festivals shot this year.",
    services: [{ name: "Event coverage, 4 hours", detail: "150 edited photos within 7 days", fromLkr: 18000 }],
    portfolio: [false, false],
    ratings: { quality: 4.4, punctuality: 4.3, communication: 4.3, value: 4.4 },
    reviewList: [],
    bookedDates: [],
  },
  {
    id: "prv-4",
    name: "Kasun Wickramasinghe",
    kind: "Freelancer",
    role: "Photographer",
    category: "Photography",
    categoryLabel: "Photographer",
    districts: ["Kandy"],
    verified: false,
    badge: null,
    rating: 4.4,
    reviews: 22,
    jobs: 31,
    fromLkr: 20000,
    rank: null,
    bio: "Weddings and events in the hill country.",
    services: [{ name: "Event coverage, 4 hours", detail: "180 edited photos within 7 days", fromLkr: 20000 }],
    portfolio: [false, false, false],
    ratings: { quality: 4.5, punctuality: 4.4, communication: 4.3, value: 4.4 },
    reviewList: [],
    bookedDates: [],
  },
  {
    id: "prv-5",
    name: "Lens & Light Collective",
    kind: "Vendor",
    role: "Photography and video",
    category: "Photography",
    categoryLabel: "Photography and video",
    districts: ["Galle"],
    verified: true,
    badge: null,
    rating: 4.3,
    reviews: 18,
    jobs: 25,
    fromLkr: 60000,
    rank: null,
    bio: "Drone, video and stills for coastal events.",
    services: [{ name: "Drone and video, half day", detail: "A 2-minute film within 10 days", fromLkr: 60000 }],
    portfolio: [true, true, false],
    ratings: { quality: 4.4, punctuality: 4.3, communication: 4.2, value: 4.1 },
    reviewList: [],
    bookedDates: [],
  },
  {
    id: "prv-6",
    name: "Dilshan Perera",
    kind: "Freelancer",
    role: "DJ",
    category: "DJ",
    categoryLabel: "DJ",
    districts: ["Colombo"],
    verified: true,
    badge: "Rising",
    rating: 4.5,
    reviews: 33,
    jobs: 47,
    fromLkr: 45000,
    rank: 3,
    bio: "House and Sri Lankan classics. Brings his own lighting rig.",
    services: [{ name: "DJ set, 3 hours", detail: "Own decks and lighting", fromLkr: 45000 }],
    portfolio: [true, false, false],
    ratings: { quality: 4.6, punctuality: 4.4, communication: 4.5, value: 4.4 },
    reviewList: someReviews("Rooftop Sessions Vol. 1"),
    bookedDates: [],
  },
  {
    id: "prv-7",
    name: "Lumen Stage Co.",
    kind: "Vendor",
    role: "Staging",
    category: "Staging",
    categoryLabel: "Staging and trussing",
    districts: ["Colombo", "Gampaha"],
    verified: true,
    badge: null,
    rating: 4.2,
    reviews: 27,
    jobs: 60,
    fromLkr: 80000,
    rank: 2,
    bio: "Stages, trussing and barriers for outdoor shows.",
    services: [{ name: "Stage, 8 x 6 m", detail: "Set up and taken down by our crew", fromLkr: 80000 }],
    portfolio: [false, false],
    ratings: { quality: 4.3, punctuality: 4.1, communication: 4.2, value: 4.2 },
    reviewList: [],
    bookedDates: [],
  },
  {
    id: "prv-10",
    name: "Pulse Sound & Light",
    kind: "Vendor",
    role: "Sound and lighting",
    category: "Sound and lighting",
    categoryLabel: "Sound and lighting",
    districts: ["Colombo", "Gampaha", "Kalutara"],
    verified: true,
    badge: "Top Rated",
    rating: 4.8,
    reviews: 75,
    jobs: 140,
    fromLkr: 150000,
    rank: 1,
    bio: "PA, stage lighting and an engineer for crowds up to 5,000.",
    services: [{ name: "Festival PA and lights", detail: "Engineer and crew included", fromLkr: 150000 }],
    portfolio: [true, false, false],
    ratings: { quality: 4.9, punctuality: 4.8, communication: 4.7, value: 4.6 },
    reviewList: someReviews("Kandy Lake Lights"),
    bookedDates: [],
  },
  {
    id: "prv-11",
    name: "Ruwan Silva",
    kind: "Freelancer",
    role: "MC",
    category: "Hosting",
    categoryLabel: "MC and host",
    districts: ["Colombo"],
    verified: true,
    badge: null,
    rating: 4.6,
    reviews: 52,
    jobs: 88,
    fromLkr: 20000,
    rank: 2,
    bio: "Bilingual MC for concerts and launches.",
    services: [{ name: "MC, one evening", detail: "Sinhala and English", fromLkr: 20000 }],
    portfolio: [true, false],
    ratings: { quality: 4.7, punctuality: 4.6, communication: 4.7, value: 4.5 },
    reviewList: [],
    bookedDates: [],
  },
];

// The organiser's booking requests and job posts. Colombo Music Fest has Figma's O14; the dates
// count from tonight, when the samples hold it.
export function sampleHiring(now: Date): { requests: BookingRequest[]; jobs: JobPost[] } {
  const day = (days: number) => dayAt(now, days, "10:00").slice(0, 10);
  const at = (days: number, time: string) => dayAt(now, days, time);
  const base = {
    eventId: "evt-colombo-music-fest",
    date: day(0),
    startTime: "17:00",
    endTime: "23:30",
    location: "Viharamahadevi Park, Colombo 07",
    fromJob: null,
  };
  const photoBrief = {
    ...noBrief,
    service: "Photography",
    duration: "6.5 hours",
    audience: "3,000",
    deliverables: "300 edited photos within 7 days",
    runOfShow: "Gates 5:30 PM · headline set 9:00 PM · finish 11:30 PM",
  };
  const split = (total: number, deposit: number) => [
    { label: "Deposit", amountLkr: deposit, due: day(-19) },
    { label: "Instalment 1", amountLkr: total - deposit, due: day(0) },
  ];

  return {
    requests: [
      { ...base, id: "req-1", providerId: "prv-3", budgetLkr: 30000, brief: photoBrief, payments: split(30000, 10000), sentAt: at(-1, "11:00"), status: "waiting", answeredAt: null, quote: null },
      {
        ...base,
        id: "req-2",
        providerId: "prv-6",
        budgetLkr: 35000,
        brief: { ...noBrief, service: "DJ set", duration: "3 hours", runOfShow: "Opening set 5:00 PM to 8:00 PM" },
        payments: [
          { label: "Deposit", amountLkr: 10000, due: day(-19) },
          { label: "Instalment 1", amountLkr: 25000, due: day(-1) },
        ],
        sentAt: at(-2, "15:20"),
        status: "quoted",
        answeredAt: at(-1, "09:40"),
        quote: {
          priceLkr: 45000,
          payments: [
            { label: "Deposit", amountLkr: 15000, due: "" },
            { label: "Rest", amountLkr: 30000, due: day(-1) },
          ],
          cancellation: "Deposit kept if you cancel within 14 days",
          message: "The extra covers a second set from 9:30 and my own lighting rig. Happy to start at 5:45 instead of 5.",
        },
      },
      {
        ...base,
        id: "req-3",
        providerId: "prv-1",
        budgetLkr: 35000,
        brief: photoBrief,
        // Figma O22: a paid deposit, an instalment due and one still to come
        payments: [
          { label: "Deposit", amountLkr: 10000, due: day(-19) },
          { label: "Instalment 1", amountLkr: 15000, due: day(0) },
          { label: "Instalment 2", amountLkr: 10000, due: day(2) },
        ],
        sentAt: at(-4, "10:15"),
        status: "accepted",
        answeredAt: at(-3, "18:00"),
        quote: null,
      },
      {
        ...base,
        id: "req-4",
        providerId: "prv-7",
        budgetLkr: 90000,
        brief: { ...noBrief, service: "Staging", equipment: "Power at the stage" },
        payments: split(90000, 30000),
        sentAt: at(-5, "12:00"),
        status: "declined",
        answeredAt: at(-4, "10:00"),
        quote: null,
      },
      {
        ...base,
        id: "req-5",
        providerId: "prv-10",
        budgetLkr: 180000,
        brief: { ...noBrief, service: "Sound and lighting", audience: "3,000" },
        payments: split(180000, 60000),
        sentAt: at(-25, "10:00"),
        status: "accepted",
        answeredAt: at(-24, "16:00"),
        quote: null,
      },
      {
        ...base,
        id: "req-6",
        providerId: "prv-11",
        budgetLkr: 25000,
        brief: { ...noBrief, service: "MC" },
        payments: split(25000, 5000),
        sentAt: at(-20, "10:00"),
        status: "cancelled",
        answeredAt: at(-19, "10:00"),
        quote: null,
        // Figma O85: the provider cancelled, more than 7 days out
        cancelledBy: "provider",
        cancelledAt: at(-10, "10:00"),
        cancelReason: "a family emergency",
      },
    ],
    jobs: [
      {
        id: "job-1",
        eventId: "evt-colombo-music-fest",
        title: `2 photographers, ${formatShortDate(dayAt(now, 0, "12:00"))}, Colombo`,
        category: "Photography",
        date: day(0),
        startTime: "17:00",
        endTime: "23:30",
        district: "Colombo",
        brief: { ...photoBrief, service: "Event photography, 2 people", deliverables: "300 edited photos each within 7 days" },
        budgetMinLkr: 25000,
        budgetMaxLkr: 40000,
        closesAt: at(0, "15:00"),
        status: "open",
        postedAt: at(-6, "10:00"),
        seenBy: 42,
        quotes: [
          { id: "q-1", providerId: "prv-3", priceLkr: 32000, message: "Happy to shoot alongside a second photographer. Edits within 5 days.", status: "open" },
          { id: "q-2", providerId: "prv-9", priceLkr: 28000, message: "New on Tezera, but I have shot three outdoor festivals this year.", status: "open" },
          { id: "q-3", providerId: "prv-2", priceLkr: 38000, message: "One of our two shooters can cover this. Edits within 4 days.", status: "open" },
          { id: "q-4", providerId: "prv-8", priceLkr: 41000, message: "Both evening sets, with a quick turnaround.", status: "open" },
        ],
      },
      {
        id: "job-2",
        eventId: "evt-colombo-music-fest",
        title: "Sound and lighting",
        category: "Sound and lighting",
        date: day(0),
        startTime: "14:00",
        endTime: "23:59",
        district: "Colombo",
        brief: { ...noBrief, service: "PA and stage lighting", audience: "3,000" },
        budgetMinLkr: 150000,
        budgetMaxLkr: 200000,
        closesAt: at(-3, "18:00"),
        status: "closed",
        postedAt: at(-30, "10:00"),
        seenBy: 12,
        quotes: [
          { id: "q-5", providerId: "prv-10", priceLkr: 180000, message: "PA, lights and an engineer.", status: "not-chosen" },
          { id: "q-6", providerId: "prv-7", priceLkr: 195000, message: "Lights only, with trussing.", status: "not-chosen" },
          { id: "q-7", providerId: "prv-5", priceLkr: 170000, message: "Video wall and lights.", status: "not-chosen" },
        ],
      },
    ],
  };
}

// Messages with providers on the event's Hiring tab (O14). Read-only until the Messages slice.
export const sampleHiringMessages: Record<string, { id: string; name: string; text: string }[]> = {
  "evt-colombo-music-fest": [
    { id: "msg-1", name: "Dilshan Perera", text: "Can we start at 5:45?" },
    { id: "msg-2", name: "Pulse Sound & Light", text: "Rigging starts at 2 PM" },
  ],
};

// The search page's providers (O80), from the hiring samples.
export const sampleProviders: ProviderResult[] = sampleHireProviders.map((p) => ({
  id: p.id,
  name: p.name,
  kind: p.kind === "Vendor" ? "vendor" : "freelancer",
  category: p.categoryLabel,
  rating: p.rating,
  priceFrom: p.fromLkr,
  badge: p.badge === "New" ? null : p.badge,
}));

// ---------- Payments (O60–O65) ----------

// The organiser's payment account and history in `next dev`. The sandbox account is connected,
// as on O60; O61 can change it.
export function samplePayments(now: Date): { account: PaymentAccount | null; records: PaymentRecord[] } {
  const at = (days: number, time: string) => dayAt(now, days, time);
  const fest = "evt-colombo-music-fest";
  const card = "PayHere sandbox · card ending 4242";
  return {
    account: { merchantId: "1218007", accountName: "Agastra Events (Pvt) Ltd", connectedAt: at(-40, "10:00") },
    records: [
      { id: "TZ-R-55290", kind: "paid", party: "Pulse Sound & Light", label: "Deposit paid · sound and lighting", amountLkr: 60000, at: at(-23, "11:30"), eventId: fest, requestId: "req-5", partIndex: 0, method: card },
      { id: "TZ-R-55291", kind: "paid", party: "Tharindu Jayawardena", label: "Deposit paid · photography", amountLkr: 10000, at: at(-2, "09:14"), eventId: fest, requestId: "req-3", partIndex: 0, method: card },
      { id: "TZ-R-55292", kind: "commission", party: "Tezera", label: "Commission 5% · shown, not charged", amountLkr: 500, at: at(-2, "09:14"), eventId: fest, requestId: "req-3", partIndex: null, method: "Not charged" },
      { id: "TZ-R-55293", kind: "refunded", party: "Ruwan Silva", label: "Deposit refunded · MC cancelled", amountLkr: 5000, at: at(-10, "10:30"), eventId: fest, requestId: "req-6", partIndex: 0, method: card },
      { id: "TZ-R-55294", kind: "received", party: "Spice Route Catering", label: "Stall fee received · B-14 · Colombo Music Fest", amountLkr: 15000, at: at(0, "08:40"), eventId: fest, requestId: null, partIndex: null, method: card },
    ],
  };
}

// ---------- Feed and analytics (O26, O94, O50) ----------

// The organiser's feed posts in `next dev`, Figma's four, newest first.
export function sampleFeedPosts(now: Date): FeedPost[] {
  const at = (days: number, time: string) => dayAt(now, days, time);
  const fest = "evt-colombo-music-fest";
  const c = (id: string, by: string, text: string, when: string, mine = false) => ({ id, by, text, at: when, mine, hidden: false });
  return [
    {
      id: "post-1",
      kind: "reel",
      eventId: fest,
      caption: "Line-up reveal · Music Fest",
      fileName: "lineup-reveal.mp4",
      postedAt: at(-3, "18:00"),
      likes: 1200,
      views: 14800,
      clicks: 880,
      comments: [
        c("cm-1", "Sanduni Fernando", "Who's closing the night?", at(-3, "18:20")),
        c("cm-2", "Ravindu Jayasuriya", "Can't wait! Is there parking near Gate 2?", at(-3, "19:05")),
        c("cm-3", "Agastra Events", "Yes, Green Path car park from 4 PM.", at(-3, "19:30"), true),
        c("cm-4", "Brew Bros", "See you at C-02!", at(-2, "09:00")),
      ],
    },
    { id: "post-2", kind: "poster", eventId: fest, caption: "Gates, parking and what to bring", fileName: "gates.png", postedAt: at(-4, "12:00"), likes: 640, views: 8100, clicks: 410, comments: [] },
    { id: "post-3", kind: "image", eventId: "evt-jazz-on-the-green", caption: "Jazz on the Green is on", fileName: "jazz.jpg", postedAt: at(-6, "10:00"), likes: 410, views: 5300, clicks: 260, comments: [] },
    { id: "post-4", kind: "reel", eventId: fest, caption: "Behind the scenes: the stage build", fileName: "stage-build.mp4", postedAt: at(-7, "17:00"), likes: 2300, views: 21400, clicks: 1020, comments: [] },
  ];
}

// The analytics numbers with no records behind them yet (O50).
export const sampleAnalytics: AnalyticsExtras = {
  pageViews: 18400,
  newFollowers: 214,
  sources: [
    { label: "Feed posts", percent: 42 },
    { label: "Search", percent: 27 },
    { label: "Shared links", percent: 21 },
    { label: "Community boards", percent: 10 },
  ],
  followerWeeks: [986, 1010, 1040, 1072, 1105, 1150, 1200],
};

// ---------- The organiser's profile (O27, O42–O45) ----------

// Agastra Events, as Figma draws them.
export function sampleProfile(now: Date): OrganiserProfile {
  return {
    name: "Agastra Events",
    eventTypes: "Concerts and festivals",
    basedIn: "Colombo",
    about: "Concerts and music festivals in Colombo. We run Colombo Music Fest and Jazz on the Green.",
    phone: "+94 71 234 5678",
    email: "agastra@example.com",
    website: "instagram.com/agastraevents",
    shortLink: "agastra",
    shortLinkChangedAt: null,
    showContact: true,
    showTrackRecord: true,
    showFollowers: true,
    verified: true,
    verifiedAt: dayAt(now, -48, "10:00"),
    nameCheckPending: false,
    badge: "Top Rated",
    rating: 4.6,
    reviews: 214,
    rank: 4,
    followers: 1200,
    followersThisWeek: 86,
    eventsRun: 38,
    trackRecord: { wentAhead: 36, postponed: 2, cancelled: 0, paidOnTimePercent: 96 },
    history: [
      { id: "past-1", title: "Indie Night Vol. 3", venue: "Barefoot Garden", date: dayAt(now, -61, "19:00").slice(0, 10), going: 320, rating: 4.5 },
      { id: "past-2", title: "Colombo Music Fest 2025", venue: "Viharamahadevi Park", date: "2025-12-13", going: 2140, rating: 4.6 },
      { id: "past-3", title: "Jazz on the Green 2025", venue: "Race Course Grounds", date: "2025-12-14", going: 710, rating: 4.8 },
    ],
  };
}

// The organiser's followers (O43), newest first.
export const sampleFollowers: Follower[] = [
  { id: "f-1", name: "Sanduni Fernando", role: "Consumer", detail: "going to Colombo Music Fest", providerId: null },
  { id: "f-2", name: "Ravindu Jayasuriya", role: "Consumer", detail: "followed Mon", providerId: null },
  { id: "f-3", name: "Spice Route Catering", role: "Vendor", detail: "stall B-14 at your fest", providerId: null },
  { id: "f-4", name: "Nethmi Silva", role: "Consumer", detail: "followed Sun", providerId: null },
  { id: "f-5", name: "Tharindu Jayawardena", role: "Freelancer", detail: "Photographer", providerId: "prv-1" },
];

// ---------- Verification (O28, O38–O41) ----------

// Approved, as the profile's Verified badge (O27, O40) shows.
export function sampleVerification(now: Date): Verification {
  return {
    status: "approved",
    documents: [
      { id: "doc-1", name: "Document-1.pdf", kind: "Business registration", state: "ok" },
      { id: "doc-2", name: "Document-2.jpg", kind: "NIC, front and back", state: "ok" },
    ],
    submittedAt: dayAt(now, -50, "10:20"),
    decidedAt: dayAt(now, -48, "10:00"),
    reason: "",
  };
}

// ---------- Reviews and leaderboards (O29–O31, O46–O49) ----------

// How many reviews of each kind the organiser has; the samples below are the latest few.
export const sampleReviewTotals = { provider: 38, consumer: 176 };

// The latest reviews of the organiser, from providers (O29) and consumers (O49).
export function sampleReceivedReviews(now: Date): ReceivedReview[] {
  const r = (id: string, from: "provider" | "consumer", by: string, byRole: string, event: string, days: number, overall: number, scores: [string, number][], text: string): ReceivedReview => ({
    id, from, by, byRole, event, at: dayAt(now, days, "12:00"), overall, scores: scores.map(([label, value]) => ({ label, value })), text, reply: null, reported: null,
  });
  return [
    r("rr-1", "provider", "Pulse Sound & Light", "Vendor", "Rooftop Sessions Vol. 1", -26, 5, [["Payment", 5], ["Communication", 5], ["Planning", 4.5]], "Paid on time and the run-of-show was clear."),
    r("rr-2", "provider", "Tharindu Jayawardena", "Freelancer", "Indie Night Vol. 3", -60, 4.5, [["Payment", 5], ["Communication", 4], ["Planning", 4.5]], "Good brief. The stage times moved on the night without warning."),
    r("rr-3", "provider", "Spice Route Catering", "Vendor", "Colombo Music Fest 2025", -340, 4, [["Payment", 4], ["Communication", 4], ["Planning", 4.5]], "Busy, well-run fest. Power for the stalls arrived late."),
    r("rr-4", "consumer", "Sanduni Fernando", "", "Colombo Music Fest 2025", -338, 5, [["Organisation", 5], ["Value", 4.5]], "Great line-up and the map made finding food easy."),
    r("rr-5", "consumer", "Ravindu Jayasuriya", "", "Rooftop Sessions Vol. 1", -4, 4, [["Organisation", 4], ["Value", 3.5]], "Loved the music. Drinks queue was long after 9."),
    r("rr-6", "consumer", "Nethmi Silva", "", "Jazz on the Green 2025", -337, 4.5, [["Organisation", 5], ["Value", 4.5]], "Calm, well-run evening. More seating next time please."),
  ];
}

// The averages over all of the organiser's reviews, by part (O29, O49).
export const sampleReviewAverages = {
  provider: [["Payment", 4.7], ["Communication", 4.5], ["Planning", 4.6]] as [string, number][],
  consumer: [["Organisation", 4.7], ["Value for money", 4.4], ["Overall experience", 4.6], ["Facilities", 4.2]] as [string, number][],
};

// Who the organiser can still review from Rooftop Sessions Vol. 1 (O29's "Waiting for your
// review", O57). The ids match O57's rows.
export function sampleReviewTasks(now: Date): ReviewTask[] {
  const ended = dayAt(now, -5, "22:30");
  const closes = dayAt(now, 9, "22:30");
  return [
    { id: "bk-1", name: "Pulse Sound & Light", kind: "Sound and lighting", eventTitle: "Rooftop Sessions Vol. 1", completedOn: ended, closesOn: closes },
    { id: "st-1", name: "Batik Lane", kind: "Stall vendor", eventTitle: "Rooftop Sessions Vol. 1", completedOn: ended, closesOn: closes },
  ];
}

// "Top organisers" (O31). Agastra Events is the signed-in organiser.
export const sampleOrganiserRanks: OrganiserRank[] = [
  { rank: 1, name: "Hill Events", rating: 4.8, reviews: 412, tier: "Top Rated", districts: ["Kandy"], you: false },
  { rank: 2, name: "Punchline LK", rating: 4.7, reviews: 268, tier: "Top Rated", districts: ["Colombo"], you: false },
  { rank: 3, name: "TechLK", rating: 4.7, reviews: 190, tier: "Top Rated", districts: ["Colombo", "Gampaha"], you: false },
  { rank: 4, name: "Agastra Events", rating: 4.6, reviews: 214, tier: "Top Rated", districts: ["Colombo"], you: true },
  { rank: 5, name: "SoundWave LK", rating: 4.5, reviews: 96, tier: "Rising", districts: ["Galle"], you: false },
  { rank: 6, name: "Lotus Live", rating: 4.4, reviews: 58, tier: "Rising", districts: ["Colombo"], you: false },
];

// ---------- Messages and community (O23–O25, O90–O93) ----------

// The organiser's conversations (O23), Figma's four.
export function sampleConversations(now: Date): Conversation[] {
  const at = (days: number, time: string) => dayAt(now, days, time);
  const m = (id: string, mine: boolean, when: string, text: string, extra: Partial<{ file: { name: string; label: string }; image: boolean }> = {}) => ({
    id, mine, at: when, text, file: extra.file ?? null, image: extra.image ?? false,
  });
  return [
    {
      id: "c-1", name: "Tharindu Jayawardena", kind: "Freelancer", detail: "Photographer · Verified", providerId: "prv-1", unread: 0, blocked: false, reported: null,
      messages: [
        m("m-1", false, at(-4, "10:00"), "Hi! Here's my quote for the 12th."),
        m("m-2", false, at(-4, "10:01"), "", { file: { name: "Quote.pdf", label: "Quote · PDF" } }),
        m("m-3", true, at(-4, "11:30"), "Thanks. Here's the brief and run-of-show."),
        m("m-4", true, at(-4, "11:31"), "", { file: { name: "Brief.pdf", label: "Brief · PDF" } }),
        m("m-5", false, at(-4, "12:10"), "From last year's fest", { image: true }),
        m("m-6", false, at(0, "17:02"), "Booked! See you at Gate 1 at 5."),
      ],
    },
    {
      id: "c-2", name: "Spice Route Catering", kind: "Vendor", detail: "Stall B-14 · Verified", providerId: null, unread: 0, blocked: false, reported: null,
      messages: [m("m-7", false, at(-1, "15:00"), "Our menu for stall B-14 is up")],
    },
    {
      id: "c-3", name: "Sanduni Fernando", kind: "Consumer", detail: "Going to Colombo Music Fest", providerId: null, unread: 0, blocked: false, reported: null,
      messages: [m("m-8", false, at(0, "09:00"), "Is the show still on tonight?")],
    },
    {
      id: "c-4", name: "Dilshan Perera", kind: "Freelancer", detail: "DJ · Verified", providerId: "prv-6", unread: 2, blocked: false, reported: null,
      messages: [m("m-9", false, at(-1, "09:40"), "Sent you my own quote."), m("m-10", false, at(-1, "09:41"), "Can we start at 5:45?")],
    },
    {
      id: "c-5", name: "Quick Promo LK", kind: "Vendor", detail: "Flyers and banners", providerId: null, unread: 0, blocked: true, blockedAt: at(-36, "10:00"), reported: "Spam or scam",
      messages: [m("m-11", false, at(-37, "10:00"), "Cheap flyers!!! Pay us first and we print tomorrow.")],
    },
  ];
}

// Communities about topics and cities (O24).
export const sampleCommunities2: Community[] = [
  { id: "com-music", name: "Colombo Music Scene", about: "Live music in Colombo: gigs, line-ups and venues.", members: 4200, newPosts: 12, joined: true },
  { id: "com-organisers", name: "Event Organisers LK", about: "Organisers swapping notes on venues, permits and suppliers.", members: 640, newPosts: 3, joined: true },
  { id: "com-food", name: "Food Festivals LK", about: "Food fairs and night markets around the island.", members: 2800, newPosts: 4, joined: true },
  { id: "com-live", name: "Live Music Sri Lanka", about: "Bands, DJs and shows across Sri Lanka.", members: 6100, newPosts: 9, joined: false },
  { id: "com-galle", name: "Galle Events", about: "What's on in Galle and the south coast.", members: 1100, newPosts: 2, joined: false },
];

// Threads on the event boards (O16, O24) and in communities (O25).
export function sampleThreads(now: Date): CommunityThread[] {
  const at = (days: number, time: string) => dayAt(now, days, time);
  const fest = "evt-colombo-music-fest";
  const t = (id: string, where: { eventId?: string; communityId?: string }, title: string, author: string, authorRole: string, verified: boolean, when: string, upvotes: number, replyCount: number, pinned = false) => ({
    id, eventId: where.eventId ?? null, communityId: where.communityId ?? null, title, body: "", author, authorRole, verified, at: when, upvotes, replies: [], replyCount, pinned, linkedEventId: null, reported: false,
  });
  return [
    t("th-1", { eventId: fest }, "Set times are up: see the Line-up tab", "Agastra Events", "Organiser", true, at(-2, "10:00"), 64, 12, true),
    { ...t("th-2", { eventId: fest }, "Who's going? Meet at Gate 2 at 5:30", "Sanduni", "Consumer", false, at(-1, "21:00"), 52, 34), body: "A few of us are meeting at Gate 2. Come say hi!" },
    t("th-3", { eventId: fest }, "Carpool from Nugegoda, 2 seats left", "Ravindu", "Consumer", false, at(0, "08:00"), 17, 8),
    t("th-4", { eventId: fest }, "Which stalls are worth it?", "Spice Route Catering", "Vendor", false, at(-3, "13:00"), 30, 21),
    t("th-5", { eventId: "evt-jazz-on-the-green" }, "Bring a mat or rent one?", "Nethmi", "Consumer", false, at(-1, "18:00"), 9, 3),
    {
      ...t("th-6", { communityId: "com-music" }, "Best open-air gigs this December?", "Nethmi Silva", "Consumer", false, at(-3, "10:00"), 48, 18),
      body: "Looking for outdoor shows in Colombo with good food stalls. What is everyone going to?",
      linkedEventId: fest,
      replies: [
        { id: "rp-1", author: "Agastra Events", authorRole: "Organiser", verified: true, at: at(-3, "11:00"), text: "Come to ours! The line-up and the stall list are on the event page.", upvotes: 12 },
        { id: "rp-2", author: "Brew Bros", authorRole: "Vendor", verified: false, at: at(-3, "12:00"), text: "We'll be at stall C-02 with cold brew.", upvotes: 5 },
        { id: "rp-3", author: "Ravindu Jayasuriya", authorRole: "Consumer", verified: false, at: at(-2, "09:00"), text: "Jazz on the Green looks good too.", upvotes: 3 },
      ],
    },
    t("th-7", { communityId: "com-organisers" }, "Who do you use for barricades?", "Hill Events", "Organiser", true, at(-2, "09:00"), 14, 6),
    t("th-8", { communityId: "com-food" }, "Night market permits in Colombo", "Lotus Live", "Organiser", false, at(-1, "16:00"), 8, 4),
  ];
}

// ---------- Account settings (O32) ----------

export function sampleAccountSettings(now: Date): AccountSettings {
  return {
    email: "agastra@example.com",
    passwordChangedAt: dayAt(now, -48, "10:00"),
    pendingContact: null,
    notify: { bookings: true, messages: true, stalls: true, questions: true, likes: false },
    language: "en",
    theme: "light",
  };
}
