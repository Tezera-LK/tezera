"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth/session";
import { getListing, saveListing } from "@/lib/data/provider";
import { previewMode } from "@/lib/preview";
import { newProviderId } from "@/lib/data/provider-store";
import { routes } from "@/lib/routes";

// Stall listing actions (vendors only): the short description (V15), items and prices (V77), and
// asking the organiser to show a hidden listing again (V82), and in preview mode, hiding it.

const r = routes.vendorArea;
const DESCRIPTION_MAX = 120;

function field(form: FormData, name: string): string {
  const value = form.get(name);
  return typeof value === "string" ? value.trim() : "";
}

const back = (stallId: string, extra = "") => `${r.listing}?stall=${stallId}${extra}`;

// "Save listing" (V15). A hidden listing also asks the organiser to show it again (V82).
export async function saveListingText(stallId: string, form: FormData) {
  const session = await requireRole("vendor");
  const listing = await getListing(session, stallId);
  if (!listing) redirect(r.listing);
  const description = field(form, "description");
  if (description.length > DESCRIPTION_MAX) redirect(back(stallId, "&error=long"));
  const flagged = listing.items.some((i) => i.breaksRules);
  if (listing.hidden && flagged) redirect(back(stallId, "&error=rules"));
  await saveListing(session, { ...listing, description, useProfilePrices: field(form, "profilePrices") === "on", hidden: null });
  revalidatePath(r.listing);
  redirect(back(stallId, "&saved=1"));
}

// "Save item" (V77): adds an item, or changes the one being edited.
export async function saveItem(stallId: string, itemId: string | null, form: FormData) {
  const session = await requireRole("vendor");
  const listing = await getListing(session, stallId);
  if (!listing) redirect(r.listing);
  const name = field(form, "name");
  const price = Number(field(form, "price").replace(/[^\d]/g, ""));
  if (!name || !(price > 0)) redirect(back(stallId, `&dialog=item${itemId ? `&item=${itemId}` : ""}&error=fields`));
  const item = {
    id: itemId ?? newProviderId("it"),
    name,
    kind: field(form, "kind") || "Other",
    priceLkr: price,
    searchWords: field(form, "words").split(",").map((w) => w.trim().toLowerCase()).filter(Boolean),
    soldOut: field(form, "soldOut") === "yes",
    breaksRules: false,
  };
  const items = itemId ? listing.items.map((i) => (i.id === itemId ? item : i)) : [...listing.items, item];
  await saveListing(session, { ...listing, items });
  revalidatePath(r.listing);
  redirect(back(stallId));
}

// "Delete item" (V77) and "Remove" on an item that breaks the rules (V82).
export async function deleteItem(stallId: string, itemId: string) {
  const session = await requireRole("vendor");
  const listing = await getListing(session, stallId);
  if (listing) await saveListing(session, { ...listing, items: listing.items.filter((i) => i.id !== itemId) });
  revalidatePath(r.listing);
  redirect(back(stallId));
}

// Preview only: what the organiser does when a listing breaks the event rules (V82), so the hidden
// state can be shown before organisers' moderation exists. Adds a drink the rules don't allow.
export async function previewHideListing(stallId: string) {
  const session = await requireRole("vendor");
  const listing = await getListing(session, stallId);
  if (!previewMode || !listing) redirect(back(stallId));
  await saveListing(session, {
    ...listing,
    hidden: { at: new Date().toISOString(), reason: "alcohol is not allowed at this event." },
    items: [
      ...listing.items.filter((i) => !i.breaksRules),
      { id: newProviderId("it"), name: "Arrack cocktail", kind: "Drink", priceLkr: 900, searchWords: ["arrack"], soldOut: false, breaksRules: true },
    ],
  });
  revalidatePath(r.listing);
  redirect(back(stallId));
}
