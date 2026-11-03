"use client"

import { useEffect, useRef, type CSSProperties } from "react";
import Image from "next/image";
import team from "@/content/landing/team.json"
import "./Team.css";

export default function Team() {
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = rootRef.current!;
    const items = root.querySelectorAll<HTMLElement>(".team-fade");

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            observer.unobserve(entry.target); // fade in once, don't replay
          }
        });
      },
      { threshold: 0.15, rootMargin: "0px 0px -8% 0px" }
    );

    items.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  return (
    <div className="team" ref={rootRef}>
      <div className="team-top">
        <h1 className="team-fade">{team.heading}</h1>
        <h3 className="team-fade" style={{ "--d": "120ms" } as CSSProperties}>
          {team.subheading}
        </h3>
      </div>
      <div className="team-bottom">
        {team.cards.map((card, index) => (
          <div
            className="team-card team-fade"
            key={index}
            // stagger within each row of 3
            style={{ "--d": `${(index % 3) * 120}ms` } as CSSProperties}
          >
            <div className="team-card-image">
              <Image
                src={card.image}
                alt={card.name}
                fill
                sizes="(max-width: 600px) 100vw, (max-width: 900px) 50vw, 33vw"
              />
            </div>
            <div className="team-card-info">
              <h4>{card.name}</h4>
              <p className="team-card-title">{card.title}</p>
              <p className="team-card-hobby">{card.hobby}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}