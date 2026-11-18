"use client";

import Link from "next/link";
import { routes } from "@/lib/routes";
import styles from "./Public.module.css";
import { SIGN_IN_TEXT, type TeaserKind } from "./text";
import { useHasSession } from "./useHasSession";

// The end of every teaser: how to see the rest. Visitors are asked to log in or create an account.
// Someone already logged in is pointed to their dashboard instead, because the full pages come from
// their own stories (events US-C03-T3, organisers US-P04-T3, vendors and freelancers US-P01-T3).
export default function SignInPrompt({ kind }: { kind: TeaserKind }) {
  const loggedIn = useHasSession();

  return (
    <section className={styles.signIn} aria-labelledby="sign-in-prompt">
      <h2 id="sign-in-prompt" className={styles.sectionTitle}>
        {loggedIn ? SIGN_IN_TEXT.loggedInTitle : SIGN_IN_TEXT.title}
      </h2>
      <p>{loggedIn ? SIGN_IN_TEXT.loggedInBody(kind) : SIGN_IN_TEXT.body(kind)}</p>
      <div className={styles.actions}>
        {loggedIn ? (
          <Link href={routes.dashboard} className={`${styles.button} ${styles.buttonPrimary}`}>
            {SIGN_IN_TEXT.dashboard}
          </Link>
        ) : (
          <>
            <Link href={routes.logIn} className={`${styles.button} ${styles.buttonPrimary}`}>
              {SIGN_IN_TEXT.logIn}
            </Link>
            <Link href={routes.signUp} className={styles.button}>
              {SIGN_IN_TEXT.signUp}
            </Link>
          </>
        )}
      </div>
    </section>
  );
}
