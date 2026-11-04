// ─────────────────────────────────────────────────────────────
// VERIFICATION FORM: documents for the Verified badge
// File: src/components/auth/VerificationForm.tsx
// Designs: organiser O28, vendor V18. PRD AC-08 (organisers), AC-09
// (vendors and freelancers).
//
// Which documents are needed comes from lib/roles.ts:
//   organiser:  business registration (company) OR NIC (individual)
//   vendor:     business registration AND the owner's NIC
//   freelancer: NIC
// Submitting shows "Documents sent" and marks setup as "done", so the
// next log in goes straight home. The files aren't uploaded yet (that
// needs Amplify Storage); later an admin approves or rejects them.
// ─────────────────────────────────────────────────────────────

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import Button from "./Button";
import FileDrop from "./FileDrop";
import Stepper from "./Stepper";
import formStyles from "./Form.module.css";
import { ROLE_INFO, type Role } from "@/lib/roles";
import { authErrorMessage } from "@/lib/authErrors";
import { saveSetupStage } from "@/lib/session";

export default function VerificationForm({ role }: { role: Role }) {
  const router = useRouter();
  const info = ROLE_INFO[role];
  // The page only shows this form for roles that are verified, but
  // TypeScript can't know that, so "!" says "verification is there".
  const verification = info.verification!;

  // Which way of verifying (organisers choose; others have one option).
  const [optionId, setOptionId] = useState(verification.options[0].id);
  // The chosen files for each document, keyed by the document's label:
  //   { "Business registration certificate": [File, ...], ... }
  // Record<string, File[]> = an object whose values are lists of files.
  const [files, setFiles] = useState<Record<string, File[]>>({});
  const [missing, setMissing] = useState<string[]>([]); // documents with no file
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  // .find returns the first option whose id matches (always one here).
  const option = verification.options.find((o) => o.id === optionId)!;

  // Update the files for one document, keeping the others.
  // [label]: list is a COMPUTED KEY: the key's name comes from a variable.
  function setFilesFor(label: string, list: File[]) {
    setFiles({ ...files, [label]: list });
    setMissing(missing.filter((m) => m !== label));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    // Every document for the chosen option needs at least one file.
    // (files[d.label]?.length ?? 0) = how many files, or 0 if none yet.
    const empty = option.documents.filter((d) => (files[d.label]?.length ?? 0) === 0).map((d) => d.label);
    setMissing(empty);
    if (empty.length > 0) return;

    setBusy(true);
    try {
      // TODO (storage step): upload the files to Amplify Storage and create
      // a verification request for an admin (PRD AD-01).
      await saveSetupStage("done");
      setSubmitted(true);
    } catch (err) {
      setError(authErrorMessage(err));
    }
    setBusy(false);
  }

  if (submitted) {
    return (
      <div>
        <Stepper steps={info.steps} current={info.steps.length - 1} />
        <h2 className={formStyles.title}>Documents sent</h2>
        <p className={formStyles.subtitle}>
          An admin will check them, usually within 2 working days (proposed). We&apos;ll let you know either way.
        </p>
        <div className={formStyles.form}>
          <div className={formStyles.card}>
            <h3 className={formStyles.cardTitle}>Until you&apos;re verified</h3>
            <p className={formStyles.hint}>You can build your profile and look around. These unlock after approval:</p>
            <ul>
              {verification.lockedUntilVerified.map((thing) => (
                <li key={thing}>{thing}</li>
              ))}
            </ul>
          </div>
          <Button onClick={() => router.push(`/${role}/home`)}>Continue</Button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <Stepper steps={info.steps} current={info.steps.length - 1} />
      <h2 className={formStyles.title}>Get verified</h2>
      <p className={formStyles.subtitle}>
        An admin checks your documents before you get the Verified badge. Only Tezera admins can see them.
      </p>

      <form className={formStyles.form} onSubmit={handleSubmit} noValidate>
        {/* Only shown when there's a choice (organisers). */}
        {verification.options.length > 1 && (
          <fieldset className={formStyles.fieldset}>
            <legend className={formStyles.sectionTitle}>
              How do you run events?
            </legend>
            {verification.options.map((o) => (
              <label key={o.id} className={formStyles.checkbox}>
                <input
                  type="radio"
                  name="verify-as"
                  checked={optionId === o.id}
                  onChange={() => {
                    setOptionId(o.id);
                    setMissing([]);
                  }}
                />
                {o.label}
              </label>
            ))}
          </fieldset>
        )}

        {/* One upload box per document for the chosen option. */}
        {option.documents.map((doc, i) => (
          <FileDrop
            key={doc.label}
            id={`doc-${i}`}
            title={doc.label}
            hint={doc.hint}
            files={files[doc.label] ?? []}
            onChange={(list) => setFilesFor(doc.label, list)}
            error={missing.includes(doc.label) ? "Add this document." : undefined}
          />
        ))}

        <p className={formStyles.note}>
          Until you&apos;re approved: {verification.lockedUntilVerified.join(", ").toLowerCase()} stay locked.
        </p>

        {error && (
          <p className={formStyles.error} role="alert">
            {error}
          </p>
        )}

        <Button type="submit" disabled={busy}>
          {busy ? "Sending…" : "Submit for review"}
        </Button>
      </form>
    </div>
  );
}
