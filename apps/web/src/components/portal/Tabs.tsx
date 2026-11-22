import Link from "next/link";
import MaybeLink from "./MaybeLink";
import ui from "./ui.module.css";

// href is missing while that tab page belongs to a slice that is not built yet
export type Tab = { key: string; label: string; href?: string };

type TabsProps = {
  tabs: Tab[];
  // the key of the tab that's showing
  current: string;
  // what the row of tabs filters, for screen readers, e.g. "Notification types"
  label: string;
};

// The white pill of tabs on O06 and O80. Each tab is a plain link to the same page with a different
// ?type= or ?tab=, so it works without JavaScript and the back button goes to the previous tab.
export default function Tabs({ tabs, current, label }: TabsProps) {
  return (
    <nav className={ui.tabs} aria-label={label}>
      {tabs.map((tab) =>
        !tab.href ? (
          <MaybeLink key={tab.key} className={ui.tab}>
            {tab.label}
          </MaybeLink>
        ) : (
        <Link
          key={tab.key}
          href={tab.href}
          className={ui.tab}
          aria-current={tab.key === current ? "page" : undefined}
          scroll={false}
        >
          {tab.label}
        </Link>
        ),
      )}
    </nav>
  );
}
