import type { Metadata } from "next";
import Link from "next/link";
import Columns from "@/components/portal/Columns";
import MaybeLink from "@/components/portal/MaybeLink";
import Panel from "@/components/portal/Panel";
import Thumb from "@/components/portal/Thumb";
import CopyLink from "@/components/portal/events/CopyLink";
import Dialog from "@/components/portal/events/Dialog";
import { compactCount } from "@/components/portal/events/eventText";
import FeedComposer from "@/components/portal/feed/FeedComposer";
import styles from "@/components/portal/feed/Feed.module.css";
import forms from "@/components/portal/forms.module.css";
import hiring from "@/components/portal/hiring/Hiring.module.css";
import shell from "@/components/portal/PortalShell.module.css";
import tables from "@/components/portal/tables.module.css";
import ui from "@/components/portal/ui.module.css";
import { requireRole } from "@/lib/auth/session";
import { getMyOrganiserProfile, listFeedPosts, listMyEvents } from "@/lib/data/portal";
import type { FeedPost, ManagedEvent } from "@/lib/data/portal-types";
import { formatWhen } from "@/lib/format";
import { routes } from "@/lib/routes";
import { createPost, postComment, toggleComment } from "./actions";

export const metadata: Metadata = { title: "Feed and promotion" };

const TEXT = {
  title: "Feed and promotion",
  lede: "Only organisers post to the feed. Your followers see your posts in their feed.",
  posted: "Posted. Your followers see it in their feed.",
  yourPosts: "Your posts",
  filterLabel: "Which posts",
  filters: [
    ["", "All"],
    ["images", "Images"],
    ["reels", "Reels"],
  ],
  kind: { reel: "Reel", poster: "Poster", image: "Image" },
  stats: (p: FeedPost, when: string) => `${compactCount(p.likes)} likes · ${p.comments.length} comments · ${when}`,
  share: "Share",
  comments: "Comments",
  commentsFor: (caption: string) => `Comments on ${caption}`,
  none: "No posts yet. Post an image or a reel above.",
  shareTitle: "Share",
  shortLink: "Short link",
  copy: "Copy link",
  copied: "Copied",
  story: "Share to story",
  storyText: "An image sized for Instagram stories",
  make: "Make",
  shareNote: "The link shows a preview image on WhatsApp and Instagram.",
  followers: "Followers",
  seeAll: "See all",
  followersWord: "followers",
  followersText: "They see your posts in their feed and hear about your new events.",
  byEvent: "Posts by event",
  analytics: "Analytics",
  byEventLine: (posts: number, likes: number) => `${posts} ${posts === 1 ? "post" : "posts"} · ${compactCount(likes)} likes`,
  reelNote: "Reels play in the feed",
  reelNoteText: "They autoplay muted. People tap to hear sound and open the event.",
} as const;

type Query = { type?: string; show?: string; comments?: string; reply?: string; posted?: string; error?: string };

