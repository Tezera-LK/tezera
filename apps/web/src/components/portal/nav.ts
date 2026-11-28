import type { PortalRole } from "@/lib/portal-roles";
import { routes } from "@/lib/routes";

// What the portal's sidebar and top bar link to, for each role. Since 19 Nov both follow the team's
// Figma high-fid files (organiser, vendor, freelancer), which replaced the two HTML wireframes that
// Decision 7 in docs/learning/web-portal-shell.md compared. Consumers and admins have no Figma file
// yet, so they get the organiser's General list.
// An item without `href` is a page another ticket hasn't built yet: it is shown, but not as a link.
// Labels live here so EN-07-T4 can move them into translation files.

// One sidebar pill or top-bar button: the text people see, and where it goes once that page exists.
export type NavItem = { label: string; href?: string };
// One heading in the sidebar card ("General", "Organiser tools") with the pills under it.
export type NavGroup = { title: string; items: NavItem[] };

// Text the shell shows that isn't a page name: the nav's name for screen readers, the phone menu
// button, the "coming soon" note on unbuilt pages and the skip link.
export const NAV_TEXT = {
  label: "Portal",
  menu: "Menu",
  soon: "coming soon",
  skip: "Skip to content",
} as const;

// Pages every role shares. Listed once so the sidebar and the top bar agree on where each one is.
const SHARED = {
  home: { label: "Home", href: routes.dashboard },
  messages: { label: "Messages" },
  community: { label: "Community" },
  notifications: { label: "Notifications", href: routes.notifications },
  leaderboards: { label: "Leaderboards" },
  reviews: { label: "Reviews" },
  reviewsAndRank: { label: "Reviews and rank" },
  profile: { label: "Profile" },
  settings: { label: "Settings" },
  search: { label: "Search", href: routes.search },
} satisfies Record<string, NavItem>;

// Figma lists Notifications in the sidebar as well as the bell in the top bar.
// Vendors and freelancers have one "Reviews and rank" page; organisers have Leaderboards and Reviews.
function general(role: PortalRole | null): NavGroup {
  const providers = role === "vendor" || role === "freelancer";
  // pages built for the organiser and for providers so far; other roles get theirs in their own slices
  const organiser = role === "organiser";
  // each built role's own page for a General item, or no link yet
  const own = (item: NavItem, forOrganiser: string, forProviders: string): NavItem =>
    organiser ? { ...item, href: forOrganiser } : providers ? { ...item, href: forProviders } : item;
  return {
    title: "General",
    items: [
      SHARED.home,
      own(SHARED.messages, routes.messages, routes.vendorArea.messages),
      own(SHARED.community, routes.community, routes.vendorArea.community),
      SHARED.notifications,
      ...(providers
        ? [{ ...SHARED.reviewsAndRank, href: routes.vendorArea.reviews }]
        : [
            organiser ? { ...SHARED.leaderboards, href: routes.leaderboards } : SHARED.leaderboards,
            // everyone else writes or gets reviews; admins only moderate them, from their own tools
            ...(role === "admin" ? [] : [organiser ? { ...SHARED.reviews, href: routes.reviews } : SHARED.reviews]),
          ]),
      own(SHARED.profile, routes.myProfile, routes.vendorArea.profile),
      own(SHARED.settings, routes.settings, routes.vendorArea.settings),
    ],
  };
}

// vendors and freelancers share one tools area at /vendor; freelancers don't take stalls (PRD section 3)
// order and names from the Figma vendor and freelancer files
function vendorTools(withStalls: boolean): NavItem[] {
  return [
    { label: "Booking requests", href: routes.vendorArea.requests },
    { label: "Job posts", href: routes.vendorArea.jobs },
    { label: "My bookings", href: routes.vendorArea.bookings },
    ...(withStalls
      ? [
          { label: "Stalls", href: routes.vendorArea.stalls },
          { label: "My stall listing", href: routes.vendorArea.listing },
        ]
      : []),
    { label: "Availability", href: routes.vendorArea.availability },
    { label: "Payments", href: routes.vendorArea.payments },
    { label: "Verification", href: routes.vendorArea.verification },
  ];
}

// Each role's second sidebar group. null means the role has no tools of its own.
const TOOLS: Record<PortalRole, NavGroup | null> = {
  // An organiser works one event at a time: the map, stalls, hiring, Q&A and board are tabs inside
  // each event. Items as in the Figma organiser file (O05).
  organiser: {
    title: "Organiser tools",
    items: [
      { label: "My events", href: routes.myEvents },
      { label: "Hiring", href: routes.hiring },
      { label: "Feed and promotion", href: routes.feed },
      { label: "Analytics", href: routes.analytics },
      { label: "Payments", href: routes.payments },
      { label: "Verification", href: routes.verification },
    ],
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

// The sidebar for one role: General first, then that role's tools if it has any.
// role is null for an account that finished sign-up without a group; it gets General only.
export function navFor(role: PortalRole | null): NavGroup[] {
  const tools = role ? TOOLS[role] : null;
  return tools ? [general(role), tools] : [general(role)];
}

// ---------- Top bar ----------

// Screen-reader names for the two top-bar links that have no visible text: the logo and the avatar.
export const TOP_BAR_TEXT = {
  home: "Tezera home",
  profile: "Your profile",
} as const;

// The top bar's four controls. They reuse the sidebar's entries, so when a page gets an href
// both places start linking to it.
export const TOP_BAR: Record<"search" | "messages" | "notifications" | "profile", NavItem> = {
  search: SHARED.search,
  messages: SHARED.messages,
  notifications: SHARED.notifications,
  profile: SHARED.profile,
};

// The bell's dropdown (O81).
export const NOTIFICATIONS_TEXT = {
  title: "Notifications",
  markAllRead: "Mark all read",
  seeAll: "See all notifications",
  empty: "Nothing new. Bookings, quotes, stalls and messages will show up here.",
  unread: "unread",
} as const;

// The avatar's menu (O82, V105), in Figma's order. Log out asks first (O98, V104).
// The organiser's and providers' go to their pages; other roles get theirs in their own slices.
export function profileMenu(role: PortalRole | null): NavItem[] {
  if (role === "vendor" || role === "freelancer") {
    const p = routes.vendorArea;
    return [
      { label: "My profile", href: p.profile },
      { label: "Edit profile", href: p.editProfile },
      { label: "Payments", href: p.payments },
      { label: "Settings", href: p.settings },
      { label: "Log out", href: `${p.settings}?dialog=logout` },
    ];
  }
  const organiser = role === "organiser";
  return [
    { label: "My profile", href: organiser ? routes.myProfile : undefined },
    { label: "Edit profile", href: organiser ? routes.editProfile : undefined },
    { label: "Payments", href: organiser ? routes.payments : undefined },
    { label: "Settings", href: organiser ? routes.settings : undefined },
    // asks first (O98)
    { label: "Log out", href: organiser ? `${routes.settings}?dialog=logout` : undefined },
  ];
}

// The search box's hint: what each role looks for. Organiser, vendor and freelancer wording is from
// the Figma files; consumer and admin wording is ours until they have designs.
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
