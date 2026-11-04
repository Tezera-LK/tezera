"use client"

import { useEffect, useRef, type CSSProperties, type ReactNode } from "react";
import "@/components/marketing/Hero.css";
import { hero } from "@/content";
import { onRevealed } from "@/components/marketing/reveal";

// small decorative squares: x/y = position %, s = width %, amp = float distance, dur = seconds, z = parallax depth.
// m = where the square sits on phones (in the gaps beside the stacked cards); squares without m are hidden there.
const chips = [
  { c: "gray", x: 8, y: 11, s: 6.3, amp: 6, dur: 5.2, z: 0.5 },
  { c: "green", x: 44.5, y: 11, s: 8.3, amp: 8, dur: 6.1, z: 1.2, m: { x: 80, y: 4, s: 10 } },
  { c: "gray", x: 55.5, y: 13, s: 10.7, amp: 7, dur: 5.6, z: 0.7 },
  { c: "red", x: 71.5, y: 14.5, s: 8.3, amp: 8, dur: 4.8, z: 1.4, m: { x: 88, y: 20, s: 7 } },
  { c: "blue", x: 7.4, y: 61, s: 11.8, amp: 9, dur: 5.4, z: 1.1, m: { x: 5, y: 46, s: 11 } },
  { c: "red", x: 74, y: 54.8, s: 10, amp: 8, dur: 5.1, z: 0.6 },
  { c: "gray", x: 62.3, y: 66.8, s: 7.4, amp: 6, dur: 5.7, z: 1.3, m: { x: 16, y: 58, s: 6 } },
  { c: "red", x: 57.3, y: 82, s: 10.4, amp: 9, dur: 6.4, z: 0.8, m: { x: 80, y: 78, s: 9 } },
  { c: "gray", x: 33.6, y: 89.6, s: 8.1, amp: 6, dur: 5.5, z: 1.2 },
  { c: "green", x: 100, y: 40, s: 8.1, amp: 6, dur: 5.5, z: 0.9 },
];

// the three cards: order = entrance order, z = parallax depth.
// [data-count] numbers count up from 0 once the card has landed (same text, just animated in)
const cards = [
  {
    cls: "organiser-box", dur: "6s", delay: "-1s", z: 0.35,
    body: (
      <>
        <p className="card-label">ORGANISER</p>
        <p className="card-title">Saturday Colombo Food Fair</p>
        <p className="card-sub"><span data-count="68">68</span>% vendor slots filled</p>
        <div className="bar"><div className="bar-fill" style={{ width: "68%" }} /></div>
      </>
    ),
  },
  {
    cls: "vendor-box", dur: "5.4s", delay: "-2.5s", z: 0.6,
    body: (
      <>
        <p className="card-label">VENDOR</p>
        <p className="card-title">Wedding Photographer <span className="card-needed">needed</span></p>
        <p className="card-sub">Kandy</p>
      </>
    ),
  },
  {
    cls: "attendee-box", dur: "6.6s", delay: "-4s", z: 0.45,
    body: (
      <>
        <p className="card-label">ATTENDEE</p>
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

  // hover: the card tilts toward the cursor and lifts; nearby chips drift away from it
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    const fine = window.matchMedia("(hover: hover) and (pointer: fine)");
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (!fine.matches || reduce.matches) return;

    const items = [...stage.querySelectorAll<HTMLElement>(".hero-card")];
    const chipEls = [...stage.querySelectorAll<HTMLElement>(".hero-chip")];
    const off: (() => void)[] = [];

    // centre of an element in stage coordinates (layout position, ignores the float/parallax)
    const centre = (el: HTMLElement) => ({ x: el.offsetLeft + el.offsetWidth / 2, y: el.offsetTop + el.offsetHeight / 2 });

    items.forEach((item) => {
      const tilt = item.querySelector<HTMLElement>(".hero-tilt")!;

      const onEnter = () => {
        item.classList.add("is-hovered");
        const c = centre(item);
        const reach = stage.offsetWidth * 0.6;
        chipEls.forEach((chip) => {
          const p = centre(chip);
          const dx = p.x - c.x;
          const dy = p.y - c.y;
          const d = Math.hypot(dx, dy) || 1;
          const push = 16 * Math.max(0, 1 - d / reach); // closer chips move further
          chip.style.translate = `${(dx / d) * push}px ${(dy / d) * push}px`;
        });
      };
      const onMove = (e: PointerEvent) => {
        const r = tilt.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width - 0.5; // -0.5..0.5
        const py = (e.clientY - r.top) / r.height - 0.5;
        tilt.style.transform = `perspective(700px) rotateX(${(-py * 12).toFixed(2)}deg) rotateY(${(px * 14).toFixed(2)}deg) translateY(-6px) scale(1.03)`;
      };
      const onLeave = () => {
        item.classList.remove("is-hovered");
        tilt.style.transform = "";
        chipEls.forEach((chip) => (chip.style.translate = ""));
      };

      item.addEventListener("pointerenter", onEnter);
      item.addEventListener("pointermove", onMove);
      item.addEventListener("pointerleave", onLeave);
      off.push(() => {
        item.removeEventListener("pointerenter", onEnter);
        item.removeEventListener("pointermove", onMove);
        item.removeEventListener("pointerleave", onLeave);
      });
    });
    return () => off.forEach((f) => f());
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
        {/* soft brand glow behind the cards, echoing the opening's colour blobs */}
        <div className="hero-glow" aria-hidden="true">
          <span className="glow-a" />
          <span className="glow-b" />
          <span className="glow-c" />
        </div>

        {/* layers per item: position + parallax (outer), entrance pop, [hover tilt], idle float (inner) */}
        {chips.map((chip, i) => (
          <span
            key={i}
            className="hero-item hero-chip"
            data-m={chip.m ? "" : undefined}
            style={{
              // position comes from CSS, so phones can swap in the m placement
              "--x": chip.x,
              "--y": chip.y,
              "--s": chip.s,
              "--m-x": chip.m?.x,
              "--m-y": chip.m?.y,
              "--m-s": chip.m?.s,
              "--z": chip.z,
              "--pop": `${0.75 + i * 0.05}s`,
            } as CSSProperties}
          >
            <span className="hero-pop">
              <span
                className={`chip chip-${chip.c}`}
                style={{
                  "--amp": `${chip.amp}px`,
                  "--dur": `${chip.dur}s`,
                  "--delay": `${-i * 0.9}s`,
                } as CSSProperties}
              />
            </span>
          </span>
        ))}

        {cards.map((card, i) => (
          <div
            key={card.cls}
            className={`hero-item hero-card ${card.cls}`}
            style={{ "--z": card.z, "--pop": `${0.35 + i * 0.12}s` } as CSSProperties}
          >
            <div className="hero-pop">
              <div className="hero-tilt">
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
