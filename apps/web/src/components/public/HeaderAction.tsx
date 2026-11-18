"use client";

import Link from "next/link";
import { routes } from "@/lib/routes";
import styles from "./Public.module.css";
import { PUBLIC_TEXT } from "./text";
import { useHasSession } from "./useHasSession";

// The button at the right of the public header: "Log in" for visitors, "Your dashboard" for someone who
// is logged in. Decided in the browser, so the cached page stays the same for everyone.
export default function HeaderAction() {
  const loggedIn = useHasSession();

  return (
    <Link href={loggedIn ? routes.dashboard : routes.logIn} className={styles.headerLink}>
      {loggedIn ? PUBLIC_TEXT.dashboard : PUBLIC_TEXT.logIn}
    </Link>
  );
}
