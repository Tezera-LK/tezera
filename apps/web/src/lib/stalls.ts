import type { EventStalls, StallType } from "@/lib/data/portal-types";

// Helpers the Stalls tab (O13) and its actions share.

// The stall types an organiser can open slots for (O72), in Figma's order.
export const STALL_TYPES: StallType[] = ["Food", "Drinks", "Merchandise", "Crafts", "Other"];

// Every stall number in use: the ones the map gives out and the ones approved vendors hold.
export function usedNumbers(stalls: EventStalls): Set<string> {
  const used = new Set(Object.values(stalls.zones).flatMap((zone) => zone.taken));
  for (const stall of stalls.approved) if (stall.number) used.add(stall.number);
  return used;
}

// The numbers still free in a type's area of the venue map, e.g. B-15 and B-16 in the food court.
export function freeNumbers(stalls: EventStalls, type: StallType): string[] {
  const used = usedNumbers(stalls);
  return stalls.zones[type].numbers.filter((number) => !used.has(number));
}
