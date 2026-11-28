import type { Metadata } from "next";
import Link from "next/link";
import Chip from "@/components/portal/Chip";
import Columns from "@/components/portal/Columns";
import Panel from "@/components/portal/Panel";
import forms from "@/components/portal/forms.module.css";
import hiring from "@/components/portal/hiring/Hiring.module.css";
import styles from "@/components/portal/provider/Provider.module.css";
import ui from "@/components/portal/ui.module.css";
import { requireRole } from "@/lib/auth/session";
import { getProviderState } from "@/lib/data/provider";
import { formatShortDate } from "@/lib/format";
import { routes } from "@/lib/routes";
import { connectPayout, disconnectPayout } from "../actions";

export const metadata: Metadata = { title: "Connect a payment account" };

const TEXT = {
  title: "Connect a payment account",
  lede: "Get deposits and instalments straight to your own PayHere account",
  testTitle: "Test payment, no real money",
  testText: "PayHere sandbox · nothing is charged",
  none: "No payment account connected",
  noneText: "Organisers pay you outside the app and you mark payments received.",
  connectedTitle: (name: string) => `Connected · ${name}`,
  connectedText: (id: string, on: string) => `Merchant ID ${id} · connected ${on}`,
  disconnect: "Disconnect",
  step1: "1. Have a PayHere merchant account",
  step1Text: "Sandbox for now. Sign up at PayHere if you do not have one.",
  signUp: "Open PayHere sign-up",
  step2: "2. Enter your merchant details",
  merchant: "Merchant ID",
  secret: "Merchant secret",
  name: "Account name",
  step3: "3. Test it",
  step3Text: "We send a LKR 10 test payment. It is not real money.",
  testPayment: "Test payment",
  notRun: "Not run",
  waiting: "Waiting for you to press Connect",
  connect: "Connect account",
  notNow: "Not now",
  error: "Enter the merchant ID (digits only), the secret and the account name.",
  straight: "Money goes straight to you",
  straightText: "Tezera opens your own checkout. It never collects, holds or splits payments.",
  without: "Without an account",
  withoutText: "Everything still works. Instalments show as due, received or overdue, and you mark them yourself.",
} as const;

// "Connect a payment account" (Figma V71, F71): PayHere merchant details, sandbox only.
export default async function ConnectPage({ searchParams }: { searchParams: Promise<{ error?: string; merchant?: string; name?: string }> }) {
  const session = await requireRole("vendor", "freelancer");
  const state = await getProviderState(session);
  const q = await searchParams;
  const payout = state?.payout;

  const aside = (
    <>
      <Panel title={TEXT.straight}>
        <p className={styles.foot}>{TEXT.straightText}</p>
      </Panel>
      <Panel title={TEXT.without}>
        <p className={styles.foot}>{TEXT.withoutText}</p>
      </Panel>
    </>
  );

  return (
    <Columns aside={aside}>
      <header className={hiring.pageHeadText}>
        <h1 className={hiring.pageTitle}>{TEXT.title}</h1>
        <p className={hiring.lede}>{TEXT.lede}</p>
      </header>
      <div className={`${styles.banner} ${styles.warnBanner}`}>
        <span className={styles.bannerText}>
          <span className={ui.rowTitle}>{TEXT.testTitle}</span>
          <span className={hiring.sub}>{TEXT.testText}</span>
        </span>
      </div>
      {payout ? (
        <div className={styles.banner}>
          <span className={styles.bannerText}>
            <span className={ui.rowTitle}>{TEXT.connectedTitle(payout.accountName)}</span>
            <span className={hiring.sub}>{TEXT.connectedText(payout.last4, formatShortDate(payout.connectedAt))}</span>
          </span>
          <form action={disconnectPayout.bind(null, routes.vendorArea.payments)}>
            <button type="submit" className={`${ui.rowButton} ${ui.rowButtonWhite}`}>
              {TEXT.disconnect}
            </button>
          </form>
        </div>
      ) : (
        <div className={`${styles.banner} ${styles.infoBanner}`}>
          <span className={styles.bannerText}>
            <span className={ui.rowTitle}>{TEXT.none}</span>
            <span className={hiring.sub}>{TEXT.noneText}</span>
          </span>
        </div>
      )}
      <form action={connectPayout} className={styles.stack}>
        <section className={forms.card} aria-labelledby="step1">
          <h2 id="step1" className={hiring.cardTitle}>
            {TEXT.step1}
          </h2>
          <p className={styles.foot}>{TEXT.step1Text}</p>
          <a href="https://www.payhere.lk/" target="_blank" rel="noreferrer" className={ui.textLink}>
            {TEXT.signUp}
          </a>
        </section>
        <section className={forms.card} aria-labelledby="step2">
          <h2 id="step2" className={hiring.cardTitle}>
            {TEXT.step2}
          </h2>
          <div className={forms.row2}>
            <label className={forms.field}>
              <span className={forms.label}>{TEXT.merchant}</span>
              <input name="merchant" inputMode="numeric" required defaultValue={q.merchant ?? ""} className={forms.input} />
            </label>
            <label className={forms.field}>
              <span className={forms.label}>{TEXT.secret}</span>
              <input name="secret" type="password" required autoComplete="off" className={forms.input} />
            </label>
          </div>
          <label className={forms.field}>
            <span className={forms.label}>{TEXT.name}</span>
            <input name="name" required defaultValue={q.name ?? state?.profile.name ?? ""} className={forms.input} />
          </label>
        </section>
        <section className={forms.card} aria-labelledby="step3">
          <h2 id="step3" className={hiring.cardTitle}>
            {TEXT.step3}
          </h2>
          <p className={styles.foot}>{TEXT.step3Text}</p>
          <div className={styles.greyRow}>
            <span className={ui.rowText}>
              <span className={ui.rowTitle}>{TEXT.testPayment}</span>
              <span className={hiring.sub}>{TEXT.waiting}</span>
            </span>
            <Chip tone="neutral">{TEXT.notRun}</Chip>
          </div>
        </section>
        {q.error && (
          <p className={forms.error} role="alert">
            {TEXT.error}
          </p>
        )}
        <div className={styles.pair}>
          <button type="submit" className={`${forms.bigButton} ${forms.bigButtonPrimary}`}>
            {TEXT.connect}
          </button>
          <Link href={routes.vendorArea.payments} className={forms.bigButton}>
            {TEXT.notNow}
          </Link>
        </div>
      </form>
    </Columns>
  );
}
