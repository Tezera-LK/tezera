"use client"

import { useEffect, useRef, type CSSProperties, type ReactNode } from "react";
import "@/components/marketing/Hero.css";
import { hero } from "@/content";
import { onRevealed } from "@/components/marketing/reveal";
import HeroStage from "@/components/marketing/HeroStage";

// the three cards, styled as screens on the stage: order = entrance order, z = parallax depth.
// [data-count] numbers count up from 0 once the card has landed (same text, just animated in)
const cards = [
  {
    cls: "organiser-box", dur: "6s", delay: "-1s", z: 0.35,
    body: (
      <>
        <p className="card-label"><span className="card-led" aria-hidden="true" />ORGANISER</p>
        <p className="card-title">Saturday Colombo Food Fair</p>
        <p className="card-sub"><span data-count="68">68</span>% vendor slots filled</p>
        <div className="bar"><div className="bar-fill" style={{ "--fill": "68%" } as CSSProperties} /></div>
      </>
    ),
  },
  {
    cls: "vendor-box", dur: "5.4s", delay: "-2.5s", z: 0.6,
    body: (
      <>
        <p className="card-label"><span className="card-led" aria-hidden="true" />VENDOR</p>
        <p className="card-title">Wedding Photographer <span className="card-needed">needed</span></p>
        <p className="card-sub">Kandy</p>
      </>
    ),
  },
  {
    cls: "attendee-box", dur: "6.6s", delay: "-4s", z: 0.45,
    body: (
      <>
        <p className="card-label"><span className="card-led" aria-hidden="true" />ATTENDEE</p>
        <p className="card-title">Rooftop Sunset Set</p>
        <p className="card-sub"><span data-count="112">112</span> Going</p>
      </>
    ),
  },
];

// live details: counting starts this long after the hand-off (cards have popped in by then)
const COUNT_DELAY = 900; // ms; keep in step with the bar fill delay in Hero.css
const COUNT_TIME = 1400; // ms

// splits the headline (plain words plus <span class='...'>word</span>) into words,
// keeping each highlight's class, so every word can rise in on its own
function headlineWords(html: string): ReactNode[] {
  const words: ReactNode[] = [];
  const pattern = /<span class='([^']+)'>(.*?)<\/span>|(\S+)/g;
  let m: RegExpExecArray | null;
  let i = 0;
  while ((m = pattern.exec(html))) {
    const word = m[1] ? <span className={m[1]}>{m[2]}</span> : m[3];
    words.push(
      <span className="hero-word" key={i} style={{ "--i": i } as CSSProperties}>
        <span>{word}</span>
      </span>,
      " ",
    );
    i += 1;
  }
  return words;
}

export default function Hero() {
  const stageRef = useRef<HTMLDivElement>(null);

  // cursor parallax: mouse/trackpad only, never with reduced motion
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    const fine = window.matchMedia("(hover: hover) and (pointer: fine)");
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (!fine.matches || reduce.matches) return;

    let raf = 0;
    // target and current offsets, -1..1 from the centre of the screen
    let tx = 0, ty = 0, x = 0, y = 0;

    const tick = () => {
      // ease toward the cursor so the cards drift instead of snapping
      x += (tx - x) * 0.08;
      y += (ty - y) * 0.08;
      stage.style.setProperty("--mx", x.toFixed(4));
      stage.style.setProperty("--my", y.toFixed(4));
      raf = Math.abs(tx - x) + Math.abs(ty - y) > 0.001 ? requestAnimationFrame(tick) : 0;
    };
    const onMove = (e: PointerEvent) => {
      tx = (e.clientX / window.innerWidth) * 2 - 1;
      ty = (e.clientY / window.innerHeight) * 2 - 1;
      if (!raf) raf = requestAnimationFrame(tick);
    };
    // pointer left the window: drift back to rest
    const onLeave = () => {
      tx = 0;
      ty = 0;
      if (!raf) raf = requestAnimationFrame(tick);
    };

    window.addEventListener("pointermove", onMove, { passive: true });
    document.documentElement.addEventListener("pointerleave", onLeave);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("pointermove", onMove);
      document.documentElement.removeEventListener("pointerleave", onLeave);
    };
  }, []);

  // live details: numbers count up once the cards have landed (reduced motion: they just show)
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const nums = [...stage.querySelectorAll<HTMLElement>("[data-count]")];
    // reserve the final number's width (digits are fixed-width), so "0%" and "68%" wrap the same
    // and the card never changes size while counting
    nums.forEach((n) => {
      n.style.minWidth = `${(n.dataset.count ?? "").length}ch`;
      n.textContent = "0";
    });

    let raf = 0;
    let timer = 0;
    const ease = (t: number) => 1 - Math.pow(1 - t, 4); // fast start, long soft finish
    const unsubscribe = onRevealed(() => {
      timer = window.setTimeout(() => {
        const start = performance.now();
        const tick = (now: number) => {
          const t = Math.min(1, (now - start) / COUNT_TIME);
          nums.forEach((n) => (n.textContent = String(Math.round(Number(n.dataset.count) * ease(t)))));
          if (t < 1) raf = requestAnimationFrame(tick);
        };
        raf = requestAnimationFrame(tick);
      }, COUNT_DELAY);
    });

    return () => {
      unsubscribe();
      clearTimeout(timer);
      cancelAnimationFrame(raf);
      nums.forEach((n) => (n.textContent = n.dataset.count ?? ""));
    };
  }, []);

  return (
    <div className="hero">
      {/* the LED wall; .hero-floor marks where the crowd stands (sized in CSS, read by HeroStage) */}
      <HeroStage />
      <div className="hero-floor" aria-hidden="true" />

      <div className="left">
        <div className="top">
          <div className="headline">
            <h1>{headlineWords(hero.headline)}</h1>
          </div>
        </div>
        <div className="bottom">
          <div className="descriptions hero-rise" style={{ "--d": "0.55s" } as CSSProperties}>
            <p>{hero.subhead}</p>
            <p>{hero.detail}</p>
          </div>
          <div className="signup hero-rise" style={{ "--d": "0.7s" } as CSSProperties}>
            <button>
              SIGN UP
              <span className="signup-arrow" aria-hidden="true">→</span>
            </button>
            <a href="http://">Explore Events</a>
          </div>
        </div>
      </div>

      <div className="right" ref={stageRef}>
        {/* layers per card: position + parallax (outer), entrance pop, hover lift, idle float (inner) */}
        {cards.map((card, i) => (
          <div
            key={card.cls}
            className={`hero-item hero-card ${card.cls}`}
            style={{ "--z": card.z, "--pop": `${0.35 + i * 0.12}s` } as CSSProperties}
          >
            <div className="hero-pop">
              <div className="hero-lift">
                <div className="card" style={{ "--dur": card.dur, "--delay": card.delay } as CSSProperties}>
                  {card.body}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
