import type { Metadata } from "next";
import { notFound } from "next/navigation";
import EventForm from "@/components/portal/events/EventForm";
import { requireRole } from "@/lib/auth/session";
import { getMyEvent, getMyOrganiserProfile } from "@/lib/data/portal";
import type { EventDraft } from "@/lib/data/portal-types";
import { saveEvent } from "../../actions";

type Props = { params: Promise<{ eventId: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const session = await requireRole("organiser");
  const event = await getMyEvent(session, (await params).eventId);
  return { title: event ? `Edit ${event.title}` : "Edit event" };
}

// Editing one event. A draft gets the create form again; an event people can see gets O54's
// version, which warns who will be told about a new date or venue.
export default async function EditEventPage({ params }: Props) {
  const session = await requireRole("organiser");
  const { eventId } = await params;
  const [event, profile] = await Promise.all([getMyEvent(session, eventId), getMyOrganiserProfile(session)]);
  if (!event) notFound();

  // only the form's fields, so the client gets nothing it doesn't need
  const initial: EventDraft = {
    title: event.title,
    category: event.category,
    ageRating: event.ageRating,
    date: event.date,
    startTime: event.startTime,
    endTime: event.endTime,
    venueName: event.venueName,
    address: event.address,
    description: event.description,
    lineup: event.lineup,
    entry: event.entry,
    know: event.know,
  };
  // booked providers plus approved stall vendors: everyone with a booking to move
  const providers = (event.bookings?.confirmed ?? 0) + (event.stalls?.approved ?? 0);

  return (
    <EventForm
      mode={event.status === "draft" ? "draft" : "public"}
      action={saveEvent.bind(null, event.id)}
      initial={initial}
      eventId={event.id}
      savedTitle={event.title}
      audience={{ going: event.going, interested: event.interested, providers }}
      organiser={{ name: profile?.name ?? "", verified: profile?.verified ?? false }}
    />
  );
}
