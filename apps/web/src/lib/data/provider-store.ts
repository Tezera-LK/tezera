import "server-only";
import { SAMPLE_VERSION, sampleProviderState } from "@/lib/data/provider-samples";
import type { ProviderKind, ProviderState } from "@/lib/data/provider-types";

// STAND-IN for the vendor and freelancer records (EN-03) while there's no backend, kept in the dev
// server's memory like event-store.ts. One copy per provider kind, so "View as" Vendor and Freelancer
// each keep their own changes. Only lib/data/provider.ts uses it, and only in preview mode.
// Resets when the dev server restarts. Phase B deletes this file.

const globalStore = globalThis as typeof globalThis & {
  __tezeraDevProviders?: Partial<Record<ProviderKind, ProviderState>>;
  __tezeraDevProvidersVersion?: number;
};

function state(kind: ProviderKind): ProviderState {
  // samples changed since the store was filled (an edit during next dev): start again from them
  if (globalStore.__tezeraDevProvidersVersion !== SAMPLE_VERSION) {
    globalStore.__tezeraDevProviders = {};
    globalStore.__tezeraDevProvidersVersion = SAMPLE_VERSION;
  }
  globalStore.__tezeraDevProviders ??= {};
  globalStore.__tezeraDevProviders[kind] ??= sampleProviderState(kind, new Date());
  return globalStore.__tezeraDevProviders[kind];
}

// A copy of everything, so a caller can't change the store by accident.
export function readProviderState(kind: ProviderKind): ProviderState {
  return structuredClone(state(kind));
}

// Changes the store in place and returns what `change` returns, as a copy.
export function writeProviderState<T>(kind: ProviderKind, change: (draft: ProviderState) => T): T {
  return structuredClone(change(state(kind)));
}

// "bk-k3f9a" — short and unique enough for a dev store
export const newProviderId = (prefix: string) => `${prefix}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`;
