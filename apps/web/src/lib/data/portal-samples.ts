// Made-up portal records for `next dev`, copied from the Figma organiser screens, so the dashboard,
// notifications and search have something to show before the backend exists.
// Never used in production builds (see lib/data/portal.ts).
//
// Times are built from "now" on every request, so "Tonight", "Today" and "Mon" stay true whenever
// someone runs the app. Names are the Figma file's; "(sample)" isn't added because these screens
// never leave `next dev`.
import { colomboDay } from "@/lib/format";
import type { PortalRole } from "@/lib/portal-roles";
import type {
  Account,
  BoardThread,
  BookingToClose,
  ManagedEvent,
  Question,
  StallToReview,
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

export const sampleProviders: ProviderResult[] = [
  { id: "prv-1", name: "Tharindu Jayawardena", kind: "freelancer", category: "Photographer", rating: 4.8, priceFrom: 30000, badge: "Top Rated" },
  { id: "prv-2", name: "Frame & Focus Studio", kind: "vendor", category: "Photography and video", rating: 4.7, priceFrom: 45000, badge: "Top Rated" },
  { id: "prv-3", name: "Malsha Gunasekara", kind: "freelancer", category: "Photographer", rating: 4.6, priceFrom: 25000, badge: "Rising" },
  { id: "prv-4", name: "Kasun Wickramasinghe", kind: "freelancer", category: "Photographer", rating: 4.4, priceFrom: 20000, badge: null },
  { id: "prv-5", name: "Lens & Light Collective", kind: "vendor", category: "Photography and video", rating: 4.3, priceFrom: 60000, badge: null },
  { id: "prv-6", name: "Dilshan Perera", kind: "freelancer", category: "DJ", rating: 4.5, priceFrom: 45000, badge: "Rising" },
  { id: "prv-7", name: "Lumen Stage Co.", kind: "vendor", category: "Sound and lighting", rating: 4.2, priceFrom: 80000, badge: null },
];

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
