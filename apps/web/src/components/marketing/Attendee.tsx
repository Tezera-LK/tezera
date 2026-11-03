"use client";

import { useEffect, useRef, type CSSProperties } from "react";
import Image from "next/image";
import attendee from "@/content/landing/attendee.json";
import "./Attendee.css";

const clamp = (v: number) => Math.min(1, Math.max(0, v));
const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);

export default function Attendee() {
  const rootRef = useRef<HTMLElement>(null);
  const last = attendee.cards.length - 1;

  useEffect(() => {
    const root = rootRef.current!;
    const view = root.querySelector<HTMLElement>(".attendee-view")!;
    const track = root.querySelector<HTMLElement>(".attendee-track")!;
    const cards = [...root.querySelectorAll<HTMLElement>(".attendee-card")];
    const fades = [...root.querySelectorAll<HTMLElement>("[data-fade]")]; // heading, subheading, details, rail
    const fill = root.querySelector<HTMLElement>(".attendee-rail-fill")!;
    const stops = [...root.querySelectorAll<HTMLElement>(".attendee-stop")];

    // small screens and reduced motion: the CSS turns the track into a normal swipeable row
    const plain = window.matchMedia("(max-width: 900px), (prefers-reduced-motion: reduce)");
    let travel = 0; // how far the cards have to move sideways

    const reset = () => {
      root.style.removeProperty("--run");
      track.style.transform = "";
      fill.style.transform = "";
      fades.forEach((el) => {
        el.style.opacity = "";
        el.style.transform = "";
      });
      stops.forEach((s) => s.classList.remove("is-on"));
    };

    const measure = () => {
      travel = Math.max(0, track.getBoundingClientRect().width - view.getBoundingClientRect().width); // exact sizes, not rounded
      root.style.setProperty("--run", `${travel}px`); // the tall runway: one px of scroll per px of travel
    };

    const frame = () => {
      if (plain.matches) return;
      const vh = window.innerHeight;
      const top = root.getBoundingClientRect().top;

      // the text and rail fade up while the section scrolls into view
      const enter = clamp((vh * 0.9 - top) / (vh * 0.6));
      fades.forEach((el, i) => {
        const t = easeOut(clamp((enter - i * 0.18) / 0.5));
        el.style.opacity = String(t);
        el.style.transform = `translateY(${(1 - t) * 24}px)`;
      });

      // the journey: vertical scroll through the runway becomes sideways movement
      const total = root.offsetHeight - vh;
      const p = total > 0 ? clamp(-top / total) : 0;
      const shift = p * travel;
      track.style.transform = `translateX(${-shift}px)`;
      fill.style.transform = `scaleX(${p})`;

      // a stop lights up once its card is fully on screen
      cards.forEach((card, i) => {
        const fully = card.offsetLeft + card.offsetWidth - shift <= view.clientWidth + 1;
        stops[i].classList.toggle("is-on", fully);
      });
    };

    const redo = () => {
      if (plain.matches) {
        reset();
        return;
      }
      measure();
      frame();
    };

    redo();
    window.addEventListener("scroll", frame, { passive: true });
    window.addEventListener("resize", redo);
    plain.addEventListener("change", redo);
    return () => {
      window.removeEventListener("scroll", frame);
      window.removeEventListener("resize", redo);
      plain.removeEventListener("change", redo);
    };
  }, []);

  return (
    <section className="attendee" id="attendee" ref={rootRef}>
      <div className="attendee-stage">
        <div className="attendee-text">
          <h1 data-fade>{attendee.heading}</h1>
          <h3 data-fade>{attendee.subheading}</h3>
          <p data-fade>{attendee.details}</p>
        </div>

        <div className="attendee-right">
          <div className="attendee-view">
            <div className="attendee-track">
              {attendee.cards.map((card) => (
                <div
                  key={card.title}
                  className="attendee-card"
                  tabIndex={0}
                  style={{ "--bg": card.bg, "--ink": card.ink } as CSSProperties}
                >
                  <Image src={card.img} alt="" fill sizes="(max-width: 900px) 80vw, 540px" className="attendee-img" />
                  <div className="attendee-info">
                    <h3>{card.title}</h3>
                    <p>{card.point}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* progress rail: fills as you scroll, one stop per card */}
          <div className="attendee-rail" aria-hidden="true" data-fade>
            <div className="attendee-rail-fill" />
            {attendee.cards.map((card, i) => (
              <span
                key={card.title}
                className="attendee-stop"
                style={{ "--at": `${(i / last) * 100}%` } as CSSProperties}
              >
                <em>{card.title}</em>
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}