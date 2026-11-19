// Preview mode: the portal runs without real sign-in, on sample data, with the "View as" role switch.
// STAND-IN until EN-03 (data) and EN-04 (sign-in) are hosted; Phase B deletes this file.
//
// - `next dev`: always on.
// - deployed builds: decided when the site is built (next.config.ts): on for the `dev` branch
//   (dev.tezera.lk), never on `main`. Set PORTAL_PREVIEW=0 on the dev branch in Amplify to turn it off.
// Shared by server and client code, so it must not import server-only code.
export const previewMode = process.env.NODE_ENV === "development" || process.env.PORTAL_PREVIEW === "1";
