import type { ProviderEvent } from "@/lib/data/provider-types";
import styles from "./StallMap.module.css";

type StallMapProps = {
  zones: ProviderEvent["zones"];
  // the provider's own stall, filled in the role colour
  mine?: string | null;
  // stalls that match an item search, outlined
  matches?: string[];
  // the small version for a side panel (V15)
  small?: boolean;
};

// A simple venue map: each zone as a box with its stall numbers (V15's panel, V81). Drawn from the
// event's zone list until the Venue map slice (O11–O71) gives real positions.
export default function StallMap({ zones, mine, matches = [], small }: StallMapProps) {
  return (
    <div className={`${styles.map} ${small ? styles.small : ""}`} role="img" aria-label={mine ? `Venue map. Your stall is ${mine}.` : "Venue map"}>
      {zones.map((zone) => (
        <div key={zone.name} className={`${styles.zone} ${zone.stalls.length === 0 ? styles.stage : ""}`}>
          <span className={styles.zoneName}>{`${zone.name} · ${zone.label}`}</span>
          {zone.stalls.length > 0 && (
            <span className={styles.stalls}>
              {zone.stalls.map((stall) => (
                <span key={stall} className={`${styles.stall} ${stall === mine ? styles.mine : ""} ${matches.includes(stall) ? styles.match : ""}`}>
                  {stall}
                </span>
              ))}
            </span>
          )}
        </div>
      ))}
    </div>
  );
}
