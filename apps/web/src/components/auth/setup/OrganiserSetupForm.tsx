// ─────────────────────────────────────────────────────────────
// ORGANISER SETUP: "Set up your organiser profile" (design O04)
// File: src/components/auth/setup/OrganiserSetupForm.tsx
//
// What people see on the organiser's profile and events (PRD AC-02).
// Continue -> /organiser/verification (documents for the Verified badge).
// The profile isn't saved yet (that needs our API, and the logo needs
// Amplify Storage); Continue marks setup as "profile" and Skip as "done",
// so the next log in knows where to send them.
// ─────────────────────────────────────────────────────────────

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import Button from "../Button";
import Stepper from "../Stepper";
import TextAreaField from "../TextAreaField";
import TextField from "../TextField";
import formStyles from "../Form.module.css";
import styles from "./Setup.module.css";
import { checkFile, isEmail, parseIdentifier } from "@/lib/validation";
import { ROLE_INFO } from "@/lib/roles";
import { authErrorMessage } from "@/lib/authErrors";
import { routes } from "@/lib/routes";
import { saveSetupStage } from "@/lib/session";

const LOGO_TYPES = ["image/png", "image/jpeg"];

type Errors = {
  name?: string;
  logo?: string;
  phone?: string;
  email?: string;
  form?: string;
};

export default function OrganiserSetupForm() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [logo, setLogo] = useState<string | null>(null); // preview picture, or null
  const [description, setDescription] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [errors, setErrors] = useState<Errors>({});
  const [busy, setBusy] = useState(false);

  // Save the setup stage, then move on. Shared by Continue and Skip.
  async function moveOn(stage: "profile" | "done", path: string) {
    setBusy(true);
    try {
      await saveSetupStage(stage);
      router.push(path);
    } catch (err) {
      setErrors({ form: authErrorMessage(err) });
      setBusy(false);
    }
  }

  // A logo file was chosen.
  function handleLogo(event: React.ChangeEvent<HTMLInputElement>) {
    // event.target.files is the list of chosen files; ?.[0] = the first
    // one, if there is one.
    const file = event.target.files?.[0];
    if (!file) return;

    const problem = checkFile(file, LOGO_TYPES);
    if (problem) {
      setErrors({ ...errors, logo: problem }); // "...errors" keeps the other errors
      return;
    }

    // FileReader turns the file into a "data URL" (the picture as text)
    // that an <img> can show straight away, before anything is uploaded.
    const reader = new FileReader();
    reader.onload = () => setLogo(reader.result as string);
    reader.readAsDataURL(file);
    setErrors({ ...errors, logo: undefined });
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const found: Errors = {};

    if (name.trim() === "") found.name = "Enter the name people will see.";
    // Contact details are optional, but must look right if given.
    // parseIdentifier(...)?.kind = "phone" only if it's a phone number.
    if (phone && parseIdentifier(phone)?.kind !== "phone") found.phone = "Enter a phone number like 077 123 4567.";
    if (email && !isEmail(email)) found.email = "Enter an email address like hello@agastra.lk.";

    setErrors(found);
    if (Object.keys(found).length > 0) return;

    // TODO (API step): save the profile and upload the logo.
    await moveOn("profile", "/organiser/verification");
  }

  return (
    <div>
      <Stepper steps={ROLE_INFO.organiser.steps} current={1} />
      <h2 className={formStyles.title}>Set up your organiser profile</h2>
      <p className={formStyles.subtitle}>People see this on your profile and on your events.</p>

      <form className={formStyles.form} onSubmit={handleSubmit} noValidate>
        <TextField
          id="org-name"
          label="Organiser name"
          placeholder="Agastra Events"
          autoComplete="organization"
          value={name}
          onChange={(e) => setName(e.target.value)}
          error={errors.name}
        />

        <div className={formStyles.field}>
          <span className={formStyles.label}>Logo</span>
          <div className={styles.logoRow}>
            {/* Show the chosen logo, or an empty square. */}
            {logo ? (
              // A plain <img> is fine for a local preview. (Next.js's <Image>
              // is for pictures served from a web address.)
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logo} alt="Your logo" className={styles.logoPreview} />
            ) : (
              <span className={styles.logoPreview} aria-hidden="true" />
            )}
            {/* The hidden file input sits inside the label, so clicking the
                styled label opens the file picker. */}
            <label className={`${formStyles.button} ${formStyles.outline} ${formStyles.small}`}>
              Upload logo
              <input type="file" accept={LOGO_TYPES.join(",")} className={styles.hiddenInput} onChange={handleLogo} />
            </label>
            <span className={formStyles.hint}>PNG or JPG. A square image works best.</span>
          </div>
          {errors.logo && (
            <p className={formStyles.error} role="alert">
              {errors.logo}
            </p>
          )}
        </div>

        <TextAreaField
          id="org-description"
          label="Description"
          placeholder="Concerts and music festivals in Colombo."
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />

        <div className={formStyles.row}>
          <TextField
            id="org-phone"
            label="Contact phone"
            type="tel"
            autoComplete="tel"
            placeholder="077 123 4567"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            error={errors.phone}
          />
          <TextField
            id="org-email"
            label="Contact email"
            type="email"
            autoComplete="email"
            placeholder="hello@agastra.lk"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            error={errors.email}
          />
        </div>

        <p className={formStyles.note}>
          Next, get verified. An admin checks your documents. Until then you can&apos;t open stall slots, post jobs
          or send booking requests.
        </p>

        {errors.form && (
          <p className={formStyles.error} role="alert">
            {errors.form}
          </p>
        )}

        <div className={formStyles.actions}>
          {/* Skip: finish later from the home page. */}
          <Button variant="outline" onClick={() => moveOn("done", routes.dashboard)} disabled={busy}>
            Skip for now
          </Button>
          <Button type="submit" disabled={busy}>
            Continue
          </Button>
        </div>
      </form>
    </div>
  );
}
