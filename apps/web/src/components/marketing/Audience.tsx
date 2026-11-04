"use client";

import { useEffect, useRef } from "react";
import type { CSSProperties } from "react";
import audience from "@/content/landing/audience.json";
import "./Audience.css";

type Variant = "organiser" | "vendor" | "attendee";

const variants = audience.variants as Variant[];
const { chipColours, tileColours, tileDelays, tileFlips } = audience;

export default function Audience() {
  const sectionRef = useRef<HTMLElement>(null);

  // fades the heading in and opens the cards when they scroll into view
  useEffect(() => {
    const root = sectionRef.current;
    if (!root) return;
    // reduced motion: leave everything visible, no animation
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const items = Array.from(root.querySelectorAll<HTMLElement>("[data-reveal]"));
    const grid = root.querySelector<HTMLElement>(".audience-cards");
    const stacked = window.matchMedia("(max-width: 900px)").matches;

    // hides everything in its starting state (in CSS, only applies once this class is set)
    root.classList.add("is-armed");

    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          // out of view and below the screen means the person scrolled back up past it
          const below = entry.boundingClientRect.top > 0;
          if (!entry.isIntersecting && !below) continue; // scrolled past it downwards: stay open

          // desktop: heading and all cards switch together; stacked: each piece on its own
          const group = stacked ? [entry.target] : items;
          group.forEach((el) => el.classList.toggle("is-in", entry.isIntersecting));
        }
      },
      { rootMargin: "0px 0px -25% 0px" },
    );

    const targets = stacked ? items : grid ? [grid] : [];
    targets.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  return (
    <section className="audience" ref={sectionRef}>
      <div className="audience-top" data-reveal>
        <h2 className="audience-heading">{audience.heading}</h2>
        <p className="audience-subheading">{audience.subheading}</p>
      </div>

      <div className="audience-cards">
        {audience.cards.map((card, i) => {
          const variant = variants[i % variants.length];

          return (
            <article
              key={card.title}
              className={`audience-card audience-card--${variant}`}
              data-reveal
            >
              {/* the mosaic that flips away to open the card */}
              <div className="audience-tiles" aria-hidden="true">
                {tileColours[variant].map((colour, t) => (
                  <i
                    key={t}
                    style={
                      {
                        background: colour,
                        "--d": `${tileDelays[t]}s`,
                        "--flip": tileFlips[t],
                      } as CSSProperties
                    }
                  />
                ))}
              </div>

              <div className="audience-chips" aria-hidden="true">
                {chipColours[variant].map((row, r) => (
                  <div key={r} className="audience-chip-row">
                    {row.map((colour, c) => (
                      <span
                        key={c}
                        className="audience-chip"
                        style={{
                          background: colour,
                          "--i": r * 6 + c,
                        } as CSSProperties}
                      />
                    ))}
                  </div>
                ))}
              </div>

              <div className="audience-body">
                <h3>{card.title}</h3>
                <p className="audience-user-line">{card.userLine}</p>
                <ul>
                  {card.points.map((point) => (
                    <li key={point}>{point}</li>
                  ))}
                </ul>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}