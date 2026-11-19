import type { Metadata } from "next";
import ProfileForm from "@/components/portal/profile/ProfileForm";
import ui from "@/components/portal/ui.module.css";
import { requireRole } from "@/lib/auth/session";
import { getMyOrganiserProfile } from "@/lib/data/portal";
import { ABOUT_MAX } from "@/lib/profile";
import { routes } from "@/lib/routes";
import { saveProfile } from "../actions";

export const metadata: Metadata = { title: "Edit profile" };

// Edit profile (Figma O42).
export default async function EditProfilePage() {
  const session = await requireRole("organiser");
  const profile = await getMyOrganiserProfile(session);
  if (!profile) return <p className={ui.muted}>Your profile needs the backend (EN-03), which isn&apos;t connected yet.</p>;
  return <ProfileForm action={saveProfile} profile={profile} aboutMax={ABOUT_MAX} cancelHref={routes.myProfile} />;
}
