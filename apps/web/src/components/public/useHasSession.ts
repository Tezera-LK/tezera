import { useSyncExternalStore } from "react";

// Amplify keeps the login in cookies named CognitoIdentityServiceProvider.<app>.<user>.accessToken and so on
// (ConfigureAmplify, ssr: true), and deletes them on Log out. Their presence only HINTS that someone is
// logged in: a session that has run out still has them, and the portal's proxy then sends them to log in.
// So use this to choose a button's words, never to decide what someone may see.
// It reads the cookie in the browser only, so the cached public pages stay the same for everyone.
const LOGIN_COOKIE = /(?:^|;\s*)CognitoIdentityServiceProvider\.[^=;]+\.accessToken=/;

// cookies have no change event; reading them on each render is enough for a label
const subscribe = () => () => {};

export function useHasSession(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => LOGIN_COOKIE.test(document.cookie),
    // on the server, and while the page first hydrates: assume a visitor
    () => false,
  );
}
