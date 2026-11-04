// ─────────────────────────────────────────────────────────────
// STEPPER: "Your account · Your business · Get verified" progress bars
// File: src/components/auth/Stepper.tsx
//   <Stepper steps={["Your account", "Your business", "Get verified"]} current={1} />
// current counts from 0, so current={1} = the second step.
// The step names per role are in lib/roles.ts (ROLE_INFO[role].steps).
// ─────────────────────────────────────────────────────────────

import styles from "./Stepper.module.css";

export default function Stepper({ steps, current }: { steps: string[]; current: number }) {
  return (
    // <ol> = an ordered (numbered) list, which is what steps are.
    // aria-label names it for screen readers.
    <ol className={styles.steps} aria-label={`Step ${current + 1} of ${steps.length}`}>
      {steps.map((step, i) => {
        // Earlier steps are done; this one is current; later ones are grey.
        const state = i < current ? styles.done : i === current ? styles.current : "";
        return (
          <li
            key={step}
            className={`${styles.step} ${state}`}
            // aria-current="step" tells screen readers which step this is.
            aria-current={i === current ? "step" : undefined}
          >
            {step}
          </li>
        );
      })}
    </ol>
  );
}
