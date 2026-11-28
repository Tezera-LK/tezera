import type { Metadata } from "next";
import Link from "next/link";
import Columns from "@/components/portal/Columns";
import Panel from "@/components/portal/Panel";
import Thumb from "@/components/portal/Thumb";
import forms from "@/components/portal/forms.module.css";
import hiring from "@/components/portal/hiring/Hiring.module.css";
import Choice from "@/components/portal/provider/Choice";
import styles from "@/components/portal/provider/Provider.module.css";
import ui from "@/components/portal/ui.module.css";
import EmptyState from "@/components/states/EmptyState";
import { requireRole } from "@/lib/auth/session";
import { getProviderState } from "@/lib/data/provider";
import { DISTRICTS } from "@/lib/districts";
import { lkr } from "@/lib/provider";
import { routes } from "@/lib/routes";
import { saveProfileForm } from "../actions";

export const metadata: Metadata = { title: "Edit profile" };

const TEXT = {
  title: "Edit profile",
  view: "View profile",
  lede: "Changes show on your profile, in provider search and on your quotes",
  logo: "Logo and cover",
  changeLogo: "Change logo",
  changeCover: "Change cover",
  photosNote: "Photos come with storage (EN-03).",
  about: "About",
  nameVendor: "Business name",
  nameFreelancer: "Your name",
  bio: "Short bio",
  bioHint: "Up to 300 characters",
  phone: "Contact phone",
  website: "Instagram or website",
  category: "Category",
  districts: "Districts served",
  services: "Services and indicative prices",
  serviceName: "Service",
  detail: "What it includes",
  price: "Price (LKR)",
  fromPrice: "Starting price (“from”)",
  newService: "Add a service: fill in the empty row",
  save: "Save changes",
  cancel: "Cancel",
  errors: {
    name: "Add a name.",
    bio: "Keep the bio to 300 characters.",
    districts: "Pick at least one district.",
    price: "Each service needs a price in rupees.",
  } as Record<string, string>,
  strength: "Profile strength",
  strong: "Strong",
  good: "Good",
  // what's still missing, first thing first (V35: "Add 2 more portfolio videos to reach 100%.")
  strengthTip: (missing: string | null) => (missing ? `${missing} to reach 100%. Full profiles rank higher in search.` : "Your profile is complete. Full profiles rank higher in search."),
  missing: {
    verified: "Get verified",
    bio: "Write a short bio",
    services: (n: number) => `Add ${n} more service${n === 1 ? "" : "s"}`,
    portfolio: (n: number) => `Add ${n} more portfolio item${n === 1 ? "" : "s"}`,
    videos: (n: number) => `Add ${n} more portfolio video${n === 1 ? "" : "s"}`,
  },
  preview: "Preview in search",
  viewAs: "View as organiser",
  fromLkr: (p: string) => `from ${p}`,
  emptyTitle: "No profile yet",
  emptyText: "Your profile can be edited once it's set up.",
} as const;

const CATEGORIES = {
  vendor: ["F&B stall", "Catering", "Media agency", "Sound and lighting", "Décor", "Other"],
  freelancer: ["Photographer and videographer", "Photographer", "Videographer", "DJ", "MC", "Other"],
};

