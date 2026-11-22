// Every URL in the web portal, in one place.
// Links, redirects and the sidebar all build their URLs from here, so renaming a URL word means
// changing this file and the matching folder under app/.
// Once real people share public links, keep the old address working with a permanent redirect.
const segment = (id: string) => encodeURIComponent(id);

export const routes = {
  home: "/",

  // the auth screens (EN-04, app/(auth)). /login and /signup are the default ones; they send you
  // to the attendee screens.
  logIn: "/login",
  signUp: "/signup",

  // signed in, any role
  dashboard: "/dashboard",
  // ?type= picks a tab: bookings, stalls, messages or account
  notifications: "/notifications",
  // the top bar's search box submits here as ?q=; ?tab= picks providers, events or communities
  search: "/search",
  searchFor: (query: string) => `/search?q=${encodeURIComponent(query)}`,

  // signed in, one role each. Each role's tools share its sign-up address: /vendor/login, /vendor.
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
  // the Stalls tab (O13); its dialogs (O72–O76) open with ?dialog=
  eventStalls: (eventId: string) => `/organiser/events/${segment(eventId)}/stalls`,
  // the Hiring tab (O14), and hiring across events: find providers (O17), a profile (O18), a
  // booking request (O19, O77, O78) and a job post (O20, O79, O21, O89)
  eventHiring: (eventId: string) => `/organiser/events/${segment(eventId)}/hiring`,
  hiring: "/organiser/hiring",
  provider: (providerId: string) => `/organiser/hiring/providers/${segment(providerId)}`,
  requestBooking: (providerId: string) => `/organiser/hiring/providers/${segment(providerId)}/request`,
  bookingRequest: (requestId: string) => `/organiser/hiring/requests/${segment(requestId)}`,
  requestSent: (requestId: string) => `/organiser/hiring/requests/${segment(requestId)}/sent`,
  newJob: "/organiser/hiring/jobs/new",
  job: (jobId: string) => `/organiser/hiring/jobs/${segment(jobId)}`,
  jobPosted: (jobId: string) => `/organiser/hiring/jobs/${segment(jobId)}/posted`,
  // a booking (O22) and its new-terms page (O83); its dialogs (O84, O87, O88) open with ?dialog=
  booking: (bookingId: string) => `/organiser/bookings/${segment(bookingId)}`,
  bookingTerms: (bookingId: string) => `/organiser/bookings/${segment(bookingId)}/terms`,
  // payments (O60), connecting PayHere (O61), paying one instalment (O62) and its outcome (O63,
  // O65), and a receipt (O64)
  payments: "/organiser/payments",
  connectPayments: "/organiser/payments/connect",
  payInstalment: (bookingId: string, part: number) => `/organiser/payments/pay/${segment(bookingId)}/${part}`,
  paymentFailed: (bookingId: string, part: number) => `/organiser/payments/pay/${segment(bookingId)}/${part}/failed`,
  receipt: (receiptId: string) => `/organiser/payments/receipts/${segment(receiptId)}`,
  paymentDone: (receiptId: string) => `/organiser/payments/receipts/${segment(receiptId)}/done`,
  // the feed (O26; ?type=reel is O99, ?comments=<post> opens O94) and analytics (O50)
  feed: "/organiser/feed",
  analytics: "/organiser/analytics",
  // the organiser's own profile (O27, ?tab=past is O45, ?dialog=share is O44), editing it (O42)
  // and their followers (O43)
  myProfile: "/organiser/profile",
  editProfile: "/organiser/profile/edit",
  followers: "/organiser/profile/followers",
  // verification (O28; O38–O41 are its states, O100–O103 the get-verified steps)
  verification: "/organiser/verification",
  // reviews of the organiser (O29, ?tab=consumers is O49) and the ones they write (O30, O48)
  reviews: "/organiser/reviews",
  writeReview: (taskId: string) => `/organiser/reviews/write/${segment(taskId)}`,
  reviewSubmitted: (taskId: string) => `/organiser/reviews/write/${segment(taskId)}/done`,
  // ranks of organisers and providers (O31)
  leaderboards: "/organiser/leaderboards",
  // conversations (O23; ?c=<conversation>, ?to=<provider> starts one) and community (O24),
  // one community and one thread (O25)
  messages: "/organiser/messages",
  community: "/organiser/community",
  communityPage: (communityId: string) => `/organiser/community/c/${segment(communityId)}`,
  thread: (threadId: string) => `/organiser/community/threads/${segment(threadId)}`,
  // account settings (O32); ?dialog= opens contact (O95), password (O96) or logout (O98)
  settings: "/organiser/settings",
  blockedUsers: "/organiser/settings/blocked",
  // the overview with a dialog open over it: postpone or cancel (O10, O53), confirm an announcement (O56)
  eventDialog: (eventId: string, dialog: "postpone" | "cancel" | "announce") =>
    `/organiser/events/${segment(eventId)}?dialog=${dialog}`,
  vendorTools: "/vendor",
  freelancerTools: "/freelancer",
  adminTools: "/admin",

  // public teasers: anyone, even without logging in
  event: (eventId: string) => `/events/${segment(eventId)}`,
  organiser: (organiserId: string) => `/organisers/${segment(organiserId)}`,
  vendor: (vendorId: string) => `/vendors/${segment(vendorId)}`,
  freelancer: (freelancerId: string) => `/freelancers/${segment(freelancerId)}`,
} as const;
