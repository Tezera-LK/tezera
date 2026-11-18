import { NextResponse, type NextRequest } from "next/server";
import { runWithAmplifyServerContext } from "@/lib/amplify/server";
import { VIEW_AS, readSession } from "@/lib/auth/cognito";
import { isPublicPath, logInPathFor } from "@/lib/auth/paths";

// Gate 1 of 3 (docs/learning/web-portal-shell.md, Decision 1c): is anyone signed in?
// Runs before every page except the public ones (lib/auth/paths.ts). Signed out → a log-in screen.
// It also refreshes expired tokens and saves them as cookies: Server Components can't write cookies,
// and Next.js passes cookies set here on to the page it renders for the same request.
// Gate 2 (the right role?) is requireRole() in lib/auth/session.ts; gate 3 is the backend's own rules.
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  // VIEW_AS: `next dev` without a user pool, where the "View as" box stands in for signing in
  if (VIEW_AS || isPublicPath(pathname)) return NextResponse.next();

  const response = NextResponse.next();
  const session = await runWithAmplifyServerContext({
    nextServerContext: { request, response },
    operation: readSession,
  });
  if (session) return response;

  const logIn = NextResponse.redirect(new URL(logInPathFor(pathname), request.url));
  // keep any cookie changes Amplify made, such as clearing tokens it could no longer refresh
  for (const cookie of response.cookies.getAll()) logIn.cookies.set(cookie);
  return logIn;
}

export const config = {
  // Every path except API calls (forwarded to the NestJS API by next.config.ts), Next.js's own files
  // and static files such as the images in public/.
  matcher: [
    "/((?!api/|api$|_next/|__nextjs|\\.well-known/|favicon\\.ico$|.*\\.(?:svg|png|jpg|jpeg|gif|webp|avif|ico|woff|woff2|ttf|otf|txt|xml|webmanifest|mp4|webm|pdf)$).*)",
  ],
};
