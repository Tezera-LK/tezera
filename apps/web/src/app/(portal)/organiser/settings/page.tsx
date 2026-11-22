import type { Metadata } from "next";
import Link from "next/link";
import Dialog from "@/components/portal/events/Dialog";
import forms from "@/components/portal/forms.module.css";
import hiring from "@/components/portal/hiring/Hiring.module.css";
import { AutoSaveForm, LogOutButton } from "@/components/portal/settings/SettingsBits";
import styles from "@/components/portal/settings/Settings.module.css";
import tables from "@/components/portal/tables.module.css";
import ui from "@/components/portal/ui.module.css";
import { requireRole } from "@/lib/auth/session";
import { getAccountSettings, getPaymentAccount, listConversations } from "@/lib/data/portal";
import type { AccountSettings } from "@/lib/data/portal-types";
import { formatShortDate } from "@/lib/format";
import { ROLE_LABEL } from "@/lib/portal-roles";
import { routes } from "@/lib/routes";
import { changePassword, confirmContactChange, saveNotifications, savePreferences, startContactChange } from "./actions";

export const metadata: Metadata = { title: "Settings" };

const TEXT = {
  title: "Settings",
  lede: "Account, notifications, language and safety",
  account: "Account",
  loggedInWith: "Logged in with",
  change: "Change ›",
  password: "Password",
  changed: (when: string) => `Changed ${when}`,
  accountType: "Account type",
  accountTypeLine: (role: string) => `${role} · each account has one role`,
  logOut: "Log out",
  notifications: "Notifications",
  notify: [
    ["bookings", "Bookings, quotes and verification", "Always on in the app · also by push and email"],
    ["messages", "New messages", ""],
    ["stalls", "Stall applications", ""],
    ["questions", "Questions on your events", ""],
    ["likes", "Likes and comments on your posts", ""],
  ] as const,
  saveNotifications: "Save notifications",
  language: "Language",
  languages: [
    ["en", "English"],
    ["si", "සිංහල"],
    ["ta", "தமிழ்"],
  ],
  theme: "Theme",
  themes: [
    ["light", "Light"],
    ["dark", "Dark"],
    ["system", "System"],
  ],
  later: "coming later",
  paymentAccount: "Payment account",
  merchant: "PayHere merchant account · sandbox",
  merchantLine: (connected: boolean) => (connected ? "Connected · stall fees settle here" : "Not connected · vendors pay outside the app"),
  manage: "Manage",
  safety: "Safety",
  blocked: "Blocked users",
  blockedLine: (n: number) => `${n} blocked`,
  manageArrow: "Manage ›",
  saved: {
    notifications: "Notifications saved.",
    contact: "Your email or phone is changed.",
    password: "Your password is changed.",
  } as Record<string, string>,
} as const;

type Query = { dialog?: string; step?: string; error?: string; saved?: string };

