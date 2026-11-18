import palette from "@/components/Palette.module.css";
import type { PublicProvider } from "@/lib/data/types";
import styles from "./Public.module.css";
import SignInPrompt from "./SignInPrompt";
import { PROVIDER_KIND_LABEL, PUBLIC_TEXT } from "./text";

// The teaser for a vendor's or a freelancer's profile (/vendors/<id>, /freelancers/<id>).
// Both use the vendor palette, as on the auth screens. The full profile is US-P01-T3.
export default function ProviderTeaser({ provider }: { provider: PublicProvider }) {
  return (
    <article className={`${palette.root} ${styles.card}`} data-palette="ven">
      <p className={styles.eyebrow}>{PROVIDER_KIND_LABEL[provider.kind]}</p>
      <div className={styles.titleRow}>
        <h1 className={styles.title}>{provider.name}</h1>
        {provider.verified && <span className={styles.pill}>{PUBLIC_TEXT.verified}</span>}
      </div>
      <dl className={styles.facts}>
        <dt>What they do</dt>
        <dd>{provider.category}</dd>
      </dl>
      <SignInPrompt kind="profile" />
    </article>
  );
}
