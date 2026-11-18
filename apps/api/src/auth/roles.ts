import { UserRole } from '@prisma/client';

const ROLE_ORDER: UserRole[] = ['admin', 'organiser', 'vendor', 'freelancer', 'attendee'];

export function roleFromGroups(groups: unknown): UserRole | undefined {
  if (!Array.isArray(groups)) return undefined;
  return ROLE_ORDER.find((r) => groups.includes(r));
}