"use client";

import { useState } from "react";
import forms from "../forms.module.css";
import shell from "../PortalShell.module.css";
import ui from "../ui.module.css";
import styles from "./Verification.module.css";

const TEXT = {
  drag: "Drag files here or choose them",
  hint: "Business registration, NIC or passport · PDF or JPG",
  clearer: "Upload a clearer copy",
  clearerHint: "PDF or JPG · the whole page must show",
  picked: "Chosen today",
  kind: (name: string) => `What ${name} is`,
  kinds: ["Business registration", "NIC or passport", "Other"],
  remove: "Remove",
  removeWho: (name: string) => `Remove ${name}`,
  admins: "Only Tezera admins can see these documents.",
  submit: "Submit for review",
  again: "Submit again",
} as const;

// The upload part of Verification (Figma O28, and "Upload a clearer copy" on O39). Files are
// chosen and listed here; until storage is connected only their names and kinds are sent.
export default function DocumentPicker({ action, again }: { action: (form: FormData) => Promise<void>; again: boolean }) {
  const [docs, setDocs] = useState<{ key: number; name: string; kind: string }[]>([]);

  function add(files: FileList | null) {
    if (!files) return;
    const start = Date.now();
    setDocs((list) => [
      ...list,
      ...[...files].map((f, i) => ({ key: start + i, name: f.name, kind: f.type === "application/pdf" ? TEXT.kinds[0] : TEXT.kinds[1] })),
    ]);
  }

  return (
    <form action={action} className={styles.form}>
      <label className={styles.drop}>
        <input type="file" multiple accept="application/pdf,image/jpeg,image/png" className={shell.srOnly} onChange={(e) => add(e.target.files)} />
        <span className={styles.dropIcon} aria-hidden="true" />
        <span className={ui.rowTitle}>{again ? TEXT.clearer : TEXT.drag}</span>
        <span className={styles.hint}>{again ? TEXT.clearerHint : TEXT.hint}</span>
      </label>
      {docs.map((d) => (
        <div key={d.key} className={styles.docRow}>
          <span className={styles.docIcon} aria-hidden="true" />
          <input type="hidden" name="docName" value={d.name} />
          <span className={ui.rowText}>
            <span className={ui.rowTitle}>{d.name}</span>
            <span className={styles.hint}>{TEXT.picked}</span>
          </span>
          <select
            name="docKind"
            value={d.kind}
            aria-label={TEXT.kind(d.name)}
            onChange={(e) => setDocs((list) => list.map((x) => (x.key === d.key ? { ...x, kind: e.target.value } : x)))}
            className={`${forms.input} ${styles.kindSelect}`}
          >
            {TEXT.kinds.map((k) => (
              <option key={k}>{k}</option>
            ))}
          </select>
          <button type="button" className={`${ui.rowButton} ${styles.plain}`} aria-label={TEXT.removeWho(d.name)} onClick={() => setDocs((list) => list.filter((x) => x.key !== d.key))}>
            {TEXT.remove}
          </button>
        </div>
      ))}
      {!again && <p className={styles.hint}>{TEXT.admins}</p>}
      <button type="submit" className={`${forms.bigButton} ${forms.bigButtonPrimary}`} disabled={docs.length === 0}>
        {again ? TEXT.again : TEXT.submit}
      </button>
    </form>
  );
}
