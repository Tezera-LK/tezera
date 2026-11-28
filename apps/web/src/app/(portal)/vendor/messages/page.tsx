import type { Metadata } from "next";
import Link from "next/link";
import Thumb from "@/components/portal/Thumb";
import Dialog from "@/components/portal/events/Dialog";
import forms from "@/components/portal/forms.module.css";
import hiring from "@/components/portal/hiring/Hiring.module.css";
import AttachPicker from "@/components/portal/people/AttachPicker";
import styles from "@/components/portal/people/People.module.css";
import shell from "@/components/portal/PortalShell.module.css";
import Choice from "@/components/portal/provider/Choice";
import tables from "@/components/portal/tables.module.css";
import ui from "@/components/portal/ui.module.css";
import EmptyState from "@/components/states/EmptyState";
import { requireRole } from "@/lib/auth/session";
import { byLatestMessage, findConversation, getProviderState, saveConversation } from "@/lib/data/provider";
import type { ProviderConversation, ProviderState } from "@/lib/data/provider-types";
import { daysFrom, formatDayMonth, formatTime, formatWhen } from "@/lib/format";
import { lkr } from "@/lib/provider";
import { routes } from "@/lib/routes";
import { blockConversation, reportConversation, sendMessage } from "./actions";

export const metadata: Metadata = { title: "Messages" };

const TEXT = {
  title: "Messages",
  lede: "Chat with organisers. Send photos and files like briefs and quotes.",
  search: "Search chats",
  none: "No conversations yet. Organisers who contact you show up here.",
  noMatch: "No chats match.",
  pick: "Pick a conversation to read it.",
  newChat: "Say hello. Your first message starts the conversation.",
  viewBooking: "View booking",
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
  quote: (amount: string) => `Quote · ${amount}`,
  quoteSub: (pct: number) => `${pct}% deposit · sent via request`,
  emptyTitle: "No messages yet",
  emptyText: "Conversations with organisers show up here.",
  // dialogs
  close: "Close",
  attachTitle: "Send a photo or file",
  attachSub: (name: string) => `To ${name}`,
  blockTitle: (name: string) => `Block ${name}?`,
  blockText: "They will not be able to message you or send booking requests. Your current booking with them stays, and you can still see it.",
  blockNote: "They are not told. You can unblock them in Settings.",
  cancel: "Cancel",
  reportTitle: (name: string) => `Report ${name}`,
  reportSub: "An admin reviews the chat and booking history",
  reasons: ["Scam or fake event", "Harassment or abuse", "Asked to pay outside agreed terms", "Something else"],
  details: "Details (optional)",
  alsoBlock: "Also block them",
  reasonError: "Pick a reason.",
  sendReport: "Send report",
} as const;

type Query = { c?: string; to?: string; q?: string; dialog?: string; error?: string };

