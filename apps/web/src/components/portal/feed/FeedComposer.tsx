"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import forms from "../forms.module.css";
import shell from "../PortalShell.module.css";
import ui from "../ui.module.css";
import styles from "./Feed.module.css";

const TEXT = {
  newPost: "New post",
  reel: "Reel",
  image: "Image or poster",
  kind: "What to post",
  addImage: "Add an image or poster",
  addReel: "Add a reel",
  drag: "Drag a file here or choose one",
  change: "Choose another file",
  caption: "Caption",
  captionImage: "Line-up reveal! Who are you most excited to see?",
  captionReel: "Behind the scenes: the stage build",
  event: "Link to an event",
  noEvent: "No event",
  eventHint: "The post links to the event page.",
  reelHint: "Vertical video, up to 60 seconds and 100 MB.",
  cover: "Cover frame",
  coverAt: (s: number) => `Frame at 0:${String(s).padStart(2, "0")}`,
  post: "Post",
  postReel: "Post when ready",
  cancel: "Cancel",
  size: (bytes: number) => `${Math.max(1, Math.round(bytes / 1024 / 1024))} MB`,
  length: (s: number) => `0:${String(Math.round(s)).padStart(2, "0")}`,
  storage: "Uploading starts once storage is connected; for now the post keeps the file's name.",
} as const;

const ERRORS: Record<string, string> = {
  file: "Choose a file to post.",
  reel: "A reel is a video of up to 60 seconds and 100 MB.",
  image: "Choose an image: JPG, PNG or WebP.",
  caption: "Add a caption.",
  save: "That didn't post. Saving needs the backend (EN-03).",
};

type Props = {
  action: (form: FormData) => Promise<void>;
  reel: boolean;
  events: { id: string; title: string }[];
  // the switch between the two kinds of post: links, so it works without JavaScript
  reelHref: string;
  imageHref: string;
  error?: string;
};

// "New post" on Feed and promotion (Figma O26 for an image, O99 for a reel). The chosen file is
// previewed here in the browser and never sent: only its name, type, size and length go with
// the form (see app/(portal)/organiser/feed/actions.ts).
export default function FeedComposer({ action, reel, events, reelHref, imageHref, error }: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [seconds, setSeconds] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const urlRef = useRef<string | null>(null);

  // a fresh preview address for each file; the old one is released so it doesn't hold memory
  function choose(next: File | null) {
    if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    urlRef.current = next ? URL.createObjectURL(next) : null;
    setFile(next);
    setPreview(urlRef.current);
    setSeconds(0);
  }

  // and the last one when the composer goes away
  useEffect(() => () => {
    if (urlRef.current) URL.revokeObjectURL(urlRef.current);
  }, []);

  const accept = reel ? "video/*" : "image/png,image/jpeg,image/webp";
  const message = error ? ERRORS[error] : undefined;

  return (
    <section className={styles.composer} aria-labelledby="new-post">
      <div className={styles.composerHead}>
        <h2 id="new-post" className={styles.cardTitle}>
          {TEXT.newPost}
        </h2>
        <nav className={styles.kinds} aria-label={TEXT.kind}>
          <Link href={reelHref} className={styles.kind} aria-current={reel ? "page" : undefined} scroll={false}>
            {TEXT.reel}
          </Link>
          <Link href={imageHref} className={styles.kind} aria-current={!reel ? "page" : undefined} scroll={false}>
            {TEXT.image}
          </Link>
        </nav>
      </div>

      <form action={action} className={reel ? styles.reelForm : styles.imageForm}>
        <input type="hidden" name="kind" value={reel ? "reel" : "image"} />
        <input type="hidden" name="fileName" value={file?.name ?? ""} />
        <input type="hidden" name="fileType" value={file?.type ?? ""} />
        <input type="hidden" name="fileSize" value={file?.size ?? ""} />
        <input type="hidden" name="duration" value={seconds || ""} />

        {/* the drop zone is the file input's label, so clicking anywhere on it opens the picker */}
        <label className={reel ? styles.reelDrop : styles.drop}>
          <input
            ref={inputRef}
            type="file"
            accept={accept}
            className={shell.srOnly}
            onChange={(e) => choose(e.target.files?.[0] ?? null)}
          />
          {preview && file ? (
            reel ? (
              <>
                <video
                  src={preview}
                  muted
                  playsInline
                  className={styles.previewMedia}
                  onLoadedMetadata={(e) => setSeconds(e.currentTarget.duration)}
                />
                {seconds > 0 && <span className={styles.lengthTag}>{TEXT.length(seconds)}</span>}
              </>
            ) : (
              // a blob: preview of a local file; next/image can't optimise it
              // eslint-disable-next-line @next/next/no-img-element
              <img src={preview} alt="" className={styles.previewMedia} />
            )
          ) : (
            <span className={styles.dropText}>
              <span className={styles.dropIcon} aria-hidden="true" />
              <span className={ui.rowTitle}>{reel ? TEXT.addReel : TEXT.addImage}</span>
              <span className={styles.dropHint}>{TEXT.drag}</span>
            </span>
          )}
        </label>

        <div className={styles.fields}>
          {reel && file && (
            <div className={styles.fileRow}>
              <span className={styles.fileIcon} aria-hidden="true" />
              <span className={ui.rowText}>
                <span className={ui.rowTitle}>{file.name}</span>
                <span className={styles.dropHint}>{[TEXT.size(file.size), seconds ? TEXT.length(seconds) : ""].filter(Boolean).join(" · ")}</span>
              </span>
            </div>
          )}
          {reel && <p className={forms.hint}>{TEXT.reelHint}</p>}
          <label className={forms.field}>
            <span className={forms.label}>{TEXT.caption}</span>
            <input name="caption" required placeholder={reel ? TEXT.captionReel : TEXT.captionImage} className={forms.input} />
          </label>
          <label className={forms.field}>
            <span className={forms.label}>{TEXT.event}</span>
            <select name="event" defaultValue={events[0]?.id ?? ""} className={forms.input}>
              <option value="">{TEXT.noEvent}</option>
              {events.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.title}
                </option>
              ))}
            </select>
            {!reel && <span className={forms.hint}>{TEXT.eventHint}</span>}
          </label>
          {reel && (
            <label className={forms.field}>
              <span className={forms.label}>{TEXT.cover}</span>
              <select name="cover" defaultValue="3" className={forms.input}>
                {[0, 3, 5, 10, 15].map((s) => (
                  <option key={s} value={s}>
                    {TEXT.coverAt(s)}
                  </option>
                ))}
              </select>
            </label>
          )}
          {file && <p className={forms.hint}>{TEXT.storage}</p>}
          {message && (
            <p className={forms.error} role="alert">
              {message}
            </p>
          )}
          <div className={styles.composerActions}>
            {reel && file && (
              <button
                type="button"
                className={`${forms.bigButton} ${forms.bigButtonQuiet}`}
                onClick={() => {
                  choose(null);
                  if (inputRef.current) inputRef.current.value = "";
                }}
              >
                {TEXT.cancel}
              </button>
            )}
            <button type="submit" className={`${forms.bigButton} ${forms.bigButtonPrimary}`}>
              {reel ? TEXT.postReel : TEXT.post}
            </button>
          </div>
        </div>
      </form>
    </section>
  );
}
