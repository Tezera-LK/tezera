import styles from "./PortalShell.module.css";

type PanelProps = {
  // the panel's heading, e.g. "Needs your attention"
  title: string;
  // shown as one row while there's nothing to list
  empty?: string;
  // the panel's rows; when left out, the empty line shows instead
  children?: React.ReactNode;
};

// One card in a page's right-hand column ("Needs your attention", "Your rank"…), in the pill
// colour like Figma's panels.
export default function Panel({ title, empty, children }: PanelProps) {
  return (
    <section className={styles.panel}>
      <h2 className={styles.panelTitle}>{title}</h2>
      {children ?? (empty && <p className={styles.panelEmpty}>{empty}</p>)}
    </section>
  );
}
