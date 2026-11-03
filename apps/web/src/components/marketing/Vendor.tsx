"use client";

import { useEffect, useRef, type CSSProperties } from "react";
import Image from "next/image";
import vendor from "@/content/landing/vendor.json";
import "./Vendor.css";

const clamp = (v: number) => Math.min(1, Math.max(0, v));
const easeOut = (t: number) => 1 - Math.pow(1 - t, 3); // quick start, soft landing

export default function Vendor() {
  const rootRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return; // everything stays in place

    const root = rootRef.current!;
    const text = root.querySelector<HTMLElement>(".vendor-text")!;
    const grid = root.querySelector<HTMLElement>(".vendor-cards")!;
    const lines = [...text.children] as HTMLElement[]; // heading, subheading, details
    const cards = [...root.querySelectorAll<HTMLElement>(".vendor-card")];

    // 0 when the element is just coming into view, 1 once it has risen to about a third of the way up
    const progress = (el: HTMLElement) => {
      const vh = window.innerHeight;
      return clamp((vh * 0.9 - el.getBoundingClientRect().top) / (vh * 0.6));
    };

    const frame = () => {
      // text: each line slides in from the left, one after another
      const pt = progress(text);
      lines.forEach((el, i) => {
        const t = easeOut(clamp((pt - i * 0.2) / 0.5));
        el.style.opacity = String(clamp(t * 2));
        el.style.transform = `translateX(${(1 - t) * -60}vw)`;
      });

      // cards: each slides in from the right, one after another
      const pc = progress(grid);
      cards.forEach((card, i) => {
        const t = easeOut(clamp((pc - i * 0.12) / 0.5));
        card.style.opacity = String(clamp(t * 2));
        card.style.transform = `translateX(${(1 - t) * 60}vw)`;
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
    <section className="vendor" id="vendor" ref={rootRef}>
      <div className="vendor-text">
        <h1>{vendor.heading}</h1>
        <h3>{vendor.subheading}</h3>
        <p>{vendor.details}</p>
      </div>

      <div className="vendor-cards">
        {vendor.cards.map((card) => (
          <div
            key={card.title}
            className="vendor-card"
            tabIndex={0}
            style={{ "--bg": card.bg, "--ink": card.ink } as CSSProperties}
          >
            <Image src={card.img} alt="" fill sizes="(max-width: 900px) 90vw, 30vw" className="vendor-img" />
            <div className="vendor-info">
              <h3>{card.title}</h3>
              <p>{card.point}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}