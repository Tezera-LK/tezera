// Every URL in the web portal, in one place.
// Links, redirects and the sidebar all build their URLs from here, so renaming a URL word means
// changing this file and the matching folder under app/.
// Once real people share public links, keep the old address working with a permanent redirect.
import type { Role } from "@/lib/roles";

const segment = (id: string) => encodeURIComponent(id);

export const routes = {
  home: "/",

  // the auth screens (EN-04, app/(auth)): one set per sign-up role, e.g. /vendor/login.
  // /login and /signup are the default ones; they send you to the attendee screens.
  logIn: "/login",
  signUp: "/signup",
  logInAs: (role: Role) => `/${role}/login`,
  setUp: (role: Role) => `/${role}/setup`,
  verification: (role: Role) => `/${role}/verification`,

  // signed in, any role
  dashboard: "/dashboard",

  // signed in, one role each. Each role's tools share its sign-up address: /vendor/login, /vendor.
  organiserTools: "/organiser",
  vendorTools: "/vendor",
  freelancerTools: "/freelancer",
  adminTools: "/admin",

  // public teasers: anyone, even without logging in
  event: (eventId: string) => `/events/${segment(eventId)}`,
  organiser: (organiserId: string) => `/organisers/${segment(organiserId)}`,
  vendor: (vendorId: string) => `/vendors/${segment(vendorId)}`,
  freelancer: (freelancerId: string) => `/freelancers/${segment(freelancerId)}`,
} as const;
