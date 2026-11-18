import type { Metadata } from "next";
import ButtonLink from "@/components/portal/ButtonLink";
import Columns from "@/components/portal/Columns";
import PageHeader from "@/components/portal/PageHeader";
import Panel from "@/components/portal/Panel";
import EmptyState from "@/components/states/EmptyState";
import { requireSession } from "@/lib/auth/session";
import type { PortalRole } from "@/lib/portal-roles";
import { routes } from "@/lib/routes";

export const metadata: Metadata = { title: "Dashboard" };

type Dashboard = {
  description: string;
  empty: React.ComponentProps<typeof EmptyState>;
  // the role's tools area, as the button beside the title
  tools?: { label: string; href: string };
  // the right-hand column; titles from the organiser and vendor wireframes' dashboards
  panels: React.ComponentProps<typeof Panel>[];
};

const RECENT_MESSAGES = { title: "Recent messages", empty: "Your latest conversations will show up here." };

// What each role's dashboard says until the feature tickets fill it in.
const DASHBOARD: Record<PortalRole, Dashboard> = {
  organiser: {
    description: "Your events, bookings and stalls at a glance.",
    empty: {
      title: "No events yet",
      description: "Your events, bookings and stall applications will show up here.",
    },
    tools: { label: "Organiser tools", href: routes.organiserTools },
    panels: [
      { title: "Needs your attention", empty: "Questions, stall applications and quotes waiting for you will show up here." },
      RECENT_MESSAGES,
    ],
  },
  vendor: {
    description: "New work matched to your services.",
    empty: {
      title: "No bookings yet",
      description: "Booking requests, job posts that match you and your stalls will show up here.",
    },
    tools: { label: "Vendor tools", href: routes.vendorTools },
    panels: [{ title: "Coming up", empty: "Events you're booked for or have a stall at will show up here." }, RECENT_MESSAGES],
  },
  freelancer: {
    description: "New work matched to your services.",
    empty: {
      title: "No bookings yet",
      description: "Booking requests and job posts that match you will show up here.",
    },
    tools: { label: "Freelancer tools", href: routes.freelancerTools },
    panels: [{ title: "Coming up", empty: "Events you're booked for will show up here." }, RECENT_MESSAGES],
  },
  attendee: {
    description: "Events you're going to and news from organisers you follow.",
    empty: {
      title: "Nothing here yet",
      description: "Events you're going to and news from organisers you follow will show up here.",
    },
    panels: [{ title: "Coming up", empty: "Events you're going to will show up here." }, RECENT_MESSAGES],
  },
  // no wireframe yet, so no right-hand column
  admin: {
    description: "What's waiting for review.",
    empty: {
      title: "Nothing to review",
      description: "Verification requests and reports will show up here.",
    },
    tools: { label: "Admin tools", href: routes.adminTools },
    panels: [],
  },
};

// The one "after you sign in, go here" page. Every role shares the URL and sees its own dashboard.
export default async function DashboardPage() {
  // signed in is enough: requiring a role here would bounce a user with no role between redirects forever
  const { role } = await requireSession();

  if (!role) {
    return (
      <>
        <PageHeader title="Dashboard" />
        <EmptyState
          title="Finish setting up your account"
          description="Your account doesn't have an account type yet, so there's nothing to show. This usually means sign-up didn't finish."
        />
      </>
    );
  }

  const { description, empty, tools, panels } = DASHBOARD[role];
  const main = (
    <>
      <PageHeader
        title="Dashboard"
        description={description}
        actions={
          tools && (
            <ButtonLink href={tools.href} primary>
              {tools.label}
            </ButtonLink>
          )
        }
      />
      <EmptyState {...empty} />
    </>
  );

  if (panels.length === 0) return main;
  return (
    <Columns
      aside={panels.map((panel) => (
        <Panel key={panel.title} {...panel} />
      ))}
    >
      {main}
    </Columns>
  );
}
