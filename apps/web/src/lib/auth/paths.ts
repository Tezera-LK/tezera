// Which addresses anyone may open without signing in, and where to send everyone else.
// Used by src/proxy.ts. Deny by default: a new page is private unless it's listed here, so a page
// someone forgets to list stays protected instead of open (docs/learning/web-portal-shell.md, Decision 1c).
// Adding a public page (an "About" page, say)? Add its address here.
import { ROLES, isRole } from "@/lib/roles";
import { routes } from "@/lib/routes";

const PUBLIC_PATHS: readonly RegExp[] = [
  // the landing page
  /^\/$/,
  // linked from the landing page's footer (the pages don't exist yet)
  /^\/(?:privacy|terms)\/?$/,
  // the old addresses of the auth screens; they redirect to the attendee ones
  /^\/(?:login|signup|verify)\/?$/,
  // the auth screens themselves, e.g. /vendor/login (setup and verification need you signed in)
  new RegExp(`^/(?:${ROLES.join("|")})/(?:login|signup|verify|reset-password)/?$`),
  // redirects to /attendee/login. /organiser, /vendor and /freelancer are those roles' tools.
  /^\/attendee\/?$/,
  // the public teasers, and anything below them (such as a link-preview image)
  /^\/(?:events|organisers|vendors|freelancers)\//,
  // app-wide link-preview images and icons, if the app ever generates them
  /^\/(?:opengraph-image|twitter-image|icon|apple-icon)(?:\/[\w-]+)?$/,
];

export function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some((path) => path.test(pathname));
}

// Signed out on a private page: the log-in screen for the role in the address (/vendor/… → /vendor/login,
// just as the auth screens' own /vendor address used to do), otherwise the default one.
export function logInPathFor(pathname: string): string {
  const [, first = ""] = pathname.split("/");
  return isRole(first) ? routes.logInAs(first) : routes.logIn;
}
