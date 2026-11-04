// ─────────────────────────────────────────────────────────────
// ROLES: the four account types and everything that differs between them
// File: src/lib/roles.ts
//
// Tezera has one sign-up/log-in system, but each account type has its
// own colours (set in AuthLayout.module.css), its own wording, and its
// own setup steps. Everything role-specific that ISN'T a colour lives in
// this one file, so the forms can stay the same for every role and just
// read what they need from here.
//
// The role is part of the web address: /attendee/signup, /vendor/login...
// (The PRD calls attendees "consumers"; the app says "attendee" everywhere.)
// ─────────────────────────────────────────────────────────────

// The four public roles, in the order the role cards show them.
// "as const" tells TypeScript these exact words will never change, so it
// can build the Role type below from them.
// (Admin is NOT here: nobody can sign up as an admin.)
export const ROLES = ["attendee", "organiser", "vendor", "freelancer"] as const;

// (typeof ROLES)[number] = "any one item of the ROLES list", so
// Role = "attendee" | "organiser" | "vendor" | "freelancer".
// If a role is ever added to ROLES, this type updates by itself.
export type Role = (typeof ROLES)[number];

// Checks whether some text from the web address is one of our roles.
// "value is Role" is a TYPE GUARD: after `if (isRole(x))`, TypeScript
// knows x is a Role, not just any string.
export function isRole(value: string): value is Role {
  return (ROLES as readonly string[]).includes(value);
}

// The auth screens. Each one is a folder inside app/(auth)/[role]/.
export type Screen = "signup" | "login" | "verify" | "reset-password" | "setup" | "verification" | "home";

// Headline and sentence on the coloured brand panel.
type PanelCopy = { title: string; text: string };

// One document an admin needs to see before giving the Verified badge.
type DocumentSlot = { label: string; hint: string };

// One way of getting verified, e.g. "registered business" or "individual".
type VerificationOption = { id: string; label: string; documents: DocumentSlot[] };

type RoleInfo = {
  name: string;            // shown on the role card, e.g. "Organiser"
  cardText: string;        // the small line under it
  // Brand panel wording. "default" is used for any screen not listed.
  // Partial<Record<Screen, PanelCopy>> = "optionally, one PanelCopy per screen".
  panel: { default: PanelCopy } & Partial<Record<Screen, PanelCopy>>;
  signupSubtitle: string;
  // Steps shown in the progress bar on the setup and verification screens.
  steps: string[];
  // Only organisers, vendors and freelancers are verified (PRD AC-08, AC-09).
  // "?" = optional: attendees don't have this.
  verification?: {
    options: VerificationOption[];
    lockedUntilVerified: string[]; // what they can't do yet
  };
};

// Documents (proposed in the PRD: business registration for companies,
// NIC for individuals).
const BUSINESS_REG: DocumentSlot = {
  label: "Business registration certificate",
  hint: "A clear scan or photo of the whole certificate.",
};
const NIC: DocumentSlot = {
  label: "NIC, front and back",
  hint: "Two photos, or one PDF with both sides.",
};

// Record<Role, RoleInfo> = an object with exactly one RoleInfo per role.
// TypeScript complains if a role is missing or misspelt.
export const ROLE_INFO: Record<Role, RoleInfo> = {
  attendee: {
    name: "Attendee",
    cardText: "I go to events",
    panel: {
      default: {
        title: "Every event in Sri Lanka, in one place.",
        text: "Find events, plan with friends and follow live updates on the day.",
      },
    },
    signupSubtitle: "One account, one role. You can browse events without one.",
    steps: ["Your account", "Your feed"],
  },

  organiser: {
    name: "Organiser",
    cardText: "I run events",
    panel: {
      default: {
        title: "Every event in Sri Lanka, in one place.",
        text: "Find events, plan with friends and follow live updates on the day.",
      },
    },
    signupSubtitle: "One account, one role. You can browse events without one.",
    steps: ["Your account", "Your profile", "Get verified"],
    verification: {
      options: [
        { id: "business", label: "We're a registered business", documents: [BUSINESS_REG] },
        { id: "individual", label: "I organise events as an individual", documents: [NIC] },
      ],
      lockedUntilVerified: ["Opening stall slots", "Posting jobs", "Sending booking requests"],
    },
  },

  vendor: {
    name: "Vendor",
    cardText: "My business provides services",
    panel: {
      default: {
        title: "Grow your business at every event in Sri Lanka.",
        text: "Get booked by organisers, run stalls at festivals and build a profile people trust.",
      },
      login: {
        title: "Welcome back.",
        text: "Your requests, bookings and stalls are where you left them.",
      },
      "reset-password": {
        title: "Locked out? It happens.",
        text: "Get a reset code by email or text and you will be back in a minute.",
      },
      setup: {
        title: "Tell organisers what you do.",
        text: "A full profile ranks higher in provider search. You can change all of this later.",
      },
      verification: {
        title: "Get the Verified badge.",
        text: "You can build your profile and apply for stalls while an admin checks your documents.",
      },
    },
    signupSubtitle: "One account, one role. To go to events as a guest too, use a second account.",
    steps: ["Your account", "Your business", "Get verified"],
    verification: {
      options: [{ id: "business", label: "Registered business", documents: [BUSINESS_REG, { ...NIC, label: "Owner's NIC, front and back" }] }],
      lockedUntilVerified: ["Accepting bookings"],
    },
  },

  freelancer: {
    name: "Freelancer",
    cardText: "I work events as an individual",
    // No freelancer design yet: same as the vendor screens, reworded for one person.
    panel: {
      default: {
        title: "Get hired for your skills at every event in Sri Lanka.",
        text: "Get booked by organisers and build a portfolio people trust.",
      },
      login: {
        title: "Welcome back.",
        text: "Your requests, bookings and messages are where you left them.",
      },
      "reset-password": {
        title: "Locked out? It happens.",
        text: "Get a reset code by email or text and you will be back in a minute.",
      },
      setup: {
        title: "Tell organisers what you do.",
        text: "A full profile ranks higher in provider search. You can change all of this later.",
      },
      verification: {
        title: "Get the Verified badge.",
        text: "You can build your profile and portfolio while an admin checks your documents.",
      },
    },
    signupSubtitle: "One account, one role. To go to events as a guest too, use a second account.",
    steps: ["Your account", "Your profile", "Get verified"],
    verification: {
      options: [{ id: "individual", label: "Individual", documents: [NIC] }],
      lockedUntilVerified: ["Accepting bookings"],
    },
  },
};

// The brand panel wording for one role on one screen.
// ?? = "use the screen's own copy if there is one, otherwise the default".
export function panelCopy(role: Role, screen: Screen): PanelCopy {
  return ROLE_INFO[role].panel[screen] ?? ROLE_INFO[role].panel.default;
}
