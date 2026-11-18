import Link from "next/link";
import styles from "./PortalShell.module.css";

type ButtonLinkProps = {
  // where the button goes
  href: string;
  // the button's text
  children: React.ReactNode;
  // filled in the role's colour; use it for the one main action on a page
  primary?: boolean;
};

// A link that looks like a button, for the actions beside a page title.
export default function ButtonLink({ href, children, primary }: ButtonLinkProps) {
  return (
    <Link href={href} className={primary ? `${styles.button} ${styles.buttonPrimary}` : styles.button}>
      {children}
    </Link>
  );
}
