import "server-only";
import { sampleAccountSettings } from "@/lib/data/portal-samples";
import type { AccountSettings } from "@/lib/data/portal-types";

// STAND-IN for the account's settings (EN-03, EN-04) while there's no backend, kept in the dev
// server's memory like event-store.ts. Only lib/data/portal.ts uses it, and only in `next dev`.
// No password is ever stored here: changing one only records when it changed.

const globalStore = globalThis as typeof globalThis & { __tezeraDevAccount?: AccountSettings };

export function storedAccountSettings(): AccountSettings {
  globalStore.__tezeraDevAccount ??= sampleAccountSettings(new Date());
  return structuredClone(globalStore.__tezeraDevAccount);
}

export function saveStoredAccountSettings(patch: Partial<AccountSettings>): AccountSettings {
  globalStore.__tezeraDevAccount = { ...storedAccountSettings(), ...patch };
  return structuredClone(globalStore.__tezeraDevAccount);
}
