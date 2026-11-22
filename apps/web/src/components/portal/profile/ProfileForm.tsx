"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import type { ProfileFormState } from "@/app/(portal)/organiser/profile/actions";
import type { OrganiserProfile } from "@/lib/data/portal-types";
import Columns from "../Columns";
import MaybeLink from "../MaybeLink";
import Panel from "../Panel";
import Thumb from "../Thumb";
import forms from "../forms.module.css";
import hiring from "../hiring/Hiring.module.css";
import tables from "../tables.module.css";
import ui from "../ui.module.css";
import styles from "./Profile.module.css";

const TEXT = {
  title: "Edit profile",
  lede: "This is what providers and attendees see",
  changeLogo: "Change logo",
  logoHint: "Square, at least 400 × 400",
  changeCover: "Change cover",
  name: "Organiser name",
  eventTypes: "Type of events",
  basedIn: "Based in",
  about: "About",
  count: (n: number, max: number) => `${n} of ${max} characters`,
  phone: "Phone",
  email: "Email",
  website: "Website or Instagram (optional)",
  shortLink: "Short link",
  shortLinkHint: "You can change this once every 30 days.",
  cancel: "Cancel",
  save: "Save changes",
  saving: "Saving…",
  showTitle: "Show on my profile",
  showContact: "Contact details",
  showTrackRecord: "Track record",
  showFollowers: "Follower count",
  nameTitle: "Changing your name?",
  nameText: "Your Verified badge stays. An admin checks the new name against your documents.",
} as const;

type Props = {
  action: (state: ProfileFormState, form: FormData) => Promise<ProfileFormState>;
  profile: OrganiserProfile;
  aboutMax: number;
  cancelHref: string;
};

// Edit profile (Figma O42). The "Show on my profile" switches sit in the right-hand column but
// belong to the same form, so the whole page is one form. Every field is controlled, so a save
// that comes back with errors keeps what was typed.
export default function ProfileForm({ action, profile, aboutMax, cancelHref }: Props) {
  const [state, formAction, pending] = useActionState(action, {});
  const [v, setV] = useState({
    name: profile.name,
    eventTypes: profile.eventTypes,
    basedIn: profile.basedIn,
    about: profile.about,
    phone: profile.phone,
    email: profile.email,
    website: profile.website,
    shortLink: `tezera.lk/${profile.shortLink}`,
  });
  const [show, setShow] = useState({
    showContact: profile.showContact,
    showTrackRecord: profile.showTrackRecord,
    showFollowers: profile.showFollowers,
  });
  const errors = state.errors ?? {};
  const bind = (name: keyof typeof v) => ({
    name,
    value: v[name],
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setV((old) => ({ ...old, [name]: e.target.value })),
    "aria-invalid": errors[name] ? true : undefined,
  });
  const err = (name: string) => errors[name] && <span className={forms.error}>{errors[name]}</span>;

  const aside = (
    <>
      <Panel title={TEXT.showTitle}>
        {(["showContact", "showTrackRecord", "showFollowers"] as const).map((key) => (
          <label key={key} className={`${hiring.whiteRow} ${styles.switchRow}`}>
            <span className={ui.rowTitle}>{TEXT[key]}</span>
            <span className={forms.switch}>
              <input type="checkbox" role="switch" name={key} checked={show[key]} onChange={(e) => setShow((s) => ({ ...s, [key]: e.target.checked }))} />
            </span>
          </label>
        ))}
      </Panel>
      <div className={hiring.notePanel}>
        <p className={hiring.notePanelTitle}>{TEXT.nameTitle}</p>
        <p className={tables.panelText}>{TEXT.nameText}</p>
      </div>
    </>
  );

  return (
    <form action={formAction} className={styles.contents} noValidate>
      <Columns aside={aside}>
        <header className={hiring.pageHeadText}>
          <h1 className={hiring.pageTitle}>{TEXT.title}</h1>
          <p className={hiring.lede}>{TEXT.lede}</p>
        </header>
        {state.message && (
          <p className={forms.alert} role="alert">
            {state.message}
          </p>
        )}

        <section className={`${forms.card} ${styles.media}`}>
          <Thumb size={88} shape="round" />
          <span className={styles.logoText}>
            {/* pictures need storage (EN-03) */}
            <MaybeLink className={`${ui.rowButton} ${styles.plain}`}>{TEXT.changeLogo}</MaybeLink>
            <span className={tables.small}>{TEXT.logoHint}</span>
          </span>
          <span className={styles.cover}>
            <Thumb size={448} height={100} shape="image" />
            <MaybeLink className={`${ui.rowButton} ${ui.rowButtonWhite} ${styles.coverButton}`}>{TEXT.changeCover}</MaybeLink>
          </span>
        </section>

        <section className={forms.card}>
          <label className={forms.field}>
            <span className={forms.label}>{TEXT.name}</span>
            <input {...bind("name")} required maxLength={60} className={forms.input} />
            {err("name")}
          </label>
          <div className={forms.row2}>
            <label className={forms.field}>
              <span className={forms.label}>{TEXT.eventTypes}</span>
              <input {...bind("eventTypes")} className={forms.input} />
            </label>
            <label className={forms.field}>
              <span className={forms.label}>{TEXT.basedIn}</span>
              <input {...bind("basedIn")} className={forms.input} />
            </label>
          </div>
          <label className={forms.field}>
            <span className={forms.label}>{TEXT.about}</span>
            <textarea {...bind("about")} rows={3} maxLength={aboutMax} className={`${forms.input} ${styles.about}`} aria-describedby="about-count" />
            <span id="about-count" className={forms.hint} aria-live="polite">
              {TEXT.count(v.about.length, aboutMax)}
            </span>
            {err("about")}
          </label>
          <div className={forms.row2}>
            <label className={forms.field}>
              <span className={forms.label}>{TEXT.phone}</span>
              <input {...bind("phone")} type="tel" autoComplete="tel" className={forms.input} />
              {err("phone")}
            </label>
            <label className={forms.field}>
              <span className={forms.label}>{TEXT.email}</span>
              <input {...bind("email")} type="email" autoComplete="email" className={forms.input} />
              {err("email")}
            </label>
          </div>
          <label className={forms.field}>
            <span className={forms.label}>{TEXT.website}</span>
            <input {...bind("website")} className={forms.input} />
          </label>
          <label className={forms.field}>
            <span className={forms.label}>{TEXT.shortLink}</span>
            <input {...bind("shortLink")} className={forms.input} />
            {errors.shortLink ? err("shortLink") : <span className={forms.hint}>{TEXT.shortLinkHint}</span>}
          </label>
        </section>

        <div className={hiring.formActions}>
          <Link href={cancelHref} className={`${forms.bigButton} ${styles.plain}`}>
            {TEXT.cancel}
          </Link>
          <button type="submit" className={`${forms.bigButton} ${forms.bigButtonPrimary} ${hiring.send}`} disabled={pending}>
            {pending ? TEXT.saving : TEXT.save}
          </button>
        </div>
      </Columns>
    </form>
  );
}
