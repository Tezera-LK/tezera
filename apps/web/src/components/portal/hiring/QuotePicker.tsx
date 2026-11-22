"use client";

import { useState } from "react";
import { formatCount } from "@/lib/format";
import forms from "../forms.module.css";
import ui from "../ui.module.css";
import styles from "./Hiring.module.css";

const TEXT = {
  selected: (n: number, total: number) => `${n} ${n === 1 ? "quote" : "quotes"} selected · LKR ${formatCount(total)}`,
  none: "No quotes selected",
  hint: "A booking is created for each quote you accept. The others are told when the post closes.",
  accept: "Accept and create bookings",
} as const;

type Props = {
  // where the form goes: the job page with ?dialog=accept
  action: string;
  // each open quote's id and price, to add up what's picked
  prices: Record<string, number>;
  initial: string[];
  // the quote cards, each with an "Accept this quote" checkbox named "pick"
  children: React.ReactNode;
};

// The quote cards and the "2 quotes selected · LKR 70,000" bar on Compare quotes (O21). It's a GET
// form: the button opens the check-before-booking dialog (O89) with the picked quotes in the
// address. The bar's total follows the ticks as they change.
export default function QuotePicker({ action, prices, initial, children }: Props) {
  const [picked, setPicked] = useState(new Set(initial));
  const total = [...picked].reduce((sum, id) => sum + (prices[id] ?? 0), 0);

  // one listener for every checkbox in the cards
  function onChange(event: React.ChangeEvent<HTMLFormElement>) {
    const box = event.target as unknown as HTMLInputElement;
    if (box.name !== "pick") return;
    setPicked((old) => {
      const next = new Set(old);
      if (box.checked) next.add(box.value);
      else next.delete(box.value);
      return next;
    });
  }

  return (
    <form action={action} onChange={onChange} className={ui.rows}>
      <input type="hidden" name="dialog" value="accept" />
      {children}
      <div className={styles.selectedBar}>
        <span className={ui.rowText}>
          <span className={ui.rowTitle} role="status">
            {picked.size > 0 ? TEXT.selected(picked.size, total) : TEXT.none}
          </span>
          <span className={styles.sub}>{TEXT.hint}</span>
        </span>
        <button type="submit" className={`${forms.bigButton} ${forms.bigButtonPrimary}`} disabled={picked.size === 0}>
          {TEXT.accept}
        </button>
      </div>
    </form>
  );
}
