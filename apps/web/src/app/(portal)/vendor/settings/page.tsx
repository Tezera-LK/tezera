import type { Metadata } from "next";
import Link from "next/link";
import Dialog from "@/components/portal/events/Dialog";
import forms from "@/components/portal/forms.module.css";
import hiring from "@/components/portal/hiring/Hiring.module.css";
import { AutoSaveForm, LogOutButton } from "@/components/portal/settings/SettingsBits";
import styles from "@/components/portal/settings/Settings.module.css";
import tables from "@/components/portal/tables.module.css";
import ui from "@/components/portal/ui.module.css";
import EmptyState from "@/components/states/EmptyState";
import { requireRole } from "@/lib/auth/session";
import { getProviderState } from "@/lib/data/provider";
import type { AccountSettings } from "@/lib/data/portal-types";
import { formatShortDate } from "@/lib/format";
import { routes } from "@/lib/routes";
import { disconnectPayout } from "../payments/actions";
import { changePassword, confirmContactChange, saveNotifications, savePreferences, startContactChange } from "./actions";

export const metadata: Metadata = { title: "Settings" };

const TEXT = {
  title: "Settings",
  lede: "Language, theme, notifications, payments and safety",
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
  themeNote: "Dark colours are in the brand manual but not in the PRD yet.",
  notifications: "Notifications",
  always: "Always on",
  saveNotifications: "Save notifications",
  paymentAccount: "Payment account",
  merchant: "PayHere merchant account · sandbox",
  connectedLine: "Connected · deposits and instalments settle here",
  notConnectedLine: "Not connected · payments happen outside the app",
  disconnect: "Disconnect",
  connect: "Connect ›",
  safety: "Account and safety",
  contact: "Email or phone",
  change: "Change ›",
  password: "Password",
  changed: (when: string) => `Changed ${when}`,
  blocked: "Blocked users",
  blockedLine: (n: number) => `${n} blocked`,
  manage: "Manage ›",
  logOut: "Log out",
  saved: {
    notifications: "Notifications saved.",
    contact: "Your email or phone is changed.",
    password: "Your password is changed.",
  } as Record<string, string>,
  emptyTitle: "Settings aren't available yet",
  emptyText: "They need the backend (EN-03), which isn't connected yet.",
} as const;

// The switches on V25, by settings key; null = always on, shown without a switch.
function notifyRows(vendor: boolean): [keyof AccountSettings["notify"] | null, string, string][] {
  return [
    [null, "Booking requests, quotes and confirmations", ""],
    ["stalls", vendor ? "Stall decisions and verification" : "Job post decisions and verification", ""],
    ["messages", "New messages", ""],
    [null, "Event changes", "Always on for events you are booked at"],
    ["questions", "Due-date and event reminders", ""],
    ["likes", "Activity: likes, comments, followers", ""],
  ];
}

type Query = { dialog?: string; step?: string; error?: string; saved?: string };

