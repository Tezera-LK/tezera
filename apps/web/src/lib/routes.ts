// Every URL in the web portal, in one place.
// Links, redirects and the sidebar all build their URLs from here, so renaming a URL word
// (for example `vendor` → `provider`) means changing this file and the matching folder under app/.
// Once real people share public links, keep the old address working with a permanent redirect.

const segment = (id: string) => encodeURIComponent(id);

export const routes = {
  home: "/",
  logIn: "/login",

  // signed in, any role
  dashboard: "/dashboard",
  // ?type= picks a tab: bookings, stalls, messages or account
  notifications: "/notifications",
  // the top bar's search box submits here as ?q=; ?tab= picks providers, events or communities
  search: "/search",
  searchFor: (query: string) => `/search?q=${encodeURIComponent(query)}`,

  // signed in, one role each (vendor tools are for vendors and freelancers)
  organiserTools: "/organiser",
  // an organiser's own events (Figma O07–O16, O51–O57); ?tab= on the list picks drafts or past
  myEvents: "/organiser/events",
  newEvent: "/organiser/events/new",
  manageEvent: (eventId: string) => `/organiser/events/${segment(eventId)}`,
  editEvent: (eventId: string) => `/organiser/events/${segment(eventId)}/edit`,
  eventPublished: (eventId: string) => `/organiser/events/${segment(eventId)}/published`,
  previewEvent: (eventId: string) => `/organiser/events/${segment(eventId)}/preview`,
  eventQa: (eventId: string) => `/organiser/events/${segment(eventId)}/qa`,
  eventBoard: (eventId: string) => `/organiser/events/${segment(eventId)}/board`,
  // the overview with a dialog open over it: postpone or cancel (O10, O53), confirm an announcement (O56)
  eventDialog: (eventId: string, dialog: "postpone" | "cancel" | "announce") =>
    `/organiser/events/${segment(eventId)}?dialog=${dialog}`,
  vendorTools: "/vendor",
  adminTools: "/admin",

  // public: anyone, even without logging in
  event: (eventId: string) => `/events/${segment(eventId)}`,
  organiser: (organiserId: string) => `/organisers/${segment(organiserId)}`,
  vendor: (vendorId: string) => `/vendors/${segment(vendorId)}`,
} as const;
