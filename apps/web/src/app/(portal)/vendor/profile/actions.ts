"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth/session";
import { getProviderState, saveProfile } from "@/lib/data/provider";
import { newProviderId } from "@/lib/data/provider-store";
import type { ProviderProfile } from "@/lib/data/provider-types";
import { DISTRICTS } from "@/lib/districts";
import { routes } from "@/lib/routes";

// Profile actions: save the profile form (V35), add to the portfolio (V37) and remove an item (V38).

const r = routes.vendorArea;
const BIO_MAX = 300;

function field(form: FormData, name: string): string {
  const value = form.get(name);
  return typeof value === "string" ? value.trim() : "";
}

// "Save changes" (V35). Services with no name are dropped; at least one district is needed.
export async function saveProfileForm(form: FormData) {
  const session = await requireRole("vendor", "freelancer");
  const name = field(form, "name");
  const bio = field(form, "bio");
  const districts = form.getAll("districts").filter((d): d is string => typeof d === "string" && DISTRICTS.includes(d));
  const error = !name ? "name" : bio.length > BIO_MAX ? "bio" : districts.length === 0 ? "districts" : "";
  if (error) redirect(`${r.editProfile}?error=${error}`);

  const services: ProviderProfile["services"] = [];
  for (let i = 0; i < 6; i++) {
    const serviceName = field(form, `service${i}`);
    if (!serviceName) continue;
    const price = Number(field(form, `price${i}`).replace(/[^\d]/g, ""));
    if (!(price > 0)) redirect(`${r.editProfile}?error=price`);
    services.push({ id: field(form, `serviceId${i}`) || newProviderId("svc"), name: serviceName, detail: field(form, `detail${i}`), priceLkr: price, from: field(form, `from${i}`) === "yes" });
  }

  await saveProfile(session, {
    name,
    bio,
    phone: field(form, "phone"),
    website: field(form, "website"),
    // a blank choice keeps the category they had; Object.assign would copy an undefined over it
    ...(field(form, "category") ? { category: field(form, "category") } : {}),
    districts,
    services,
  });
  revalidatePath(r.profile);
  redirect(`${r.profile}?saved=1`);
}

// "Add 2 items" (V37). Files aren't stored until EN-03; the item keeps its caption and kind.
export async function addPortfolio(form: FormData) {
  const session = await requireRole("vendor", "freelancer");
  const state = await getProviderState(session);
  const caption = field(form, "caption") || field(form, "event") || field(form, "file");
  const kind = field(form, "kind");
  if (!state || !caption || !["photo", "video", "menu"].includes(kind)) redirect(`${r.profile}?tab=portfolio&dialog=add&error=fields`);
  const item = { id: newProviderId("pf"), title: caption, kind: kind as "photo" | "video" | "menu" };
  await saveProfile(session, { portfolio: [item, ...state.profile.portfolio] });
  revalidatePath(r.profile);
  redirect(`${r.profile}?tab=portfolio`);
}

// "Delete" in the portfolio viewer (V38).
export async function deletePortfolio(itemId: string) {
  const session = await requireRole("vendor", "freelancer");
  const state = await getProviderState(session);
  if (state) await saveProfile(session, { portfolio: state.profile.portfolio.filter((p) => p.id !== itemId) });
  revalidatePath(r.profile);
  redirect(`${r.profile}?tab=portfolio`);
}
