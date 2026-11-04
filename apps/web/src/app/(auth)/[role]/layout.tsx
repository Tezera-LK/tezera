// ─────────────────────────────────────────────────────────────
// ROLE LAYOUT: the frame around every auth page, in the role's colours
// File: src/app/(auth)/[role]/layout.tsx
//
// [role] in square brackets is a DYNAMIC SEGMENT: one folder that
// handles /attendee/..., /organiser/..., /vendor/... and /freelancer/...
// Next.js passes the actual word from the address as params.role.
//
// This layout:
//   1. checks the word is a real role (anything else gets a 404 page)
//   2. puts the role's class on the page, which sets its colours
//   3. draws the brand panel and the form column
//   4. connects the forms to our AWS backend (<ConfigureAmplify />)
// ─────────────────────────────────────────────────────────────

import { notFound } from "next/navigation";

import ConfigureAmplify from "@/components/ConfigureAmplify";
import BrandPanel from "@/components/auth/BrandPanel";
import styles from "@/components/auth/AuthLayout.module.css";
import { ROLES, isRole } from "@/lib/roles";

// generateStaticParams: the list of roles to build pages for in advance.
// Together with dynamicParams = false, any other word (e.g. /admin/login)
// gets a 404 instead of a page.
export function generateStaticParams() {
  return ROLES.map((role) => ({ role }));
}
export const dynamicParams = false;

// In Next.js 15+, params arrives as a PROMISE, so the layout is async
// and uses await to read it.
type RoleLayoutProps = {
  children: React.ReactNode;
  params: Promise<{ role: string }>;
};

export default async function RoleLayout({ children, params }: RoleLayoutProps) {
  const { role } = await params;

  // A safety check (and it tells TypeScript that role is a Role below).
  if (!isRole(role)) notFound();

  return (
    // Two classes: the layout (.page) and the role's colours (.vendor ...).
    // styles[role] looks up styles.attendee, styles.organiser and so on.
    <div className={`${styles.page} ${styles[role]}`}>
      <ConfigureAmplify />
      <BrandPanel role={role} />
      <main className={styles.formSide}>
        <div className={styles.formBox}>{children}</div>
      </main>
    </div>
  );
}
