// ─────────────────────────────────────────────────────────────
// FILE DROP: upload box for verification documents
// File: src/components/auth/FileDrop.tsx
//
//   - drag files onto the box, or click it to choose files
//   - each file is checked (type and size, lib/validation.ts)
//   - chosen files are listed with a Remove button
// The files stay in the browser for now. A later step uploads them to
// Amplify Storage (S3), where only Tezera admins can read them.
// ─────────────────────────────────────────────────────────────

"use client";

import { useState } from "react";

import Button from "./Button";
import styles from "./FileDrop.module.css";
import { MAX_FILE_MB, checkFile, formatFileSize } from "@/lib/validation";

// PDF and photos (MIME type names).
const ACCEPTED = ["application/pdf", "image/jpeg", "image/png"];

type FileDropProps = {
  id: string;
  title: string;                      // e.g. "Business registration certificate"
  hint: string;
  files: File[];                      // the parent keeps the list in its state
  onChange: (files: File[]) => void;  // called with the new list
  error?: string;                     // e.g. "Add this document."
};

export default function FileDrop({ id, title, hint, files, onChange, error }: FileDropProps) {
  const [dragging, setDragging] = useState(false); // a file is over the box
  const [fileError, setFileError] = useState("");  // a rejected file

  // Add new files to the list, skipping any that fail the checks.
  // FileList (what the browser gives) isn't a normal array, so
  // Array.from turns it into one we can loop over.
  function addFiles(list: FileList | null) {
    if (!list) return;
    const good: File[] = [];
    const problems: string[] = [];
    for (const file of Array.from(list)) {
      const problem = checkFile(file, ACCEPTED);
      if (problem) problems.push(problem);
      else good.push(file);
    }
    setFileError(problems.join(" "));
    if (good.length > 0) onChange([...files, ...good]);
  }

  function removeFile(index: number) {
    // Keep every file except the one at this position (_ = unused item).
    onChange(files.filter((_, i) => i !== index));
  }

  const message = error || fileError;

  return (
    <div className={styles.wrap}>
      <h3 className={styles.title} id={`${id}-title`}>
        {title}
      </h3>

      {/* DRAG AND DROP: the browser fires these events on the box.
          preventDefault() in onDragOver is what allows a drop at all;
          without it the browser would just open the file. */}
      <label
        className={`${styles.zone} ${dragging ? styles.dragging : ""}`}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          addFiles(e.dataTransfer.files); // the dropped files
        }}
      >
        <span className={styles.zoneTitle}>Drag files here or click to choose</span>
        <span className={styles.zoneHint}>
          {hint} PDF, JPG or PNG, up to {MAX_FILE_MB} MB each.
        </span>
        <input
          id={id}
          type="file"
          multiple                          // allow several, e.g. NIC front and back
          accept={ACCEPTED.join(",")}       // the picker only shows these kinds
          className={styles.input}
          aria-labelledby={`${id}-title`}
          aria-describedby={message ? `${id}-error` : undefined}
          onChange={(e) => {
            addFiles(e.target.files);
            e.target.value = ""; // reset, so choosing the same file again still fires
          }}
        />
      </label>

      {files.length > 0 && (
        <ul className={styles.files}>
          {files.map((file, i) => (
            <li key={`${file.name}-${i}`} className={styles.file}>
              <span className={styles.fileText}>
                <span className={styles.fileName}>{file.name}</span>
                <span className={styles.fileSize}>{formatFileSize(file.size)}</span>
              </span>
              <Button variant="outline" size="small" block={false} onClick={() => removeFile(i)}>
                Remove
              </Button>
            </li>
          ))}
        </ul>
      )}

      {message && (
        <p id={`${id}-error`} className={styles.error} role="alert">
          {message}
        </p>
      )}
    </div>
  );
}
