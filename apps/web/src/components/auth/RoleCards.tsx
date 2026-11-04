// ─────────────────────────────────────────────────────────────
// ROLE CARDS: "I am joining as" Attendee / Organiser / Vendor / Freelancer
// File: src/components/auth/RoleCards.tsx
//
// Built from real radio buttons (one choice from a group), styled as
// cards, so arrow keys, Tab and screen readers all work.
// The parent decides what picking a card does. On sign-up it moves to
// that role's sign-up page (/organiser/signup ...), which loads that
// role's colours and wording.
// ─────────────────────────────────────────────────────────────

import styles from "./RoleCards.module.css";
import { ROLES, ROLE_INFO, type Role } from "@/lib/roles";

type RoleCardsProps = {
  value: Role;                      // the role whose card is picked
  onChange: (role: Role) => void;   // called with the role the user picks
};

export default function RoleCards({ value, onChange }: RoleCardsProps) {
  return (
    // <fieldset> + <legend>: screen readers announce "I am joining as, group".
    <fieldset className={styles.group}>
      <legend className={styles.legend}>I am joining as</legend>

      <div className={styles.grid}>
        {/* One card per role, in the order of ROLES. The wording comes from
            ROLE_INFO in lib/roles.ts. */}
        {ROLES.map((role) => (
          <label key={role} className={styles.card}>
            <input
              type="radio"
              name="role"                      // same name = one group
              value={role}
              className={styles.radio}
              checked={value === role}         // only the current role is checked
              onChange={() => onChange(role)}  // tell the parent
            />
            {/* Must come straight after the input for ".radio:checked + .dot". */}
            <span className={styles.dot} aria-hidden="true" />
            <span className={styles.name}>{ROLE_INFO[role].name}</span>
            <span className={styles.description}>{ROLE_INFO[role].cardText}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
