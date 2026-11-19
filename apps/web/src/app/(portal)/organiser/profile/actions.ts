"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth/session";
import { getMyOrganiserProfile, saveMyOrganiserProfile } from "@/lib/data/portal";
import { ABOUT_MAX, SHORT_LINK_DAYS } from "@/lib/profile";
import { routes } from "@/lib/routes";

// "Save changes" on Edit profile (O42).

export type ProfileFormState = { errors?: Record<string, string>; message?: string };

function field(form: FormData, name: string): string {
  const value = form.get(name);
  return typeof value === "string" ? value.trim() : "";
}


export async function saveProfile(_previous: ProfileFormState, form: FormData): Promise<ProfileFormState> {
  const session = await requireRole("organiser");
  const current = await getMyOrganiserProfile(session);
  if (!current) return { message: "Saving needs the backend (EN-03), which isn't connected yet." };

  const name = field(form, "name");
  const about = field(form, "about");
  const phone = field(form, "phone");
  const email = field(form, "email");
  const shortLink = field(form, "shortLink").toLowerCase().replace(/^(https?:\/\/)?(www\.)?tezera\.lk\//, "");

  const errors: Record<string, string> = {};
  if (!name) errors.name = "Add your organiser name.";
  else if (name.length > 60) errors.name = "Keep it to 60 characters.";
  if (about.length > ABOUT_MAX) errors.about = `Keep it to ${ABOUT_MAX} characters.`;
  if (phone && !/^\+?[\d\s-]{7,15}$/.test(phone)) errors.phone = "A phone number like +94 71 234 5678.";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.email = "An email address like name@example.com.";
  if (!/^[a-z0-9-]{3,30}$/.test(shortLink)) {
    errors.shortLink = "3 to 30 letters, numbers or dashes.";
  } else if (shortLink !== current.shortLink && current.shortLinkChangedAt) {
    const next = Date.parse(current.shortLinkChangedAt) + SHORT_LINK_DAYS * 86_400_000;
    if (next > Date.now()) errors.shortLink = `You can change it again on ${new Date(next).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}.`;
  }
  if (Object.keys(errors).length > 0) return { errors, message: "Some details need fixing. They're marked below." };

  const result = await saveMyOrganiserProfile(session, {
    name,
    eventTypes: field(form, "eventTypes"),
    basedIn: field(form, "basedIn"),
    about,
    phone,
    email,
    website: field(form, "website"),
    shortLink,
    shortLinkChangedAt: shortLink !== current.shortLink ? new Date().toISOString() : current.shortLinkChangedAt,
    showContact: form.get("showContact") === "on",
    showTrackRecord: form.get("showTrackRecord") === "on",
    showFollowers: form.get("showFollowers") === "on",
    // a new name keeps the badge while an admin checks it against the documents
    nameCheckPending: current.nameCheckPending || (current.verified && name !== current.name),
  });
  if (!result.ok) return { message: result.error };
  revalidatePath(routes.myProfile);
  revalidatePath(routes.dashboard);
  redirect(`${routes.myProfile}?saved=1`);
}
