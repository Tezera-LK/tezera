import type { Metadata } from "next";
import Link from "next/link";
import Chip from "@/components/portal/Chip";
import Thumb from "@/components/portal/Thumb";
import Dialog from "@/components/portal/events/Dialog";
import forms from "@/components/portal/forms.module.css";
import hiring from "@/components/portal/hiring/Hiring.module.css";
import AttachPicker from "@/components/portal/people/AttachPicker";
import styles from "@/components/portal/people/People.module.css";
import shell from "@/components/portal/PortalShell.module.css";
import tables from "@/components/portal/tables.module.css";
import ui from "@/components/portal/ui.module.css";
import { requireRole } from "@/lib/auth/session";
import { getProvider, listConversations, saveConversation } from "@/lib/data/portal";
import type { Conversation } from "@/lib/data/portal-types";
import { daysFrom, formatDayMonth, formatTime, formatWhen } from "@/lib/format";
import { routes } from "@/lib/routes";
import { blockConversation, reportConversation, sendMessage } from "./actions";

export const metadata: Metadata = { title: "Messages" };

const TEXT = {
  title: "Messages",
  lede: "Providers, vendors and people going to your events",
  tabsLabel: "Whose messages",
  tabs: [
    ["", "All"],
    ["providers", "Providers"],
    ["consumers", "Consumers"],
  ],
  none: "No conversations here yet.",
  pick: "Pick a conversation to read it.",
  newChat: "Say hello. Your first message starts the conversation.",
  viewProfile: "View profile",
  block: "Block",
  report: "Report",
  today: "Today",
  attach: "Attach a file",
  write: "Write a message…",
  label: "Your message",
  send: "Send",
  blocked: (name: string) => `You blocked ${name}. Unblock them in Settings to message again.`,
  reported: "Reported. An admin is looking at this conversation.",
  unread: (n: number) => `${n} unread`,
} as const;

type Query = { c?: string; to?: string; show?: string; dialog?: string; error?: string; sent?: string };

