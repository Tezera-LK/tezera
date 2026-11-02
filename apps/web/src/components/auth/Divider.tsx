import styles from "./Form.module.css";

export default function Divider({ label = "or" }: { label?: string }) {
  return (
    <div className={styles.divider} role="separator">
      {label}
    </div>
  );
}