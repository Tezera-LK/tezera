import styles from "./PortalShell.module.css";

type ColumnsProps = {
  // the narrow right-hand column, usually a few <Panel>s
  aside: React.ReactNode;
  children: React.ReactNode;
};

// A page's main column with a narrower column on its right, as on most wireframe screens.
// Below 1200px wide the right-hand column moves under the main one.
export default function Columns({ aside, children }: ColumnsProps) {
  return (
    <div className={styles.columns}>
      <div className={styles.column}>{children}</div>
      <div className={styles.column}>{aside}</div>
    </div>
  );
}
