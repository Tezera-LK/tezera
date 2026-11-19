import MaybeLink from "./MaybeLink";
import styles from "./PortalShell.module.css";

type ButtonLinkProps = {
  // where the button goes; leave it out while that page isn't built (it's drawn but doesn't click)
  href?: string;
  // the button's text
  children: React.ReactNode;
  // filled in the role's colour; use it for the one main action on a page
  primary?: boolean;
};

// A link that looks like a button, for the actions beside a page title.
export default function ButtonLink({ href, children, primary }: ButtonLinkProps) {
  return (
    <MaybeLink href={href} className={primary ? `${styles.button} ${styles.buttonPrimary}` : styles.button}>
      {children}
    </MaybeLink>
  );
}
