"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import forms from "../forms.module.css";
import shell from "../PortalShell.module.css";
import tables from "../tables.module.css";
import ui from "../ui.module.css";
import styles from "./People.module.css";

const TEXT = {
  photo: "Photo or video",
  document: "Document",
  drop: "Drop a file here",
  hint: "PDF, JPG, PNG or MP4 · up to 25 MB",
  ready: (size: string) => `${size} · ready`,
  tooBig: "That file is over 25 MB.",
  remove: "Remove",
  cancel: "Cancel",
  send: "Send file",
} as const;

const MAX_BYTES = 25 * 1024 * 1024;

// "310 KB", "4 MB"
const size = (bytes: number) => (bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${Math.round(bytes / 1024 / 1024)} MB`);

// The inside of "Attach" (Figma O90): pick a photo, video or document, see it listed, send it.
// Only the file's name is sent until storage is connected (EN-03).
export default function AttachPicker({ action, closeHref }: { action: (form: FormData) => Promise<void>; closeHref: string }) {
  const [file, setFile] = useState<File | null>(null);
  const [accept, setAccept] = useState("application/pdf,image/jpeg,image/png,video/mp4");
  const inputRef = useRef<HTMLInputElement>(null);
  const tooBig = file !== null && file.size > MAX_BYTES;

  // the two tiles narrow the picker to media or documents, then open it
  function pick(kind: string) {
    setAccept(kind);
    // the accept list has to be on the input before the picker opens
    setTimeout(() => inputRef.current?.click(), 0);
  }

  return (
    <form action={action} className={tables.dialogForm}>
      <input type="hidden" name="fileName" value={tooBig ? "" : (file?.name ?? "")} />
      <div className={styles.attachKinds}>
        <button type="button" className={styles.attachKind} onClick={() => pick("image/jpeg,image/png,video/mp4")}>
          <span className={styles.attachIcon} aria-hidden="true" />
          {TEXT.photo}
        </button>
        <button type="button" className={styles.attachKind} onClick={() => pick("application/pdf")}>
          <span className={styles.attachIcon} aria-hidden="true" />
          {TEXT.document}
        </button>
      </div>
      <label className={styles.drop}>
        <input ref={inputRef} type="file" accept={accept} className={shell.srOnly} onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
        <span className={styles.attachIcon} aria-hidden="true" />
        <span className={ui.rowTitle}>{TEXT.drop}</span>
        <span className={styles.small}>{TEXT.hint}</span>
      </label>
      {file && (
        <div className={styles.fileRow}>
          <span className={styles.attachIcon} aria-hidden="true" />
          <span className={ui.rowText}>
            <span className={ui.rowTitle}>{file.name}</span>
            <span className={styles.small}>{tooBig ? TEXT.tooBig : TEXT.ready(size(file.size))}</span>
          </span>
          <button
            type="button"
            className={`${ui.rowButton} ${styles.plain}`}
            onClick={() => {
              setFile(null);
              if (inputRef.current) inputRef.current.value = "";
            }}
          >
            {TEXT.remove}
          </button>
        </div>
      )}
      <div className={tables.dialogActions}>
        <Link href={closeHref} scroll={false} className={`${forms.bigButton} ${forms.bigButtonQuiet}`}>
          {TEXT.cancel}
        </Link>
        <button type="submit" className={`${forms.bigButton} ${forms.bigButtonPrimary}`} disabled={!file || tooBig}>
          {TEXT.send}
        </button>
      </div>
    </form>
  );
}