// "Edit profile" (Figma V35, F35): name, bio, contact, category, districts and services.
export default async function EditProfilePage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const session = await requireRole("vendor", "freelancer");
  const state = await getProviderState(session);
  const { error } = await searchParams;
  if (!state) return <EmptyState title={TEXT.emptyTitle} description={TEXT.emptyText} />;
  const p = state.profile;
  const vendor = state.kind === "vendor";
  const videos = p.portfolio.filter((x) => x.kind === "video").length;
  // out of 100: 51 for the basics, a bio 10, up to 3 services 5 each, up to 6 portfolio items 2
  // each and up to 3 videos 4 each; 10 off until verification is approved
  const verified = state.verification.status === "approved";
  const services = Math.min(p.services.length, 3);
  const items = Math.min(p.portfolio.length, 6);
  const clips = Math.min(videos, 3);
  const strength = Math.max(0, 51 + (p.bio ? 10 : 0) + services * 5 + items * 2 + clips * 4 - (verified ? 0 : 10));
  const missing = !verified
    ? TEXT.missing.verified
    : !p.bio
      ? TEXT.missing.bio
      : services < 3
        ? TEXT.missing.services(3 - services)
        : items < 6
          ? TEXT.missing.portfolio(6 - items)
          : clips < 3
            ? TEXT.missing.videos(3 - clips)
            : null;
  // the existing services plus one empty row for a new one
  const rows = [...p.services, null];
  const categories = CATEGORIES[state.kind].includes(p.category) ? CATEGORIES[state.kind] : [p.category, ...CATEGORIES[state.kind]];

  const aside = (
    <>
      <Panel title={TEXT.strength}>
        <div className={hiring.cardHead}>
          <p className={hiring.pageTitle}>{`${strength}%`}</p>
          <span className={hiring.sub}>{strength >= 85 ? TEXT.strong : TEXT.good}</span>
        </div>
        <span className={styles.bar} aria-hidden="true">
          <span className={styles.barFill} style={{ width: `${strength}%` }} />
        </span>
        <p className={styles.foot}>{TEXT.strengthTip(missing)}</p>
      </Panel>
      <Panel title={TEXT.preview} link={{ label: TEXT.viewAs, href: routes.vendorArea.profilePreview }}>
        <div className={hiring.whiteRow}>
          <Thumb size={36} shape="round" />
          <span className={ui.rowText}>
            <span className={ui.rowTitle}>{state.verification.status === "approved" ? `${p.name} ✓` : p.name}</span>
            <span className={hiring.sub}>{`${p.category} · ${p.districts[0]} · ★ ${p.rating}${p.services[0] ? ` · ${TEXT.fromLkr(lkr(Math.min(...p.services.map((s) => s.priceLkr))))}` : ""}`}</span>
          </span>
        </div>
      </Panel>
    </>
  );

  return (
    <Columns aside={aside}>
      <header className={hiring.pageHead}>
        <div className={hiring.pageHeadText}>
          <h1 className={hiring.pageTitle}>{TEXT.title}</h1>
          <p className={hiring.lede}>{TEXT.lede}</p>
        </div>
        <Link href={routes.vendorArea.profile} className={ui.rowButton}>
          {TEXT.view}
        </Link>
      </header>
      {error && TEXT.errors[error] && (
        <p className={forms.error} role="alert">
          {TEXT.errors[error]}
        </p>
      )}
      <form action={saveProfileForm} className={styles.stack}>
        <section className={forms.card} aria-labelledby="logo-title">
          <h2 id="logo-title" className={hiring.cardTitle}>
            {TEXT.logo}
          </h2>
          <span className={styles.inline}>
            <Thumb size={64} shape="round" />
            <span className={`${ui.rowButton} ${ui.soon}`} title={TEXT.photosNote}>
              {TEXT.changeLogo}
            </span>
            <span className={`${ui.rowButton} ${ui.soon}`} title={TEXT.photosNote}>
              {TEXT.changeCover}
            </span>
          </span>
        </section>
        <section className={forms.card} aria-labelledby="about-title">
          <h2 id="about-title" className={hiring.cardTitle}>
            {TEXT.about}
          </h2>
          <label className={forms.field}>
            <span className={forms.label}>{vendor ? TEXT.nameVendor : TEXT.nameFreelancer}</span>
            <input name="name" required defaultValue={p.name} className={forms.input} />
          </label>
          <label className={forms.field}>
            <span className={forms.label}>{TEXT.bio}</span>
            <textarea name="bio" rows={3} maxLength={300} defaultValue={p.bio} className={forms.input} />
            <span className={forms.hint}>{TEXT.bioHint}</span>
          </label>
          <div className={forms.row2}>
            <label className={forms.field}>
              <span className={forms.label}>{TEXT.phone}</span>
              <input name="phone" type="tel" defaultValue={p.phone} className={forms.input} />
            </label>
            <label className={forms.field}>
              <span className={forms.label}>{TEXT.website}</span>
              <input name="website" defaultValue={p.website} className={forms.input} />
            </label>
          </div>
        </section>
        <section className={forms.card} aria-labelledby="category-title">
          <h2 id="category-title" className={hiring.cardTitle}>
            {TEXT.category}
          </h2>
          <div className={styles.pills}>
            {categories.map((c) => (
              <Choice key={c} type="radio" name="category" value={c} title={c} defaultChecked={c === p.category} />
            ))}
          </div>
        </section>
        <section className={forms.card} aria-labelledby="districts-title">
          <h2 id="districts-title" className={hiring.cardTitle}>
            {TEXT.districts}
          </h2>
          <div className={styles.districts}>
            {DISTRICTS.map((d) => (
              <Choice key={d} type="checkbox" name="districts" value={d} title={d} defaultChecked={p.districts.includes(d)} />
            ))}
          </div>
        </section>
        <section className={forms.card} aria-labelledby="services-title">
          <h2 id="services-title" className={hiring.cardTitle}>
            {TEXT.services}
          </h2>
          {rows.map((s, i) => (
            <fieldset key={s?.id ?? "new"} className={`${hiring.plainFieldset} ${styles.serviceRow}`}>
              <legend className={forms.hint}>{s ? s.name : TEXT.newService}</legend>
              <input type="hidden" name={`serviceId${i}`} value={s?.id ?? ""} />
              <input name={`service${i}`} defaultValue={s?.name ?? ""} aria-label={TEXT.serviceName} placeholder={TEXT.serviceName} className={forms.input} />
              <input name={`detail${i}`} defaultValue={s?.detail ?? ""} aria-label={TEXT.detail} placeholder={TEXT.detail} className={forms.input} />
              <input name={`price${i}`} inputMode="numeric" defaultValue={s?.priceLkr ?? ""} aria-label={TEXT.price} placeholder={TEXT.price} className={forms.input} />
              <Choice type="checkbox" name={`from${i}`} value="yes" title={TEXT.fromPrice} defaultChecked={s?.from} />
            </fieldset>
          ))}
        </section>
        <div className={styles.pair}>
          <button type="submit" className={`${forms.bigButton} ${forms.bigButtonPrimary}`}>
            {TEXT.save}
          </button>
          <Link href={routes.vendorArea.profile} className={forms.bigButton}>
            {TEXT.cancel}
          </Link>
        </div>
      </form>
    </Columns>
  );
}
