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
  CommunityResult,
  EventResult,
  OrganiserDashboard,
  PortalNotification,
  ProviderResult,
} from "@/lib/data/portal-types";

// An ISO time `days` calendar days from today in Sri Lanka, at hh:mm Sri Lanka time.
function dayAt(now: Date, days: number, hhmm: string): string {
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

// ---------- Organiser dashboard (O05) ----------

export function sampleOrganiserDashboard(now: Date): OrganiserDashboard {
  const fest = {
    id: "evt-colombo-music-fest",
    title: "Colombo Music Fest",
    startsAt: dayAt(now, 0, "18:00"),
    endsAt: dayAt(now, 0, "23:30"),
    venueName: "Viharamahadevi Park",
    status: "published" as const,
    going: 1284,
    interested: 3402,
    bookings: { confirmed: 3, requested: 6 },
    stalls: { approved: 16, offered: 20 },
    liveStatus: { kind: "late" as const, newStartAt: dayAt(now, 0, "18:45") },
  };

  return {
    organiserName: "Agastra Events",
    featured: fest,
    events: [
      fest,
      {
        id: "evt-jazz-on-the-green",
        title: "Jazz on the Green",
        startsAt: dayAt(now, 1, "17:00"),
        status: "published",
        going: 642,
        interested: 1880,
        bookings: { confirmed: 2, requested: 3 },
        stalls: { approved: 6, offered: 8 },
      },
      {
        id: "evt-indie-night-4",
        title: "Indie Night Vol. 4",
        startsAt: dayAt(now, 27, "19:00"),
        status: "postponed",
        going: 210,
        interested: 955,
        bookings: { confirmed: 1, requested: 2 },
        stalls: null,
      },
      {
        id: "evt-rooftop-sessions-2",
        title: "Rooftop Sessions Vol. 2",
        startsAt: dayAt(now, 40, "19:00"),
        status: "draft",
        going: 0,
        interested: 0,
        bookings: null,
        stalls: null,
      },
    ],
    attention: [
      { id: "att-qa", title: "3 questions to answer", detail: "Colombo Music Fest · Q&A" },
      { id: "att-stalls", title: "4 stall applications", detail: "Colombo Music Fest · Stalls" },
      { id: "att-quotes", title: "4 new quotes", detail: "2 photographers, 12 Dec" },
      { id: "att-dilshan", title: "Dilshan Perera sent a quote", detail: "DJ set · LKR 45,000" },
    ],
    rank: { position: 4, among: "organisers", rating: 4.6, reviews: 214, badge: "Top Rated" },
  };
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
