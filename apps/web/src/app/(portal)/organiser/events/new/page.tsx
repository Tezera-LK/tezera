import type { Metadata } from "next";
import EventForm from "@/components/portal/events/EventForm";
import { requireRole } from "@/lib/auth/session";
import { getMyOrganiserProfile } from "@/lib/data/portal";
import { EMPTY_DRAFT } from "@/lib/event-form";
import { createEvent } from "../actions";

export const metadata: Metadata = { title: "Create event" };

// A new event (Figma O08): save it as a draft, preview it, or publish it.
export default async function NewEventPage() {
  const session = await requireRole("organiser");
  const profile = await getMyOrganiserProfile(session);

  return (
    <EventForm
      mode="create"
      action={createEvent}
      initial={EMPTY_DRAFT}
      organiser={{ name: profile?.name ?? "", verified: profile?.verified ?? false }}
    />
  );
}
