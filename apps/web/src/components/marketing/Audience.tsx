"use client";

import { useEffect, useRef } from "react";
import type { CSSProperties } from "react";
import audience from "@/content/landing/audience.json";
import "./Audience.css";

// one colour scheme per card, in the same order as audience.cards
const variants = ["organiser", "vendor", "attendee"] as const;
type Variant = (typeof variants)[number];

// decorative chips in the top-right corner of each card: two rows of six
const chipColours: Record<Variant, string[][]> = {
  organiser: [
    ["#7b9a8d", "#8ea79a", "#7a8fa6", "#8397ad", "#7b9a8d", "#e3e8ee"],
    ["#72b08e", "#dfe5ee", "#7b9a8d", "#8ea79a", "#dfe5ee", "#7b9a8d"],
  ],
  vendor: [
    ["#b9c4a7", "#e8ece6", "#b9c4a7", "#b9c4a7", "#e8ece6", "#6f86a0"],
    ["#b9c4a7", "#4f8b73", "#b9c4a7", "#e8ece6", "#6f86a0", "#6f86a0"],
  ],
  attendee: [
    ["#c46f68", "#e6c86a", "#e6c86a", "#eea0b8", "#eea0b8", "#e6c86a"],
    ["#e6c86a", "#eea0b8", "#e6c86a", "#eea0b8", "#e6c86a", "#f7f0ed"],
  ],
};

// the mosaic that covers each card before it opens: 3 columns x 4 rows, row by row
const tileColours: Record<Variant, string[]> = {
  organiser: [
    "#6f908a", "#536f82", "#6f908a",
    "#536f82", "#536f82", "#536f82",
    "#536f82", "#70a98c", "#536f82",
    "#536f82", "#536f82", "#536f82",
  ],
  vendor: [
    "#b8c4a8", "#66809a", "#66809a",
    "#70aa90", "#70aa90", "#70aa90",
    "#66809a", "#70aa90", "#70aa90",
    "#70aa90", "#70aa90", "#70aa90",
  ],
  attendee: [
    "#d77e70", "#d77e70", "#d77e70",
    "#d77e70", "#d77e70", "#f09fb2",
    "#d77e70", "#e6c76a", "#e6c76a",
    "#f09fb2", "#d77e70", "#d77e70",
  ],
};

// fixed "random" values, so the server and the browser render the same thing
const tileDelays = [0.52, 0.12, 0.7, 0.3, 0.05, 0.62, 0.4, 0.78, 0.22, 0.56, 0.1, 0.68];
const tileFlips = [
  "rotateY(180deg)", "rotateX(180deg)", "rotateY(-180deg)", "rotateX(-180deg)",
  "rotateY(180deg)", "rotateY(-180deg)", "rotateX(180deg)", "rotateY(180deg)",
  "rotateX(-180deg)", "rotateY(-180deg)", "rotateY(180deg)", "rotateX(180deg)",
];

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
          if (!entry.isIntersecting) continue;
          io.unobserve(entry.target);
          // desktop: heading and all cards start in the same instant
          // stacked on mobile: each piece starts when it reaches the screen
          if (stacked) entry.target.classList.add("is-in");
          else items.forEach((el) => el.classList.add("is-in"));
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
                        style={{ background: colour, "--i": r * 6 + c } as CSSProperties}
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