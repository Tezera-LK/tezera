import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import Chip from "@/components/portal/Chip";
import Columns from "@/components/portal/Columns";
import Panel from "@/components/portal/Panel";
import events from "@/components/portal/events/EventPages.module.css";
import forms from "@/components/portal/forms.module.css";
import hiring from "@/components/portal/hiring/Hiring.module.css";
import Choice from "@/components/portal/provider/Choice";
import styles from "@/components/portal/provider/Provider.module.css";
import ui from "@/components/portal/ui.module.css";
import { requireRole } from "@/lib/auth/session";
import { getProviderState } from "@/lib/data/provider";
import { day, lkr, organiserName } from "@/lib/provider";
import { routes } from "@/lib/routes";
import { payStall } from "../../actions";

export const metadata: Metadata = { title: "Pay the stall fee" };

const TEXT = {
  title: "Pay the stall fee",
  sub: (event: string, who: string, type: string) => `${event} · ${who} · ${type.toLowerCase()} stall`,
  testTitle: "Test payment, no real money",
  testText: "PayHere sandbox · nothing is charged",
  summary: "Summary",
  fee: "Stall fee",
  paidTo: "Paid to",
  theirAccount: (who: string) => `${who} · their PayHere account`,
  due: "Due",
  total: "Total",
  checkout: "PayHere checkout",
  sandbox: "Sandbox",
  methods: ["Card", "eZ Cash", "Bank transfer"],
  card: "Card number",
  expiry: "Expiry",
  cvv: "CVV",
  name: "Name on card",
  pay: (amount: string) => `Pay ${amount} (test)`,
  fail: "Try a failed payment",
  cardError: "Enter a test card number, such as 4242 4242 4242 4242.",
  noMoney: "No real money moves",
  noMoneyText: "The sandbox runs the whole flow so the stall is marked paid and confirmed.",
} as const;

// Paying a stall fee in the PayHere sandbox (Figma V78). The result is V79 or V80.
export default async function PayStallPage({ params, searchParams }: { params: Promise<{ stallId: string }>; searchParams: Promise<{ error?: string }> }) {
  const session = await requireRole("vendor", "freelancer");
  if (session.role === "freelancer") redirect(routes.vendorArea.payments);
  const { stallId } = await params;
  const state = await getProviderState(session);
  const stall = state?.stalls.find((s) => s.id === stallId);
  if (!state || !stall?.application) notFound();
  if (stall.application.fee.paidAt) redirect(routes.vendorArea.stallPaid(stall.id));
  const who = organiserName(state, stall.organiserId);
  const { error } = await searchParams;

  return (
    <Columns
      aside={
        <Panel title={TEXT.noMoney}>
          <p className={styles.foot}>{TEXT.noMoneyText}</p>
        </Panel>
      }
    >
      <header className={hiring.pageHeadText}>
        <h1 className={hiring.pageTitle}>{TEXT.title}</h1>
        <p className={hiring.lede}>{TEXT.sub(stall.eventTitle, who, stall.application.type)}</p>
      </header>
      <div className={`${styles.banner} ${styles.warnBanner}`}>
        <span className={styles.bannerText}>
          <span className={ui.rowTitle}>{TEXT.testTitle}</span>
          <span className={hiring.sub}>{TEXT.testText}</span>
        </span>
      </div>
      <section className={events.card} aria-labelledby="summary-title">
        <h2 id="summary-title" className={hiring.cardTitle}>
          {TEXT.summary}
        </h2>
        <dl className={events.facts}>
          <dt>{TEXT.fee}</dt>
          <dd>{lkr(stall.feeLkr)}</dd>
          <dt>{TEXT.paidTo}</dt>
          <dd>{TEXT.theirAccount(who)}</dd>
          <dt>{TEXT.due}</dt>
          <dd>{day(stall.application.fee.due)}</dd>
          <dt>{TEXT.total}</dt>
          <dd>{lkr(stall.feeLkr)}</dd>
        </dl>
      </section>
      <form action={payStall.bind(null, stall.id, false)} className={forms.card}>
        <div className={hiring.cardHead}>
          <h2 className={hiring.cardTitle}>{TEXT.checkout}</h2>
          <Chip tone="warn">{TEXT.sandbox}</Chip>
        </div>
        <div className={styles.pills}>
          {TEXT.methods.map((m, i) => (
            <Choice key={m} type="radio" name="method" value={m} title={m} defaultChecked={i === 0} />
          ))}
        </div>
        <label className={forms.field}>
          <span className={forms.label}>{TEXT.card}</span>
          <input name="card" inputMode="numeric" autoComplete="off" defaultValue="4242 4242 4242 4242" className={forms.input} />
        </label>
        <div className={forms.row3}>
          <label className={forms.field}>
            <span className={forms.label}>{TEXT.expiry}</span>
            <input name="expiry" autoComplete="off" defaultValue="12 / 28" className={forms.input} />
          </label>
          <label className={forms.field}>
            <span className={forms.label}>{TEXT.cvv}</span>
            <input name="cvv" type="password" autoComplete="off" defaultValue="123" className={forms.input} />
          </label>
          <label className={forms.field}>
            <span className={forms.label}>{TEXT.name}</span>
            <input name="cardName" autoComplete="off" className={forms.input} />
          </label>
        </div>
        {error === "card" && (
          <p className={forms.error} role="alert">
            {TEXT.cardError}
          </p>
        )}
        <div className={styles.pair}>
          <button type="submit" className={`${forms.bigButton} ${forms.bigButtonPrimary}`}>
            {TEXT.pay(lkr(stall.feeLkr))}
          </button>
          <button type="submit" formAction={payStall.bind(null, stall.id, true)} formNoValidate className={forms.bigButton}>
            {TEXT.fail}
          </button>
        </div>
      </form>
      <Link href={routes.vendorArea.stalls} className={ui.textLink}>
        ‹ Back to stalls
      </Link>
    </Columns>
  );
}
