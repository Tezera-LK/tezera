import forms from "@/components/portal/forms.module.css";
import ui from "@/components/portal/ui.module.css";
import styles from "./Provider.module.css";

type ChoiceProps = {
  type: "radio" | "checkbox";
  name: string;
  value: string;
  title: string;
  // a grey line under the title
  hint?: string;
  defaultChecked?: boolean;
  required?: boolean;
  // white on a grey card, instead of grey on a white one
  white?: boolean;
};

// One pickable row with a dot on the right (Damian's forms.choice, as in O10 and O84). The real
// input is hidden; the whole row is its label, so a click anywhere picks it. A checkbox gets a
// square mark instead of a round one.
export default function Choice({ type, name, value, title, hint, defaultChecked, required, white }: ChoiceProps) {
  return (
    <label className={`${forms.choice} ${white ? forms.choiceWhite : ""} ${styles.choice}`}>
      <input type={type} name={name} value={value} defaultChecked={defaultChecked} required={required} />
      <span className={forms.choiceText}>
        <span className={forms.choiceTitle}>{title}</span>
        {hint && <span className={ui.muted}>{hint}</span>}
      </span>
      <span className={`${forms.choiceDot} ${type === "checkbox" ? styles.boxDot : ""}`} aria-hidden="true" />
    </label>
  );
}
