// ─────────────────────────────────────────────────────────────
// TEMPORARY: pretend values used until our API exists
// File: src/lib/temporary.ts
//
// Everything here exists only so the screens can be tried out before
// that part of the backend exists. Log in, sign up, verify and reset
// password now use Cognito (the pretend code 123456 is gone). What's
// left is for the setup screens, until our API can suggest organisers.
// ─────────────────────────────────────────────────────────────

// Pretend "organisers you might like" for the attendee setup screen.
// Later: comes from our API, ranked by the attendee's interests.
export const SAMPLE_ORGANISERS = [
  { id: "agastra", name: "Agastra Events", detail: "Concerts · Colombo · ★ 4.6" },
  { id: "hill", name: "Hill Events", detail: "Food festivals · Kandy · ★ 4.3" },
  { id: "punchline", name: "Punchline LK", detail: "Comedy · Colombo · ★ 4.4" },
];
