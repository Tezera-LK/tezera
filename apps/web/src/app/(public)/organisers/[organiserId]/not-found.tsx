import EmptyState from "@/components/states/EmptyState";
import { STATE_TEXT } from "@/components/states/text";
import { routes } from "@/lib/routes";

export default function OrganiserNotFound() {
  return (
    <EmptyState
      headingLevel={1}
      title="Organiser not found"
      description="The account may have been closed, or the link may be wrong."
      action={{ label: STATE_TEXT.goHome, href: routes.home }}
    />
  );
}
