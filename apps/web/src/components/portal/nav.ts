import type { PortalRole } from "@/lib/portal-roles";
import { routes } from "@/lib/routes";

// What the portal's sidebar and top bar link to, for each role. Both follow the two wireframes in
// the ATP repo, which share the team's consumer-flow layout:
// - the vendor portal (brand/tezera-vendor-portal, Reshan, 22 Oct);
// - the organiser flow (wireframes/tezera-organiser-wireframe.html, PR #10, 28 Oct).
// Where they disagree, docs/learning/web-portal-shell.md (Decision 7) says which one we followed and why.
// An item without `href` is a page another ticket hasn't built yet: it is shown, but not as a link.
// Labels live here so EN-07-T4 can move them into translation files.

export type NavItem = { label: string; href?: string };
export type NavGroup = { title: string; items: NavItem[] };

export const NAV_TEXT = {
  label: "Portal",
  menu: "Menu",
  soon: "coming soon",
  skip: "Skip to content",
} as const;

// Pages every role shares. Listed once so the sidebar and the top bar agree on where each one is.
const SHARED = {
  home: { label: "Home", href: routes.dashboard },
  feed: { label: "Feed and events" },
  messages: { label: "Messages" },
  community: { label: "Community" },
  notifications: { label: "Notifications" },
  leaderboards: { label: "Leaderboards" },
  reviews: { label: "Reviews" },
  profile: { label: "Profile" },
  settings: { label: "Settings" },
  search: { label: "Search" },
} satisfies Record<string, NavItem>;

// Notifications isn't in the sidebar: both wireframes put the bell in the top bar.
function general(role: PortalRole | null): NavGroup {
  return {
    title: "General",
    items: [
      SHARED.home,
      SHARED.feed,
      SHARED.messages,
      SHARED.community,
      SHARED.leaderboards,
      // everyone else writes or gets reviews; admins only moderate them, from their own tools
      ...(role === "admin" ? [] : [SHARED.reviews]),
      SHARED.profile,
      SHARED.settings,
    ],
  };
}

// vendors and freelancers share one tools area at /vendor; freelancers don't take stalls (PRD section 3)
function vendorTools(withStalls: boolean): NavItem[] {
  return [
    { label: "Booking requests" },
    { label: "Job posts" },
    ...(withStalls ? [{ label: "Stalls" }] : []),
    { label: "My bookings" },
    ...(withStalls ? [{ label: "My stall listing" }] : []),
    { label: "Payments" },
    { label: "Verification" },
  ];
}

const TOOLS: Record<PortalRole, NavGroup | null> = {
  // An organiser works one event at a time: the map, stalls, hiring, Q&A and board are tabs inside
  // each event, and verification opens from Profile (organiser wireframe). Payments isn't drawn there
  // yet, so it stays from the organiser mind map.
  organiser: {
    title: "Organiser tools",
    items: [{ label: "My events" }, { label: "Hiring" }, { label: "Feed and promotion" }, { label: "Payments" }],
  },
  vendor: { title: "Vendor tools", items: vendorTools(true) },
  freelancer: { title: "Freelancer tools", items: vendorTools(false) },
  // everything attendees do is a shared page; an attendee-only page would get its own gated folder
  attendee: null,
  // no wireframe yet
  admin: {
    title: "Admin tools",
    items: [{ label: "Verification requests" }, { label: "Reports" }, { label: "Moderation" }, { label: "Users" }],
  },
};

export function navFor(role: PortalRole | null): NavGroup[] {
  const tools = role ? TOOLS[role] : null;
  return tools ? [general(role), tools] : [general(role)];
}

// ---------- Top bar ----------

export const TOP_BAR_TEXT = {
  home: "Tezera home",
  profile: "Your profile",
} as const;

export const TOP_BAR: Record<"search" | "messages" | "notifications" | "profile", NavItem> = {
  search: SHARED.search,
  messages: SHARED.messages,
  notifications: SHARED.notifications,
  profile: SHARED.profile,
};

// The search box's hint: what each role looks for (organiser and vendor wireframes; the rest proposed).
export function searchHint(role: PortalRole | null): string {
  switch (role) {
    case "organiser":
      return "Search providers and events…";
    case "vendor":
    case "freelancer":
      return "Search events, organisers, job posts…";
    case "admin":
      return "Search people and events…";
    default:
      return "Search events and organisers…";
  }
}
