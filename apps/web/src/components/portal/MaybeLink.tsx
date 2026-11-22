import Link from "next/link";
import { NAV_TEXT } from "./nav";
import styles from "./PortalShell.module.css";
import ui from "./ui.module.css";

type MaybeLinkProps = {
  // where it goes; leave it out while the destination page isn't built
  href?: string;
  className?: string;
  children: React.ReactNode;
};

// A link once its page exists, and the same-looking text until then. The sidebar does the same
// (nav.ts): Figma draws every button as live, so unbuilt ones look identical but don't click, and
// screen readers hear "coming soon".
export default function MaybeLink({ href, className, children }: MaybeLinkProps) {
  if (href) {
    return (
      <Link href={href} className={className}>
        {children}
      </Link>
    );
  }
  return (
    <span className={`${className ?? ""} ${ui.soon}`} title={NAV_TEXT.soon}>
      {children}
      <span className={styles.srOnly}>{`, ${NAV_TEXT.soon}`}</span>
    </span>
  );
}
