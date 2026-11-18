import styles from "./PortalShell.module.css";

type PageHeaderProps = {
  title: string;
  description?: string;
  // buttons on the right of the title, as in the wireframes (e.g. "Create event")
  actions?: React.ReactNode;
};

// The h1 and one-line intro at the top of each portal page.
export default function PageHeader({ title, description, actions }: PageHeaderProps) {
  return (
    <header className={styles.pageHeader}>
      <div className={styles.pageHeading}>
        <h1 className={styles.pageTitle}>{title}</h1>
        {description && <p className={styles.lede}>{description}</p>}
      </div>
      {actions && <div className={styles.pageActions}>{actions}</div>}
    </header>
  );
}
