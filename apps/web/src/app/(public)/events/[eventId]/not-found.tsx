import EmptyState from "@/components/states/EmptyState";
import { STATE_TEXT } from "@/components/states/text";
import { routes } from "@/lib/routes";

// Also what a draft event looks like to the public: it doesn't exist.
export default function EventNotFound() {
  return (
    <EmptyState
      headingLevel={1}
      title="Event not found"
      description="It may have been taken down, or the link may be wrong."
      action={{ label: STATE_TEXT.goHome, href: routes.home }}
    />
  );
}