// Feed and promotion (Figma O26; ?type=reel is the reel composer, O99): post to followers, see
// your posts, and share an event. ?comments=<post> opens its comments (O94).
export default async function FeedPage({ searchParams }: { searchParams: Promise<Query> }) {
  const session = await requireRole("organiser");
  const query = await searchParams;
  const [posts, events, profile] = await Promise.all([listFeedPosts(session), listMyEvents(session), getMyOrganiserProfile(session)]);
  const now = new Date();
  const reel = query.type === "reel";
  const show = query.show === "images" || query.show === "reels" ? query.show : "";
  const shown = posts.filter((p) => (show === "reels" ? p.kind === "reel" : show === "images" ? p.kind !== "reel" : true));
  const titles = new Map(events.map((e) => [e.id, e.title]));
  // posts link to public events only
  const linkable = events.filter((e) => e.status === "published" || e.status === "postponed");
  const shareEvent = linkable.filter((e) => e.startsAt && Date.parse(e.endsAt ?? e.startsAt) > now.getTime()).sort((a, b) => (a.startsAt ?? "").localeCompare(b.startsAt ?? ""))[0];
  const commentsOn = posts.find((p) => p.id === query.comments);

  const aside = reel ? (
    <div className={hiring.notePanel}>
      <p className={hiring.notePanelTitle}>{TEXT.reelNote}</p>
      <p className={tables.panelText}>{TEXT.reelNoteText}</p>
    </div>
  ) : (
    <>
      {shareEvent && (
        <Panel title={TEXT.shareTitle}>
          <div className={hiring.whiteRow}>
            <span className={ui.rowText}>
              <span className={ui.rowTitle}>{TEXT.shortLink}</span>
              <span className={hiring.sub}>{routes.event(shareEvent.id)}</span>
            </span>
            <CopyLink path={routes.event(shareEvent.id)} label={TEXT.copy} copied={TEXT.copied} className={ui.rowButton} />
          </div>
          <div className={hiring.whiteRow}>
            <span className={ui.rowText}>
              <span className={ui.rowTitle}>{TEXT.story}</span>
              <span className={hiring.sub}>{TEXT.storyText}</span>
            </span>
            {/* making the story image is a later story (US-C15) */}
            <MaybeLink className={ui.rowButton}>{TEXT.make}</MaybeLink>
          </div>
          <p className={tables.panelText}>{TEXT.shareNote}</p>
        </Panel>
      )}
      <Panel title={TEXT.followers} link={{ label: TEXT.seeAll, href: routes.followers }}>
        <p className={styles.followerCount}>
          <span className={styles.bigNumber}>{compactCount(profile?.followers ?? 0)}</span>
          <span className={styles.small}>{TEXT.followersWord}</span>
        </p>
        <p className={tables.panelText}>{TEXT.followersText}</p>
      </Panel>
      <ByEvent posts={posts} events={events} />
    </>
  );

  return (
    <>
      <Columns aside={aside}>
        <header className={hiring.pageHeadText}>
          <h1 className={hiring.pageTitle}>{TEXT.title}</h1>
          <p className={hiring.lede}>{TEXT.lede}</p>
        </header>
        {query.posted && (
          <p className={styles.notice} role="status">
            {TEXT.posted}
          </p>
        )}
        <FeedComposer
          action={createPost}
          reel={reel}
          events={linkable.map((e) => ({ id: e.id, title: e.title }))}
          reelHref={`${routes.feed}?type=reel`}
          imageHref={routes.feed}
          error={query.error}
        />

        {!reel && (
          <section className={tables.section} aria-labelledby="posts-title">
            <div className={tables.sectionHead}>
              <h2 id="posts-title" className={ui.sectionTitle}>
                {TEXT.yourPosts}
              </h2>
              <nav className={styles.segments} aria-label={TEXT.filterLabel}>
                {TEXT.filters.map(([key, label]) => (
                  <Link key={key} href={key ? `${routes.feed}?show=${key}` : routes.feed} className={styles.segment} aria-current={show === key ? "page" : undefined}>
                    {label}
                  </Link>
                ))}
              </nav>
            </div>
            {shown.length === 0 ? (
              <p className={ui.muted}>{TEXT.none}</p>
            ) : (
              <ul className={ui.rows}>
                {shown.map((p) => (
                  <li key={p.id} className={styles.post}>
                    <span className={styles.postThumb}>
                      <Thumb size={84} shape="image" />
                      <span className={styles.kindTag}>{TEXT.kind[p.kind]}</span>
                    </span>
                    <span className={ui.rowText}>
                      {p.eventId && <span className={styles.small}>{titles.get(p.eventId)}</span>}
                      <span className={ui.rowTitle}>{p.caption}</span>
                      <span className={styles.small}>{TEXT.stats(p, formatWhen(p.postedAt, now))}</span>
                    </span>
                    <span className={styles.postButtons}>
                      {p.eventId ? (
                        <CopyLink path={routes.event(p.eventId)} label={TEXT.share} copied={TEXT.copied} className={ui.rowButton} />
                      ) : (
                        <MaybeLink className={ui.rowButton}>{TEXT.share}</MaybeLink>
                      )}
                      <Link
                        href={`${routes.feed}?comments=${encodeURIComponent(p.id)}`}
                        scroll={false}
                        className={`${ui.rowButton} ${styles.plain}`}
                        aria-label={TEXT.commentsFor(p.caption)}
                      >
                        {TEXT.comments}
                      </Link>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}
      </Columns>
      {commentsOn && <CommentsDialog post={commentsOn} reply={query.reply} error={query.error} />}
    </>
  );
}

// "Posts by event": how many posts and likes each event has, most liked first.
function ByEvent({ posts, events }: { posts: FeedPost[]; events: ManagedEvent[] }) {
  const rows = events
    .map((e) => {
      const mine = posts.filter((p) => p.eventId === e.id);
      return { event: e, count: mine.length, likes: mine.reduce((sum, p) => sum + p.likes, 0) };
    })
    .filter((r) => r.count > 0)
    .sort((a, b) => b.likes - a.likes);
  if (rows.length === 0) return null;
  return (
    <Panel title={TEXT.byEvent} link={{ label: TEXT.analytics, href: routes.analytics }}>
      {rows.map((r) => (
        <Link key={r.event.id} href={routes.manageEvent(r.event.id)} className={hiring.whiteRow}>
          <Thumb size={32} radius={4} />
          <span className={ui.rowText}>
            <span className={ui.rowTitle}>{r.event.title}</span>
            <span className={hiring.sub}>{TEXT.byEventLine(r.count, r.likes)}</span>
          </span>
        </Link>
      ))}
    </Panel>
  );
}

const DIALOG = {
  title: "Comments",
  subtitle: (caption: string, n: number) => `${caption} · ${n} ${n === 1 ? "comment" : "comments"}`,
  close: "Close",
  you: "you",
  reply: "Reply",
  replyTo: (name: string) => `Reply to ${name}`,
  hide: "Hide",
  show: "Show",
  hidden: "Hidden from everyone else",
  write: "Write a comment…",
  label: "Your comment",
  post: "Post",
  empty: "Write something first.",
  none: "No comments yet.",
} as const;

// The comments on one post (Figma O94). The organiser can reply and hide others' comments.
// ?reply=<comment> starts the reply with their name.
function CommentsDialog({ post, reply, error }: { post: FeedPost; reply?: string; error?: string }) {
  const close = routes.feed;
  const open = `${routes.feed}?comments=${encodeURIComponent(post.id)}`;
  const replyingTo = post.comments.find((c) => c.id === reply);
  return (
    <Dialog title={DIALOG.title} subtitle={DIALOG.subtitle(post.caption, post.comments.length)} closeHref={close} closeLabel={DIALOG.close} narrow>
      {post.comments.length === 0 ? (
        <p className={ui.muted}>{DIALOG.none}</p>
      ) : (
        <ul className={styles.comments}>
          {post.comments.map((c) => (
            <li key={c.id} className={`${styles.comment} ${c.mine ? styles.commentMine : ""} ${c.hidden ? styles.commentHidden : ""}`}>
              <Thumb size={32} shape="round" />
              <span className={ui.rowText}>
                <span className={ui.rowTitle}>{c.mine ? `${c.by} · ${DIALOG.you}` : c.by}</span>
                <span className={styles.small}>{c.hidden ? `${c.text} · ${DIALOG.hidden}` : c.text}</span>
              </span>
              {!c.mine && (
                <span className={styles.commentButtons}>
                  {!c.hidden && (
                    <Link href={`${open}&reply=${encodeURIComponent(c.id)}`} scroll={false} className={`${ui.rowButton} ${styles.plain}`} aria-label={DIALOG.replyTo(c.by)}>
                      {DIALOG.reply}
                    </Link>
                  )}
                  <form action={toggleComment.bind(null, post.id, c.id)}>
                    <button type="submit" className={`${ui.rowButton} ${styles.plain}`}>
                      {c.hidden ? DIALOG.show : DIALOG.hide}
                    </button>
                  </form>
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
      <form action={postComment.bind(null, post.id)} className={styles.commentForm}>
        <label className={shell.srOnly} htmlFor="comment-text">
          {DIALOG.label}
        </label>
        <input
          id="comment-text"
          name="text"
          required
          // the key resets the box when the reply target changes
          key={replyingTo?.id ?? "new"}
          defaultValue={replyingTo ? `@${replyingTo.by} ` : ""}
          placeholder={DIALOG.write}
          className={forms.input}
          aria-invalid={error === "empty" || undefined}
        />
        <button type="submit" className={`${forms.bigButton} ${forms.bigButtonPrimary}`}>
          {DIALOG.post}
        </button>
      </form>
      {error === "empty" && <p className={forms.error}>{DIALOG.empty}</p>}
    </Dialog>
  );
}
