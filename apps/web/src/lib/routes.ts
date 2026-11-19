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
  vendorTools: "/vendor",
  adminTools: "/admin",

  // public: anyone, even without logging in
  event: (eventId: string) => `/events/${segment(eventId)}`,
  organiser: (organiserId: string) => `/organisers/${segment(organiserId)}`,
  vendor: (vendorId: string) => `/vendors/${segment(vendorId)}`,
} as const;
