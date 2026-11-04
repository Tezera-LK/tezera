"use client";

import { useEffect, useRef, type CSSProperties } from "react";
import Image from "next/image";
import freelance from "@/content/landing/freelance.json";
import "./Freelance.css";

const clamp = (v: number) => Math.min(1, Math.max(0, v));

const SHRINK = 0.06; // how much a card is pressed down once the next one has covered it
const DIM = 0.4; // how dark it gets (0 to 1)

export default function Freelance() {
  const rootRef = useRef<HTMLElement>(null);

  useEffect(() => {
    // the pinning is plain CSS and stays; reduced motion only skips the scale and dimming
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const cards = [...rootRef.current!.querySelectorAll<HTMLElement>(".freelance-card")];
    let pins: number[] = []; // where each card sticks, in px from the top of the screen

    const measure = () => {
      pins = cards.map((c) => parseFloat(getComputedStyle(c).top));
    };

    const frame = () => {
      cards.forEach((card, i) => {
        const next = cards[i + 1];
        if (!next) return; // the last card is never covered
        // p: 0 when the next card first touches the bottom of this one, 1 once it has fully settled over it
        const start = pins[i] + card.offsetHeight;
        const end = pins[i + 1];
        const p = clamp((start - next.getBoundingClientRect().top) / (start - end));
        card.style.transform = `scale(${1 - SHRINK * p})`;
        card.style.setProperty("--dim", String(DIM * p));
      });
    };

    const redo = () => {
      measure();
      frame();
    };
    redo();
    window.addEventListener("scroll", frame, { passive: true });
    window.addEventListener("resize", redo);
    return () => {
      window.removeEventListener("scroll", frame);
      window.removeEventListener("resize", redo);
    };
  }, []);

  return (
    <section className="freelance" id="freelancer" ref={rootRef}>
      <div className="freelance-text">
        <h1>{freelance.heading}</h1>
        <h3>{freelance.subheading}</h3>
        <p>{freelance.details}</p>
      </div>

      <div className="freelance-cards">
        {freelance.cards.map((card, i) => (
          <div
            key={card.title}
            className="freelance-card"
            tabIndex={0}
            style={{ "--bg": card.bg, "--ink": card.ink, "--i": i, "boxShadow": card.bg } as CSSProperties}
          >
            <Image src={card.img} alt="" fill sizes="(max-width: 960px) 90vw, 960px" className="freelance-img" />
            <div className="freelance-info">
              <h3>{card.title}</h3>
              <p>{card.point}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}