// Settings for vendors and freelancers (Figma V25, F25): language, theme, notifications, the
// payment account, and account and safety. ?dialog= opens change email or phone (V101), change
// password (V102) or log out (V104). Blocked users (V103) is its own page.
export default async function ProviderSettingsPage({ searchParams }: { searchParams: Promise<Query> }) {
  const session = await requireRole("vendor", "freelancer");
  const state = await getProviderState(session);
  const query = await searchParams;
  if (!state) return <EmptyState title={TEXT.emptyTitle} description={TEXT.emptyText} />;
  const settings = state.settings;

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

      <div className={styles.pair}>
        <Preference title={TEXT.language} name="language" options={TEXT.languages} current={settings.language} enabled={["en"]} />
        <Preference title={TEXT.theme} name="theme" options={TEXT.themes} current={settings.theme} enabled={["light"]} note={TEXT.themeNote} />
      </div>

      <section className={tables.section} aria-labelledby="notify-title">
        <h2 id="notify-title" className={ui.sectionTitle}>
          {TEXT.notifications}
        </h2>
        <AutoSaveForm action={saveNotifications} saveLabel={TEXT.saveNotifications}>
          <div className={styles.card}>
            {notifyRows(state.kind === "vendor").map(([key, title, detail]) =>
              key ? (
                <label key={title} className={styles.row}>
                  <span className={styles.square} aria-hidden="true" />
                  <span className={ui.rowText}>
                    <span className={ui.rowTitle}>{title}</span>
                    {detail && <span className={styles.small}>{detail}</span>}
                  </span>
                  <span className={forms.switch}>
                    <input type="checkbox" name={key} defaultChecked={settings.notify[key]} aria-label={title} />
                  </span>
                </label>
              ) : (
                <Row key={title} title={title} detail={detail || TEXT.always} />
              ),
            )}
          </div>
        </AutoSaveForm>
      </section>

      <section className={tables.section} aria-labelledby="pay-title">
        <h2 id="pay-title" className={ui.sectionTitle}>
          {TEXT.paymentAccount}
        </h2>
        <div className={styles.card}>
          <Row
            title={TEXT.merchant}
            detail={state.payout ? TEXT.connectedLine : TEXT.notConnectedLine}
            action={
              state.payout ? (
                <form action={disconnectPayout.bind(null, routes.vendorArea.settings)}>
                  <button type="submit" className={styles.rowLink}>
                    {TEXT.disconnect}
                  </button>
                </form>
              ) : (
                <Link href={routes.vendorArea.connect} className={styles.rowLinkStrong}>
                  {TEXT.connect}
                </Link>
              )
            }
          />
        </div>
      </section>

      <section className={tables.section} aria-labelledby="safety-title">
        <h2 id="safety-title" className={ui.sectionTitle}>
          {TEXT.safety}
        </h2>
        <div className={styles.card}>
          <Row
            title={TEXT.contact}
            detail={settings.email}
            action={
              <Link href={`${routes.vendorArea.settings}?dialog=contact`} scroll={false} className={styles.rowLink}>
                {TEXT.change}
              </Link>
            }
          />
          <Row
            title={TEXT.password}
            detail={TEXT.changed(formatShortDate(settings.passwordChangedAt))}
            action={
              <Link href={`${routes.vendorArea.settings}?dialog=password`} scroll={false} className={styles.rowLink}>
                {TEXT.change}
              </Link>
            }
          />
          <Row
            title={TEXT.blocked}
            detail={TEXT.blockedLine(state.blocked.length)}
            action={
              <Link href={routes.vendorArea.blocked} className={styles.rowLink}>
                {TEXT.manage}
              </Link>
            }
          />
          <Link href={`${routes.vendorArea.settings}?dialog=logout`} scroll={false} className={`${styles.row} ${styles.rowAsLink}`}>
            <span className={styles.square} aria-hidden="true" />
            <span className={ui.rowTitle}>{TEXT.logOut}</span>
            <span className={styles.arrow} aria-hidden="true">
              ›
            </span>
          </Link>
        </div>
      </section>

      {query.dialog === "contact" && <ContactDialog settings={settings} codeStep={query.step === "code"} error={query.error} />}
      {query.dialog === "password" && <PasswordDialog error={query.error} />}
      {query.dialog === "logout" && (
        <Dialog title={DIALOG.logOutTitle} closeHref={routes.vendorArea.settings} closeLabel={DIALOG.close} narrow>
          <p className={tables.panelText}>{DIALOG.logOutText}</p>
          <div className={tables.dialogActions}>
            <Link href={routes.vendorArea.settings} scroll={false} className={`${forms.bigButton} ${forms.bigButtonQuiet}`}>
              {DIALOG.cancel}
            </Link>
            <LogOutButton label={DIALOG.logOut} />
          </div>
        </Dialog>
      )}
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
function Preference({ title, name, options, current, enabled, note }: { title: string; name: "language" | "theme"; options: readonly (readonly string[])[]; current: string; enabled: string[]; note?: string }) {
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
      {note && <p className={styles.small}>{note}</p>}
    </section>
  );
}

const DIALOG = {
  close: "Close",
  cancel: "Cancel",
  contactTitle: "Change email or phone",
  contactSubtitle: "We send a code to the new one to check it is yours",
  current: "Current",
  next: "New email or phone",
  password: "Password",
  confirm: "To confirm it's you",
  sendCode: "Send code",
  codeTitle: "Enter the code",
  codeSubtitle: (to: string) => `Code sent to ${to}`,
  code: "Code",
  devCode: "Preview: any 6 digits work, as no code is really sent (EN-04).",
  verify: "Verify and save",
  passwordTitle: "Change password",
  currentPassword: "Current password",
  newPassword: "New password",
  rules: "At least 8 characters, with a number",
  again: "Confirm new password",
  savePassword: "Save password",
  logOutTitle: "Log out of Tezera?",
  logOutText: "You will need your email or phone and password to log back in.",
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

// "Change email or phone" (Figma V101), then the code step.
function ContactDialog({ settings, codeStep, error }: { settings: AccountSettings; codeStep: boolean; error?: string }) {
  const close = routes.vendorArea.settings;
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
              {DIALOG.verify}
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

// "Change password" (Figma V102).
function PasswordDialog({ error }: { error?: string }) {
  const close = routes.vendorArea.settings;
  const message = error ? DIALOG.errors[error] : undefined;
  return (
    <Dialog title={DIALOG.passwordTitle} closeHref={close} closeLabel={DIALOG.close} narrow>
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
            {DIALOG.savePassword}
          </button>
        </div>
      </form>
    </Dialog>
  );
}
