import styles from "./PortalShell.module.css";

type PanelProps = {
  title: string;
  // shown as one row while there's nothing to list
  empty?: string;
  children?: React.ReactNode;
};

// One card in a page's right-hand column ("Needs your attention", "Coming up"…), tinted with the
// role's secondary colour like the wireframes' cards.
export default function Panel({ title, empty, children }: PanelProps) {
  return (
    <section className={styles.panel}>
      <h2 className={styles.panelTitle}>{title}</h2>
      {children ?? (empty && <p className={styles.panelEmpty}>{empty}</p>)}
    </section>
  );
}
