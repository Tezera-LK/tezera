"use client";

import { signOut } from "aws-amplify/auth";
import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import { PersonIcon } from "./icons";
import { ACCOUNT_TEXT } from "./nav";
import styles from "./PortalShell.module.css";

type AccountMenuProps = {
  // the email address or phone number they log in with
  name: string;
  // e.g. "Organiser"; left out for an account without a role
  roleLabel?: string;
  links: { label: string; href: string }[];
  // where Log out sends them
  logOutTo: string;
};

// The avatar at the right of the top bar: who is logged in, their set-up screens and Log out.
// A disclosure (a button that shows and hides a panel), not an ARIA menu: the panel holds plain links
// and a button, so the usual Tab order works. Escape or a click anywhere else closes it.
// Log out needs Amplify configured in the browser: PortalShell renders <ConfigureAmplify />.
export default function AccountMenu({ name, roleLabel, links, logOutTo }: AccountMenuProps) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const panelId = useId();
  const wrapper = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      setOpen(false);
      button.current?.focus();
    }
    function onPointerDown(event: PointerEvent) {
      if (!wrapper.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("pointerdown", onPointerDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("pointerdown", onPointerDown);
    };
  }, [open]);

  async function logOut() {
    setBusy(true);
    setFailed(false);
    try {
      // deletes the login cookies and tells Cognito this session is over
      await signOut();
    } catch {
      // still logged in: say so rather than leave them thinking they're out
      setFailed(true);
      setBusy(false);
      return;
    }
    // a full page load, so nothing from the portal stays in memory; replace() keeps it out of Back
    window.location.replace(logOutTo);
  }

  return (
    <div className={styles.account} ref={wrapper}>
      <button
        ref={button}
        type="button"
        className={`${styles.iconButton} ${styles.avatar}`}
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((isOpen) => !isOpen)}
      >
        <PersonIcon />
        <span className={styles.srOnly}>{ACCOUNT_TEXT.button}</span>
      </button>

      <div id={panelId} className={styles.accountPanel} hidden={!open}>
        <div className={styles.accountWho}>
          <p className={styles.accountName}>{name}</p>
          {roleLabel && <p className={styles.accountRole}>{roleLabel}</p>}
        </div>
        {links.length > 0 && (
          <ul className={styles.accountLinks}>
            {links.map((link) => (
              <li key={link.href}>
                <Link href={link.href} onClick={() => setOpen(false)}>
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        )}
        <button type="button" className={styles.button} onClick={logOut} disabled={busy}>
          {busy ? ACCOUNT_TEXT.loggingOut : ACCOUNT_TEXT.logOut}
        </button>
        {failed && (
          <p className={styles.accountError} role="alert">
            {ACCOUNT_TEXT.logOutFailed}
          </p>
        )}
      </div>
    </div>
  );
}
