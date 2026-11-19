import ui from "./ui.module.css";

// good = green ("Published"), warn = amber ("Running late"), neutral = grey ("Postponed"),
// soft = pale ("Draft", "Rising"), strong = role colour ("Top Rated")
export type ChipTone = "good" | "warn" | "neutral" | "soft" | "strong";

const TONE: Record<ChipTone, string> = {
  good: ui.chipGood,
  warn: ui.chipWarn,
  neutral: ui.chipNeutral,
  soft: ui.chipSoft,
  strong: ui.chipStrong,
};

// A 22px status pill.
export default function Chip({ tone, children }: { tone: ChipTone; children: React.ReactNode }) {
  return <span className={`${ui.chip} ${TONE[tone]}`}>{children}</span>;
}