// Settings (Figma O32): account, notifications, language and theme, payment account and safety.
// ?dialog= opens change email or phone (O95), change password (O96) or log out (O98).
export default async function SettingsPage({ searchParams }: { searchParams: Promise<Query> }) {
  const session = await requireRole("organiser");
  const query = await searchParams;
  const [settings, payment, conversations] = await Promise.all([getAccountSettings(session), getPaymentAccount(session), listConversations(session)]);
  if (!settings) return <p className={ui.muted}>Settings need the backend (EN-03), which isn&apos;t connected yet.</p>;
  const blockedCount = conversations.filter((c) => c.blocked).length;

  return (
    <div className={styles.page}>
      <header className={hiring.pageHeadText}>
        <h1 className={hiring.pageTitle}>{TEXT.title}</h1>
        <p className={hiring.lede}>{TEXT.lede}</p>
      </header>
      {query.saved && TEXT.saved[query.saved] && (
        <p className={styles.notice} role="status">
          {TEXT.saved[query.saved]}
        </p>
      )}

      <section className={tables.section} aria-labelledby="account-title">
        <h2 id="account-title" className={ui.sectionTitle}>
          {TEXT.account}
        </h2>
        <div className={styles.card}>
          <Row title={TEXT.loggedInWith} detail={settings.email} action={<Link href={`${routes.settings}?dialog=contact`} scroll={false} className={styles.rowLink}>{TEXT.change}</Link>} />
          <Row title={TEXT.password} detail={TEXT.changed(formatShortDate(settings.passwordChangedAt))} action={<Link href={`${routes.settings}?dialog=password`} scroll={false} className={styles.rowLink}>{TEXT.change}</Link>} />
          <Row title={TEXT.accountType} detail={TEXT.accountTypeLine(ROLE_LABEL[session.role])} />
          <Link href={`${routes.settings}?dialog=logout`} scroll={false} className={`${styles.row} ${styles.rowAsLink}`}>
            <span className={styles.square} aria-hidden="true" />
            <span className={ui.rowTitle}>{TEXT.logOut}</span>
            <span className={styles.arrow} aria-hidden="true">
              ›
            </span>
          </Link>
        </div>
      </section>

      <section className={tables.section} aria-labelledby="notify-title">
        <h2 id="notify-title" className={ui.sectionTitle}>
          {TEXT.notifications}
        </h2>
        <AutoSaveForm action={saveNotifications} saveLabel={TEXT.saveNotifications}>
          <div className={styles.card}>
            {TEXT.notify.map(([key, title, detail]) => (
              <label key={key} className={styles.row}>
                <span className={styles.square} aria-hidden="true" />
                <span className={ui.rowText}>
                  <span className={ui.rowTitle}>{title}</span>
                  {detail && <span className={styles.small}>{detail}</span>}
                </span>
                <span className={forms.switch}>
                  <input type="checkbox" role="switch" name={key} defaultChecked={settings.notify[key]} disabled={key === "bookings"} />
                </span>
              </label>
            ))}
          </div>
        </AutoSaveForm>
      </section>

      <div className={styles.pair}>
        <Preference title={TEXT.language} name="language" options={TEXT.languages} current={settings.language} enabled={["en"]} />
        <Preference title={TEXT.theme} name="theme" options={TEXT.themes} current={settings.theme} enabled={["light"]} />
      </div>

      <section className={tables.section} aria-labelledby="pay-title">
        <h2 id="pay-title" className={ui.sectionTitle}>
          {TEXT.paymentAccount}
        </h2>
        <div className={styles.card}>
          <Row title={TEXT.merchant} detail={TEXT.merchantLine(Boolean(payment))} action={<Link href={routes.connectPayments} className={styles.rowLinkStrong}>{TEXT.manage}</Link>} />
        </div>
      </section>

      <section className={tables.section} aria-labelledby="safety-title">
        <h2 id="safety-title" className={ui.sectionTitle}>
          {TEXT.safety}
        </h2>
        <div className={styles.card}>
          <Row title={TEXT.blocked} detail={TEXT.blockedLine(blockedCount)} action={<Link href={routes.blockedUsers} className={styles.rowLink}>{TEXT.manageArrow}</Link>} />
        </div>
      </section>

      {query.dialog === "contact" && <ContactDialog settings={settings} codeStep={query.step === "code"} error={query.error} />}
      {query.dialog === "password" && <PasswordDialog error={query.error} />}
      {query.dialog === "logout" && <LogOutDialog />}
    </div>
  );
}

// One pale 58px row: a square, a title and a line, and something on the right.
function Row({ title, detail, action }: { title: string; detail?: string; action?: React.ReactNode }) {
  return (
    <div className={styles.row}>
      <span className={styles.square} aria-hidden="true" />
      <span className={ui.rowText}>
        <span className={ui.rowTitle}>{title}</span>
        {detail && <span className={styles.small}>{detail}</span>}
      </span>
      {action}
    </div>
  );
}

// Language or Theme: pills, the current one filled. Only English and Light exist so far.
function Preference({
  title,
  name,
  options,
  current,
  enabled,
}: {
  title: string;
  name: keyof AccountSettings;
  options: readonly (readonly string[])[];
  current: string;
  enabled: string[];
}) {
  return (
    <section className={styles.card} aria-label={title}>
      <h2 className={hiring.cardTitle}>{title}</h2>
      <form action={savePreferences} className={styles.pills}>
        {options.map(([value, label]) => (
          <button
            key={value}
            type="submit"
            name={name}
            value={value}
            className={`${styles.pill} ${current === value ? styles.pillOn : ""}`}
            aria-pressed={current === value}
            disabled={!enabled.includes(value)}
            title={enabled.includes(value) ? undefined : TEXT.later}
          >
            {label}
          </button>
        ))}
      </form>
    </section>
  );
}

const DIALOG = {
  close: "Close",
  cancel: "Cancel",
  contactTitle: "Change email or phone",
  contactSubtitle: "We send a code to the new one to check it's yours",
  current: "Current",
  next: "New email or phone",
  password: "Password",
  confirm: "To confirm it's you",
  sendCode: "Send code",
  codeTitle: "Enter the code",
  codeSubtitle: (to: string) => `We sent a 6-digit code to ${to}`,
  code: "Code",
  devCode: "Development: any 6 digits work, as no code is really sent (EN-04).",
  confirmButton: "Confirm",
  passwordTitle: "Change password",
  passwordSubtitle: "You stay logged in on this device",
  currentPassword: "Current password",
  newPassword: "New password",
  rules: "8 or more characters, with a number",
  again: "New password again",
  changePassword: "Change password",
  logOutTitle: "Log out?",
  logOutText: "You can log back in with your email or phone and password.",
  logOut: "Log out",
  errors: {
    contact: "An email like name@example.com, or a phone like +94 71 234 5678.",
    password: "Type your password to confirm.",
    code: "The code is 6 digits.",
    current: "Type your current password.",
    rules: "Use 8 or more characters, with a number.",
    match: "The two new passwords don't match.",
    same: "The new password is the same as the current one.",
  } as Record<string, string>,
} as const;

