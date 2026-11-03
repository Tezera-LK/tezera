"use client";

import { useEffect, useRef, type CSSProperties } from "react";
import Image from "next/image";
import organiser from "@/content/landing/organiser.json";
import "./Organiser.css";

const clamp = (v: number) => Math.min(1, Math.max(0, v));
const easeOut = (t: number) => 1 - Math.pow(1 - t, 3); // quick start, soft landing
const settle = (t: number) => 1 + 2.2 * Math.pow(t - 1, 3) + 1.2 * Math.pow(t - 1, 2); // lands with a small bounce

export default function Organiser() {
  const rootRef = useRef<HTMLElement>(null);
  const words = organiser.heading.split(" ");

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return; // everything stays in place

    const root = rootRef.current!;
    const text = root.querySelector<HTMLElement>(".organiser-text")!;
    const sub = root.querySelector<HTMLElement>(".organiser-text h3")!;
    const grid = root.querySelector<HTMLElement>(".organiser-cards")!;
    const wordEls = [...root.querySelectorAll<HTMLElement>(".organiser-word > span")];
    const cards = [...root.querySelectorAll<HTMLElement>(".organiser-card")];

    // 0 when the element is just coming into view, 1 once it has risen to about a third of the way up
    const progress = (el: HTMLElement) => {
      const vh = window.innerHeight;
      return clamp((vh * 0.9 - el.getBoundingClientRect().top) / (vh * 0.6));
    };

    const rows = Math.ceil(cards.length / 2);
    const step = 0.45 / Math.max(1, cards.length - 1);

    const frame = () => {
      // heading: one word after another
      const pt = progress(text);
      wordEls.forEach((w, i) => {
        const t = clamp((pt - (i / wordEls.length) * 0.5) / 0.4);
        w.style.transform = `translateY(${(1 - easeOut(t)) * 110}%)`;
      });
      const s = clamp((pt - 0.5) / 0.4);
      sub.style.opacity = String(s);
      sub.style.transform = `translateY(${(1 - s) * 16}px)`;

      // cards: drop in like blocks, bottom row first
      const pc = progress(grid);
      cards.forEach((card, i) => {
        const rank = (rows - 1 - Math.floor(i / 2)) * 2 + (i % 2);
        const t = clamp((pc - 0.15 - rank * step) / 0.4);
        card.style.opacity = String(clamp(t * 3));
        card.style.transform = `translateY(${(settle(t) - 1) * 120}%)`;
      });
    };

    frame();
    window.addEventListener("scroll", frame, { passive: true });
    window.addEventListener("resize", frame);
    return () => {
      window.removeEventListener("scroll", frame);
      window.removeEventListener("resize", frame);
    };
  }, []);

  return (
    <section className="organiser" id="organiser" ref={rootRef}>
      <div className="organiser-text">
        <h1>
          {words.map((word, i) => (
            <span key={i}>
              <span className="organiser-word">
                <span>{word}</span>
              </span>
              {" "}
            </span>
          ))}
        </h1>
        <h3>{organiser.subheading}</h3>
      </div>

      <div className="organiser-cards">
        {organiser.cards.map((card) => (
          <div
            key={card.title}
            className="organiser-card"
            tabIndex={0}
            style={{ "--bg": card.bg, "--ink": card.ink } as CSSProperties}
          >
            <Image src={card.img} alt="" fill sizes="(max-width: 900px) 90vw, 30vw" className="organiser-img" />
            <div className="organiser-info">
              <h3>{card.title}</h3>
              <p>{card.point}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}