// Messages (Figma O23): conversations on the left, the open one on the right. ?to=<provider>
// opens the conversation with that provider, or starts one. ?dialog= opens attach (O90),
// block (O91) or report (O92).
export default async function MessagesPage({ searchParams }: { searchParams: Promise<Query> }) {
  const session = await requireRole("organiser");
  const query = await searchParams;
  const all = await listConversations(session);
  const show = query.show === "providers" || query.show === "consumers" ? query.show : "";
  // blocked people leave the list; Settings lists them (O97), and their conversation still opens
  const shown = all.filter((c) => !c.blocked || c.id === query.c).filter((c) => (show === "providers" ? c.kind !== "Consumer" : show === "consumers" ? c.kind === "Consumer" : true));

  // the open conversation: ?c=, the one with ?to='s provider, a new one with them, or the latest
  let current: Conversation | null = all.find((c) => c.id === query.c) ?? null;
  let key = current?.id ?? "";
  if (!current && query.to) {
    current = all.find((c) => c.providerId === query.to) ?? null;
    key = current?.id ?? "";
    if (!current) {
      const provider = await getProvider(session, query.to);
      if (provider) {
        key = `new:${provider.id}`;
        current = { id: key, name: provider.name, kind: provider.kind, detail: [provider.role, provider.verified ? "Verified" : ""].filter(Boolean).join(" · "), providerId: provider.id, unread: 0, blocked: false, reported: null, messages: [] };
      }
    }
  }
  if (!current && !query.c && !query.to) {
    current = shown[0] ?? null;
    key = current?.id ?? "";
  }
  // opening a conversation reads it
  if (current && current.unread > 0 && !key.startsWith("new:")) {
    await saveConversation(session, { ...current, unread: 0 });
  }
  const now = new Date();
  const base = `${routes.messages}?c=${encodeURIComponent(key)}`;

  return (
    <>
      <header className={hiring.pageHeadText}>
        <h1 className={hiring.pageTitle}>{TEXT.title}</h1>
        <p className={hiring.lede}>{TEXT.lede}</p>
      </header>
      <div className={styles.messages}>
        <div className={styles.listColumn}>
          <nav className={styles.tabs} aria-label={TEXT.tabsLabel}>
            {TEXT.tabs.map(([value, label]) => (
              <Link key={value} href={value ? `${routes.messages}?show=${value}` : routes.messages} className={styles.tab} aria-current={show === value ? "page" : undefined}>
                {label}
              </Link>
            ))}
          </nav>
          {shown.length === 0 ? (
            <p className={ui.muted}>{TEXT.none}</p>
          ) : (
            <ul className={styles.conversations}>
              {shown.map((c) => {
                const last = c.messages[c.messages.length - 1];
                return (
                  <li key={c.id}>
                    <Link
                      href={`${routes.messages}?c=${encodeURIComponent(c.id)}${show ? `&show=${show}` : ""}`}
                      className={`${styles.conversation} ${c.id === current?.id ? styles.conversationOpen : ""}`}
                      aria-current={c.id === current?.id ? "true" : undefined}
                    >
                      <Thumb size={40} shape="round" />
                      <span className={ui.rowText}>
                        <span className={ui.rowTitle}>{c.name}</span>
                        <span className={styles.small}>{last ? last.text || last.file?.name || "Photo" : ""}</span>
                      </span>
                      {c.unread > 0 ? (
                        <span className={styles.unread} aria-label={TEXT.unread(c.unread)}>
                          {c.unread}
                        </span>
                      ) : c.kind === "Vendor" ? (
                        <Chip tone="strong">Vendor</Chip>
                      ) : c.kind === "Consumer" ? (
                        <Chip tone="neutral">Consumer</Chip>
                      ) : (
                        last && <span className={styles.small}>{formatWhen(last.at, now)}</span>
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {current ? (
          <section className={styles.chat} aria-label={current.name}>
            <div className={styles.chatHead}>
              <Thumb size={44} shape="round" />
              <span className={ui.rowText}>
                <span className={ui.rowTitle}>{current.name}</span>
                <span className={styles.small}>{`${current.kind} · ${current.detail}`}</span>
              </span>
              <span className={styles.chatButtons}>
                {current.providerId && (
                  <Link href={routes.provider(current.providerId)} className={`${ui.rowButton} ${styles.greenButton}`}>
                    {TEXT.viewProfile}
                  </Link>
                )}
                {!current.blocked && !key.startsWith("new:") && (
                  <Link href={`${base}&dialog=block`} scroll={false} className={ui.rowButton}>
                    {TEXT.block}
                  </Link>
                )}
                {!current.reported && !key.startsWith("new:") && (
                  <Link href={`${base}&dialog=report`} scroll={false} className={ui.rowButton}>
                    {TEXT.report}
                  </Link>
                )}
              </span>
            </div>
            {current.reported && <p className={styles.notice}>{TEXT.reported}</p>}
            <ol className={styles.bubbles} aria-label={current.name}>
              {current.messages.length === 0 && <li className={styles.day}>{TEXT.newChat}</li>}
              {current.messages.map((m, i) => {
                const prev = current!.messages[i - 1];
                const newDay = !prev || daysFrom(new Date(prev.at), m.at) !== 0;
                return (
                  <li key={m.id} className={styles.bubbleItem}>
                    {newDay && <p className={styles.day}>{daysFrom(now, m.at) === 0 ? TEXT.today : formatDayMonth(m.at)}</p>}
                    <div className={`${styles.bubble} ${m.mine ? styles.mine : ""} ${m.image ? styles.imageBubble : ""}`}>
                      {m.image && <Thumb size={200} height={120} shape="image" />}
                      {m.file ? (
                        <span className={styles.file}>
                          <span className={styles.attachIcon} aria-hidden="true" />
                          <span className={ui.rowText}>
                            <span className={ui.rowTitle}>{m.file.name}</span>
                            <span className={styles.small}>{m.file.label}</span>
                          </span>
                        </span>
                      ) : (
                        m.text && <span>{m.text}</span>
                      )}
                      <span className={shell.srOnly}>{`${m.mine ? "You" : current!.name}, ${formatTime(m.at)}`}</span>
                    </div>
                  </li>
                );
              })}
            </ol>
            {current.blocked ? (
              <p className={styles.notice}>{TEXT.blocked(current.name)}</p>
            ) : (
              <form action={sendMessage.bind(null, key)} className={styles.compose}>
                <Link href={`${base}&dialog=attach`} scroll={false} className={styles.plus} aria-label={TEXT.attach}>
                  +
                </Link>
                <label className={shell.srOnly} htmlFor="message-text">
                  {TEXT.label}
                </label>
                <input id="message-text" name="text" required autoComplete="off" placeholder={TEXT.write} className={forms.input} />
                <button type="submit" className={`${ui.rowButton} ${ui.rowButtonPrimary} ${styles.send}`}>
                  {TEXT.send}
                </button>
              </form>
            )}
          </section>
        ) : (
          <p className={`${styles.chat} ${ui.muted}`}>{TEXT.pick}</p>
        )}
      </div>

      {current && query.dialog === "attach" && !current.blocked && (
        <Dialog title="Attach" subtitle="Photos, briefs, run-of-show and quotes" closeHref={base} closeLabel="Close" narrow>
          <AttachPicker action={sendMessage.bind(null, key)} closeHref={base} />
        </Dialog>
      )}
      {current && query.dialog === "block" && !current.blocked && <BlockDialog conversation={current} close={base} />}
      {current && query.dialog === "report" && !current.reported && <ReportDialog conversation={current} close={base} error={query.error} />}
    </>
  );
}

// "Block Tharindu Jayawardena?" (Figma O91).
function BlockDialog({ conversation, close }: { conversation: Conversation; close: string }) {
  return (
    <Dialog title={`Block ${conversation.name}?`} closeHref={close} closeLabel="Close" narrow>
      <p className={tables.panelText}>They can&apos;t message you or send you quotes. Your booking with them stays, and you can unblock them in Settings.</p>
      <form action={blockConversation.bind(null, conversation.id)} className={tables.dialogActions}>
        <Link href={close} scroll={false} className={`${forms.bigButton} ${forms.bigButtonQuiet}`}>
          Cancel
        </Link>
        <button type="submit" className={`${forms.bigButton} ${forms.bigButtonPrimary}`}>
          Block
        </button>
      </form>
    </Dialog>
  );
}

const REASONS = [
  ["spam", "Spam or scam"],
  ["abuse", "Harassment or abuse"],
  ["outside", "Asking to pay outside the agreed terms"],
  ["else", "Something else"],
];

// "Report Tharindu Jayawardena" (Figma O92).
function ReportDialog({ conversation, close, error }: { conversation: Conversation; close: string; error?: string }) {
  return (
    <Dialog title={`Report ${conversation.name}`} subtitle="An admin looks at the chat and your booking history" closeHref={close} closeLabel="Close" narrow>
      <form action={reportConversation.bind(null, conversation.id)} className={tables.dialogForm}>
        <fieldset className={styles.reasons}>
          <legend className={shell.srOnly}>Why</legend>
          {REASONS.map(([value, label]) => (
            <label key={value} className={styles.radio}>
              <input type="radio" name="reason" value={value} required />
              {label}
            </label>
          ))}
        </fieldset>
        {error === "reason" && <p className={forms.error}>Pick a reason.</p>}
        <label className={forms.field}>
          <span className={forms.label}>Tell us more (optional)</span>
          <textarea name="note" rows={3} className={`${forms.input} ${styles.textarea}`} />
        </label>
        <label className={styles.radio}>
          <input type="checkbox" name="block" />
          <strong>Also block them</strong>
        </label>
        <div className={tables.dialogActions}>
          <Link href={close} scroll={false} className={`${forms.bigButton} ${forms.bigButtonQuiet}`}>
            Cancel
          </Link>
          <button type="submit" className={`${forms.bigButton} ${forms.bigButtonPrimary}`}>
            Send report
          </button>
        </div>
      </form>
    </Dialog>
  );
}