// "Change email or phone" (Figma O95), then the code step.
function ContactDialog({ settings, codeStep, error }: { settings: AccountSettings; codeStep: boolean; error?: string }) {
  const close = routes.settings;
  const message = error ? DIALOG.errors[error] : undefined;
  if (codeStep && settings.pendingContact) {
    return (
      <Dialog title={DIALOG.codeTitle} subtitle={DIALOG.codeSubtitle(settings.pendingContact)} closeHref={close} closeLabel={DIALOG.close} narrow>
        <form action={confirmContactChange} className={tables.dialogForm}>
          <label className={forms.field}>
            <span className={forms.label}>{DIALOG.code}</span>
            <input name="code" inputMode="numeric" autoComplete="one-time-code" maxLength={6} required className={forms.input} aria-invalid={Boolean(message) || undefined} />
            <span className={forms.hint}>{DIALOG.devCode}</span>
          </label>
          {message && <p className={forms.error}>{message}</p>}
          <div className={tables.dialogActions}>
            <Link href={close} scroll={false} className={`${forms.bigButton} ${forms.bigButtonQuiet}`}>
              {DIALOG.cancel}
            </Link>
            <button type="submit" className={`${forms.bigButton} ${forms.bigButtonPrimary}`}>
              {DIALOG.confirmButton}
            </button>
          </div>
        </form>
      </Dialog>
    );
  }
  return (
    <Dialog title={DIALOG.contactTitle} subtitle={DIALOG.contactSubtitle} closeHref={close} closeLabel={DIALOG.close} narrow>
      <form action={startContactChange} className={tables.dialogForm}>
        <label className={forms.field}>
          <span className={forms.label}>{DIALOG.current}</span>
          <input value={settings.email} readOnly className={`${forms.input} ${hiring.readOnly}`} />
        </label>
        <label className={forms.field}>
          <span className={forms.label}>{DIALOG.next}</span>
          <input name="contact" required autoComplete="email" className={forms.input} aria-invalid={error === "contact" || undefined} />
        </label>
        <label className={forms.field}>
          <span className={forms.label}>{DIALOG.password}</span>
          <input name="password" type="password" required autoComplete="current-password" className={forms.input} aria-invalid={error === "password" || undefined} />
          <span className={forms.hint}>{DIALOG.confirm}</span>
        </label>
        {message && <p className={forms.error}>{message}</p>}
        <div className={tables.dialogActions}>
          <Link href={close} scroll={false} className={`${forms.bigButton} ${forms.bigButtonQuiet}`}>
            {DIALOG.cancel}
          </Link>
          <button type="submit" className={`${forms.bigButton} ${forms.bigButtonPrimary}`}>
            {DIALOG.sendCode}
          </button>
        </div>
      </form>
    </Dialog>
  );
}

// "Change password" (Figma O96).
function PasswordDialog({ error }: { error?: string }) {
  const close = routes.settings;
  const message = error ? DIALOG.errors[error] : undefined;
  return (
    <Dialog title={DIALOG.passwordTitle} subtitle={DIALOG.passwordSubtitle} closeHref={close} closeLabel={DIALOG.close} narrow>
      <form action={changePassword} className={tables.dialogForm}>
        <label className={forms.field}>
          <span className={forms.label}>{DIALOG.currentPassword}</span>
          <input name="current" type="password" required autoComplete="current-password" className={forms.input} aria-invalid={error === "current" || undefined} />
        </label>
        <label className={forms.field}>
          <span className={forms.label}>{DIALOG.newPassword}</span>
          <input name="next" type="password" required minLength={8} autoComplete="new-password" className={forms.input} aria-invalid={error === "rules" || error === "same" || undefined} />
          <span className={forms.hint}>{DIALOG.rules}</span>
        </label>
        <label className={forms.field}>
          <span className={forms.label}>{DIALOG.again}</span>
          <input name="again" type="password" required autoComplete="new-password" className={forms.input} aria-invalid={error === "match" || undefined} />
        </label>
        {message && <p className={forms.error}>{message}</p>}
        <div className={tables.dialogActions}>
          <Link href={close} scroll={false} className={`${forms.bigButton} ${forms.bigButtonQuiet}`}>
            {DIALOG.cancel}
          </Link>
          <button type="submit" className={`${forms.bigButton} ${forms.bigButtonPrimary}`}>
            {DIALOG.changePassword}
          </button>
        </div>
      </form>
    </Dialog>
  );
}

// "Log out?" (Figma O98).
function LogOutDialog() {
  const close = routes.settings;
  return (
    <Dialog title={DIALOG.logOutTitle} closeHref={close} closeLabel={DIALOG.close} narrow>
      <p className={tables.panelText}>{DIALOG.logOutText}</p>
      <div className={tables.dialogActions}>
        <Link href={close} scroll={false} className={`${forms.bigButton} ${forms.bigButtonQuiet}`}>
          {DIALOG.cancel}
        </Link>
        <LogOutButton label={DIALOG.logOut} />
      </div>
    </Dialog>
  );
}
