import "server-only";
import { samplePayments } from "@/lib/data/portal-samples";
import { newestFirst } from "@/lib/format";
import type { PaymentAccount, PaymentRecord } from "@/lib/data/portal-types";

// STAND-IN for the organiser's PayHere account and payment history (EN-03, PayHere sandbox)
// while there's no backend, kept in the dev server's memory like event-store.ts. Only
// lib/data/portal.ts uses it, and only in `next dev`. Card details are never stored here: a
// sandbox payment only records that it happened.

type Payments = { account: PaymentAccount | null; records: PaymentRecord[]; next: number };

const globalStore = globalThis as typeof globalThis & { __tezeraDevPayments?: Payments };

function payments(): Payments {
  globalStore.__tezeraDevPayments ??= { ...samplePayments(new Date()), next: 55302 };
  return globalStore.__tezeraDevPayments;
}

export function storedAccount(): PaymentAccount | null {
  return structuredClone(payments().account);
}

export function saveStoredAccount(account: PaymentAccount | null) {
  payments().account = structuredClone(account);
}

// Every payment, newest first.
export function allStoredRecords(): PaymentRecord[] {
  return structuredClone(payments().records).sort((a, b) => newestFirst(a.at, b.at));
}

// Records a payment and gives it the next receipt number, "TZ-R-55302".
export function insertStoredRecord(record: Omit<PaymentRecord, "id">): PaymentRecord {
  const store = payments();
  const saved = { ...record, id: `TZ-R-${store.next++}` };
  store.records.push(saved);
  return structuredClone(saved);
}
