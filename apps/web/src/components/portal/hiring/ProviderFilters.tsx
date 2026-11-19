"use client";

import { useRef } from "react";
import { DISTRICTS, PROVIDER_CATEGORIES } from "@/lib/hiring";
import { routes } from "@/lib/routes";
import forms from "../forms.module.css";
import shell from "../PortalShell.module.css";
import styles from "./Hiring.module.css";

const TEXT = {
  search: "Search providers",
  searchPlaceholder: "photographer, DJ, sound…",
  category: "Category",
  district: "District",
  rating: "Rating",
  any: "any",
  verified: "Verified only",
  free: (day: string) => `Free on ${day}`,
  sort: "Sort",
  rank: "Rank",
  byRating: "Rating",
  price: "Price",
  apply: "Show providers",
} as const;

export type FilterValues = {
  q: string;
  category: string;
  district: string;
  rating: string;
  verified: boolean;
  free: boolean;
  sort: string;
};

type Props = {
  values: FilterValues;
  // the event the page hires for; "Free on …" checks its day
  eventId: string | null;
  eventDay: string | null;
};

// The search box and filter pills on Find providers (O17). It's a plain GET form, so the filters
// live in the address; with JavaScript each change submits it straight away.
export default function ProviderFilters({ values, eventId, eventDay }: Props) {
  const formRef = useRef<HTMLFormElement>(null);
  const submit = () => formRef.current?.requestSubmit();

  const select = (name: string, label: string, value: string, options: { value: string; label: string }[]) => (
    <label className={`${styles.filterPill} ${value ? styles.filterOn : ""}`}>
      <span className={shell.srOnly}>{label}</span>
      <select name={name} defaultValue={value} onChange={submit}>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {`${label}: ${o.label}`}
          </option>
        ))}
      </select>
    </label>
  );
  const anyOf = (list: string[]) => [{ value: "", label: TEXT.any }, ...list.map((v) => ({ value: v, label: v }))];

  return (
    <form ref={formRef} action={routes.hiring} className={styles.search} role="search">
      {eventId && <input type="hidden" name="event" value={eventId} />}
      <label className={shell.srOnly} htmlFor="provider-search">
        {TEXT.search}
      </label>
      <input
        id="provider-search"
        type="search"
        name="q"
        defaultValue={values.q}
        placeholder={TEXT.searchPlaceholder}
        className={`${forms.input} ${styles.searchBox}`}
      />
      <div className={styles.filters}>
        {select("category", TEXT.category, values.category, anyOf(PROVIDER_CATEGORIES))}
        {select("district", TEXT.district, values.district, anyOf(DISTRICTS))}
        {select("rating", TEXT.rating, values.rating, [
          { value: "", label: TEXT.any },
          { value: "4", label: "4+" },
          { value: "4.5", label: "4.5+" },
        ])}
        <label className={styles.filterPill}>
          <input type="checkbox" name="verified" value="1" defaultChecked={values.verified} onChange={submit} />
          <span>{TEXT.verified}</span>
        </label>
        {eventDay && (
          <label className={styles.filterPill}>
            <input type="checkbox" name="free" value="1" defaultChecked={values.free} onChange={submit} />
            <span>{TEXT.free(eventDay)}</span>
          </label>
        )}
        {select("sort", TEXT.sort, values.sort === "rank" ? "" : values.sort, [
          { value: "", label: TEXT.rank },
          { value: "rating", label: TEXT.byRating },
          { value: "price", label: TEXT.price },
        ])}
        {/* for when JavaScript is off: Enter in the search box also submits */}
        <button type="submit" className={shell.srOnly}>
          {TEXT.apply}
        </button>
      </div>
    </form>
  );
}
