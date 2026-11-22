import type { Metadata } from "next";
import Link from "next/link";
import Columns from "@/components/portal/Columns";
import forms from "@/components/portal/forms.module.css";
import books from "@/components/portal/hiring/Bookings.module.css";
import styles from "@/components/portal/hiring/Hiring.module.css";
import { TestBanner } from "@/components/portal/hiring/PaymentBits";
import tables from "@/components/portal/tables.module.css";
import ui from "@/components/portal/ui.module.css";
import { requireRole } from "@/lib/auth/session";
import { getPaymentAccount } from "@/lib/data/portal";
import { routes } from "@/lib/routes";
import { connectAccount } from "../actions";

export const metadata: Metadata = { title: "Connect a payment account" };

const TEXT = {
  title: "Connect a payment account",
  lede: "Take stall fees straight into your own PayHere account",
  noneTitle: "No payment account connected",
  noneText: "Vendors pay stall fees outside the app and you mark them paid.",
  connectedTitle: (id: string) => `Connected to merchant ${id}`,
  connectedText: "Enter new details below to change it.",
  step1: "1. Have a PayHere merchant account",
  step1Text: "Sandbox for now. Sign up at PayHere if you do not have one.",
  signUp: "Open PayHere sign-up",
  step2: "2. Enter your merchant details",
  merchantId: "Merchant ID",
  secret: "Merchant secret",
  accountName: "Account name",
  step3: "3. Test it",
  step3Text: "We send a LKR 10 test payment. It is not real money.",
  testTitle: "Test payment",
  testText: "Runs when you press Connect",
  notRun: "Not run",
  connect: "Connect account",
  notNow: "Not now",
  asideTitle: "Money goes straight to you",
  asideText: "Tezera opens your own checkout. It never collects, holds or splits payments.",
  errors: {
    merchant: "The merchant ID is 6 to 10 digits.",
    secret: "Add the merchant secret.",
    name: "Add the account name.",
    save: "That didn't save. Saving needs the backend (EN-03).",
  } as Record<string, string>,
} as const;

// Connect a payment account (Figma O61): the organiser's PayHere merchant details, sandbox only.
export default async function ConnectPaymentsPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const session = await requireRole("organiser");
  const error = (await searchParams).error;
  const account = await getPaymentAccount(session);

  const aside = (
    <div className={styles.notePanel}>
      <p className={styles.notePanelTitle}>{TEXT.asideTitle}</p>
      <p className={tables.panelText}>{TEXT.asideText}</p>
    </div>
  );

  return (
    <Columns aside={aside}>
      <header className={styles.pageHeadText}>
        <h1 className={styles.pageTitle}>{TEXT.title}</h1>
        <p className={styles.lede}>{TEXT.lede}</p>
      </header>
      <TestBanner />
      <div className={books.warnNotice}>
        <span className={books.warnDot} aria-hidden="true" />
        <span className={ui.rowText}>
          <span className={ui.rowTitle}>{account ? TEXT.connectedTitle(account.merchantId) : TEXT.noneTitle}</span>
          <span className={books.noticeText}>{account ? TEXT.connectedText : TEXT.noneText}</span>
        </span>
      </div>

      <form action={connectAccount} className={forms.form}>
        {error && TEXT.errors[error] && (
          <p className={forms.alert} role="alert">
            {TEXT.errors[error]}
          </p>
        )}
        <section className={books.card} aria-labelledby="step-1">
          <h2 id="step-1" className={styles.cardTitle}>
            {TEXT.step1}
          </h2>
          <p className={books.noticeText}>{TEXT.step1Text}</p>
          {/* PayHere's own site, in a new tab */}
          <a href="https://www.payhere.lk" target="_blank" rel="noopener noreferrer" className={`${ui.rowButton} ${books.plainRowButton} ${books.centredLink}`}>
            {TEXT.signUp}
          </a>
        </section>
        <section className={books.card} aria-labelledby="step-2">
          <h2 id="step-2" className={styles.cardTitle}>
            {TEXT.step2}
          </h2>
          <div className={forms.row2}>
            <label className={forms.field}>
              <span className={forms.label}>{TEXT.merchantId}</span>
              <input name="merchantId" inputMode="numeric" required defaultValue={account?.merchantId} className={forms.input} aria-invalid={error === "merchant" || undefined} />
            </label>
            <label className={forms.field}>
              <span className={forms.label}>{TEXT.secret}</span>
              <input name="secret" type="password" required autoComplete="off" className={forms.input} aria-invalid={error === "secret" || undefined} />
            </label>
          </div>
          <label className={forms.field}>
            <span className={forms.label}>{TEXT.accountName}</span>
            <input name="accountName" required defaultValue={account?.accountName} className={forms.input} aria-invalid={error === "name" || undefined} />
          </label>
        </section>
        <section className={books.card} aria-labelledby="step-3">
          <h2 id="step-3" className={styles.cardTitle}>
            {TEXT.step3}
          </h2>
          <p className={books.noticeText}>{TEXT.step3Text}</p>
          <div className={books.ledgerRow}>
            <span className={ui.rowText}>
              <span className={ui.rowTitle}>{TEXT.testTitle}</span>
              <span className={styles.sub}>{TEXT.testText}</span>
            </span>
            <span className={books.smallState}>{TEXT.notRun}</span>
          </div>
        </section>
        <div className={books.payActions}>
          <button type="submit" className={`${forms.bigButton} ${forms.bigButtonPrimary}`}>
            {TEXT.connect}
          </button>
          <Link href={routes.payments} className={forms.bigButton}>
            {TEXT.notNow}
          </Link>
        </div>
      </form>
    </Columns>
  );
}