// Messages for vendors and freelancers (Figma V22, F22): chats with organisers on the left, the open
// one on the right. ?to=<organiser> opens or starts the chat with them. Attach (V90), Block (V91)
// and Report (V92) open as dialogs with ?dialog=.
export default async function ProviderMessagesPage({ searchParams }: { searchParams: Promise<Query> }) {
  const session = await requireRole("vendor", "freelancer");
  const state = await getProviderState(session);
  const query = await searchParams;
  if (!state) return <EmptyState title={TEXT.emptyTitle} description={TEXT.emptyText} />;

  const words = (query.q ?? "").trim().toLowerCase();
  const all = [...state.conversations].sort(byLatestMessage);
  // blocked organisers leave the list; Settings lists them (V103), and their chat still opens
  const shown = all.filter((c) => !c.blocked || c.id === query.c).filter((c) => !words || c.name.toLowerCase().includes(words));

  let current: ProviderConversation | null = null;
  let key = "";
  if (query.c) current = findConversation(state, query.c);
  else if (query.to) current = findConversation(state, `new:${query.to}`);
  else current = shown[0] ?? null;
  // a chat not saved yet is addressed by its organiser until the first message
  if (current) key = state.conversations.some((c) => c.id === current?.id) ? current.id : `new:${current.organiserId}`;
  // opening a conversation reads it
  if (current && current.unread > 0) await saveConversation(session, { ...current, unread: 0 });
  const now = new Date();
  const base = `${routes.vendorArea.messages}?c=${encodeURIComponent(key)}`;
  const booking = current ? state.bookings.find((b) => b.organiserId === current?.organiserId && !b.cancelled) : undefined;
  const quote = current ? state.requests.find((r) => r.organiserId === current?.organiserId && r.quote && r.status === "quoted")?.quote : undefined;

  return (
    <>
      <header className={hiring.pageHeadText}>
        <h1 className={hiring.pageTitle}>{TEXT.title}</h1>
        <p className={hiring.lede}>{TEXT.lede}</p>
      </header>
      <div className={styles.messages}>
        <div className={styles.listColumn}>
          <form action={routes.vendorArea.messages} role="search">
            <input type="search" name="q" defaultValue={query.q ?? ""} placeholder={TEXT.search} aria-label={TEXT.search} className={forms.input} />
          </form>
          {shown.length === 0 ? (
            <p className={ui.muted}>{all.length === 0 ? TEXT.none : TEXT.noMatch}</p>
          ) : (
            <ul className={styles.conversations}>
              {shown.map((c) => {
                const last = c.messages.at(-1);
                return (
                  <li key={c.id}>
                    <Link href={`${routes.vendorArea.messages}?c=${encodeURIComponent(c.id)}`} className={`${styles.conversation} ${c.id === current?.id ? styles.conversationOpen : ""}`}>
                      <Thumb size={36} shape="round" />
                      <span className={ui.rowText}>
                        <span className={ui.rowTitle}>{verifiedName(state, c)}</span>
                        <span className={styles.small}>{last ? (last.file && !last.text ? `Sent ${last.file.name}` : last.text) : ""}</span>
                      </span>
                      {c.unread > 0 ? (
                        <span className={styles.unread} aria-label={TEXT.unread(c.unread)}>
                          {c.unread}
                        </span>
                      ) : (
                        last && <span className={styles.small}>{formatWhen(last.at, now, true)}</span>
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
              <Thumb size={40} shape="round" />
              <span className={ui.rowText}>
                <span className={ui.rowTitle}>{verifiedName(state, current)}</span>
                <span className={styles.small}>{current.detail}</span>
              </span>
              <span className={styles.chatButtons}>
                {booking && (
                  <Link href={routes.vendorArea.booking(booking.id)} className={`${ui.rowButton} ${styles.greenButton}`}>
                    {TEXT.viewBooking}
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
                const prev = current.messages[i - 1];
                const newDay = !prev || daysFrom(new Date(prev.at), m.at) !== 0;
                return (
                  <li key={m.id} className={styles.bubbleItem}>
                    {newDay && <p className={styles.day}>{daysFrom(now, m.at) === 0 ? TEXT.today : formatDayMonth(m.at)}</p>}
                    <div className={`${styles.bubble} ${m.mine ? styles.mine : ""}`}>
                      {m.text && <span>{m.text}</span>}
                      {m.file && (
                        <span className={styles.file}>
                          <span className={styles.attachIcon} aria-hidden="true" />
                          <span className={ui.rowText}>
                            <span className={ui.rowTitle}>{m.file.name}</span>
                            <span className={styles.small}>{m.file.label}</span>
                          </span>
                        </span>
                      )}
                      <span className={shell.srOnly}>{`${m.mine ? "You" : current.name}, ${formatTime(m.at)}`}</span>
                    </div>
                  </li>
                );
              })}
              {quote && (
                <li className={styles.bubbleItem}>
                  <div className={`${styles.bubble} ${styles.mine}`}>
                    <span className={ui.rowTitle}>{TEXT.quote(lkr(quote.priceLkr))}</span>
                    <span className={styles.small}>{TEXT.quoteSub(quote.payments[0]?.percent ?? 0)}</span>
                  </div>
                </li>
              )}
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
        <Dialog title={TEXT.attachTitle} subtitle={TEXT.attachSub(current.name)} closeHref={base} closeLabel={TEXT.close} narrow>
          <AttachPicker action={sendMessage.bind(null, key)} closeHref={base} />
        </Dialog>
      )}
      {current && query.dialog === "block" && !current.blocked && (
        <Dialog title={TEXT.blockTitle(current.name)} closeHref={base} closeLabel={TEXT.close} narrow>
          <p className={tables.panelText}>{TEXT.blockText}</p>
          <p className={tables.panelText}>{TEXT.blockNote}</p>
          <form action={blockConversation.bind(null, current.id)} className={tables.dialogActions}>
            <Link href={base} scroll={false} className={`${forms.bigButton} ${forms.bigButtonQuiet}`}>
              {TEXT.cancel}
            </Link>
            <button type="submit" className={`${forms.bigButton} ${forms.bigButtonDanger}`}>
              {TEXT.block}
            </button>
          </form>
        </Dialog>
      )}
      {current && query.dialog === "report" && !current.reported && (
        <Dialog title={TEXT.reportTitle(current.name)} subtitle={TEXT.reportSub} closeHref={base} closeLabel={TEXT.close} narrow>
          <form action={reportConversation.bind(null, current.id)} className={tables.dialogForm}>
            <fieldset className={hiring.plainFieldset}>
              <legend className={shell.srOnly}>{TEXT.report}</legend>
              {TEXT.reasons.map((reason) => (
                <Choice key={reason} type="radio" name="reason" value={reason} title={reason} required />
              ))}
            </fieldset>
            {query.error === "reason" && <p className={forms.error}>{TEXT.reasonError}</p>}
            <label className={forms.field}>
              <span className={forms.label}>{TEXT.details}</span>
              <textarea name="note" rows={3} className={forms.input} />
            </label>
            <Choice type="checkbox" name="block" value="yes" title={TEXT.alsoBlock} />
            <div className={tables.dialogActions}>
              <Link href={base} scroll={false} className={`${forms.bigButton} ${forms.bigButtonQuiet}`}>
                {TEXT.cancel}
              </Link>
              <button type="submit" className={`${forms.bigButton} ${forms.bigButtonPrimary}`}>
                {TEXT.sendReport}
              </button>
            </div>
          </form>
        </Dialog>
      )}
    </>
  );
}

// "Agastra Events ✓" for a verified organiser
function verifiedName(state: ProviderState, c: ProviderConversation): string {
  return state.organisers.find((o) => o.id === c.organiserId)?.verified ? `${c.name} ✓` : c.name;
}
