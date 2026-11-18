// ─────────────────────────────────────────────────────────────
// ATTENDEE SETUP: "Set up your feed" (design C04)
// File: src/components/auth/setup/AttendeeSetupForm.tsx
//
// Shown after an attendee verifies their account. Everything here is
// optional: it only helps us show the right events first.
// The choices aren't saved yet (that needs our API); finishing marks the
// account's setup as "done", so the next log in goes straight home.
// ─────────────────────────────────────────────────────────────

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import Button from "../Button";
import ChipGroup from "../ChipGroup";
import SelectField from "../SelectField";
import Stepper from "../Stepper";
import formStyles from "../Form.module.css";
import styles from "./Setup.module.css";
import { DISTRICTS } from "@/lib/districts";
import { ROLE_INFO } from "@/lib/roles";
import { SAMPLE_ORGANISERS } from "@/lib/temporary";
import { authErrorMessage } from "@/lib/authErrors";
import { routes } from "@/lib/routes";
import { saveSetupStage } from "@/lib/session";

const INTERESTS = [
  "Music", "Food festivals", "Comedy", "Sports", "Tech", "Theatre",
  "Exhibitions", "Fashion", "Family", "Nightlife", "Culture", "Workshops",
];

export default function AttendeeSetupForm() {
  const router = useRouter();

  const [interests, setInterests] = useState<string[]>([]);
  const [district, setDistrict] = useState("");
  // The ids of the organisers they follow. A list (array) of text.
  const [following, setFollowing] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  // Follow / unfollow one organiser: add or remove its id from the list.
  function toggleFollow(id: string) {
    setFollowing(following.includes(id) ? following.filter((f) => f !== id) : [...following, id]);
  }

  // Continue and Skip both finish setup; they can change it later.
  async function finish() {
    setBusy(true);
    try {
      // TODO (API step): save interests, district and follows.
      await saveSetupStage("done"); // the next log in goes straight home
      router.push(routes.dashboard);
    } catch (err) {
      setError(authErrorMessage(err));
      setBusy(false);
    }
  }

  return (
    <div>
      {/* steps from lib/roles.ts; current={1} = the second step. */}
      <Stepper steps={ROLE_INFO.attendee.steps} current={1} />
      <h2 className={formStyles.title}>Set up your feed</h2>
      <p className={formStyles.subtitle}>Pick what you like so we can show you the right events.</p>

      <div className={formStyles.form}>
        <ChipGroup
          name="interests"
          legend="Interests"
          options={INTERESTS}
          value={interests}
          onChange={setInterests}
          multiple
        />

        <SelectField
          id="district"
          label="Your district"
          options={DISTRICTS}
          value={district}
          onChange={setDistrict}
          placeholder="Choose a district"
        />

        {/* formStyles.field stacks the heading, hint and list with small gaps. */}
        <section className={formStyles.field}>
          <h3 className={formStyles.sectionTitle}>Organisers you might like</h3>
          <p className={formStyles.hint}>Example organisers for now.</p>
          <ul className={styles.list}>
            {SAMPLE_ORGANISERS.map((organiser) => {
              const isFollowing = following.includes(organiser.id);
              return (
                <li key={organiser.id} className={styles.item}>
                  <span className={styles.avatar} aria-hidden="true" />
                  <span className={styles.itemText}>
                    <span className={styles.itemTitle}>{organiser.name}</span>
                    <span className={styles.itemSub}>{organiser.detail}</span>
                  </span>
                  {/* Solid when following, outlined when not.
                      aria-pressed tells screen readers it's an on/off button. */}
                  <Button
                    variant={isFollowing ? "primary" : "outline"}
                    size="small"
                    block={false}
                    aria-pressed={isFollowing}
                    onClick={() => toggleFollow(organiser.id)}
                  >
                    {isFollowing ? "Following" : "Follow"}
                  </Button>
                </li>
              );
            })}
          </ul>
        </section>

        {error && (
          <p className={formStyles.error} role="alert">
            {error}
          </p>
        )}

        <div className={formStyles.actions}>
          <Button variant="outline" onClick={finish} disabled={busy}>
            Skip for now
          </Button>
          <Button onClick={finish} disabled={busy}>
            Continue
          </Button>
        </div>
      </div>
    </div>
  );
}
