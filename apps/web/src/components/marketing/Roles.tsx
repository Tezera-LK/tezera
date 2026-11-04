"use client";

import { useEffect, useRef, type CSSProperties } from "react";
import "./Roles.css";


// every scene has 4 boxes (the colours). The boxes of one scene turn into the boxes of the next.
const SCENES = [
  { title: "Organiser", colours: ["#526c80", "#70a98d", "#6f908b", "#7f9aad"] },
  { title: "Vendor", colours: ["#70a992", "#658095", "#b6c3a7", "#8aa7a0"] },
  { title: "Attendee", colours: ["#d77e70", "#f09eb4", "#e5c76c", "#e8a58f"] },
];
const SCREENS = 1; // how much scrolling one hand-over takes, in screens

const clamp = (v: number) => Math.min(1, Math.max(0, v));
const ease = (t: number) => -(Math.cos(Math.PI * t) - 1) / 2; // slow, fast, slow
type R = { x: number; y: number; w: number; h: number };
type Tile = { k: number; el: HTMLElement; a: R; b: R; ca: string; cb: string };

export default function Roles() {
  const hand = SCENES.length - 1; // number of hand-overs
  const rootRef = useRef<HTMLDivElement>(null);
  const poolRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = rootRef.current!;
    const scenes = [...root.querySelectorAll<HTMLElement>(".scene")];

    const frame = () => {
      const total = root.offsetHeight - window.innerHeight; // how far the stage can travel
      const p = clamp(-root.getBoundingClientRect().top / total) * hand; // 0 .. 3

      // progress of hand-over k: a short pause (0.2), the move (0.6), a short pause (0.2)
      const e = (k: number) => ease(clamp((p - k - 0.2) / 0.6));

      // a scene shows once it has arrived, until its own hand-over starts
      scenes.forEach((s, k) => {
        const arrived = k === 0 || e(k - 1) === 1;
        const leaving = k < hand && e(k) > 0;
        s.style.visibility = arrived && !leaving ? "visible" : "hidden";
        // details fade in once the tiles have landed (scene 1 is always there)
      });

      for (const t of tiles) {
        const m = e(t.k); // 0..1 for this tile's hand-over
        const live = m > 0 && m < 1; // only visible while its hand-over is running
        t.el.style.visibility = live ? "visible" : "hidden";
        if (!live) continue;

        const x = t.a.x + (t.b.x - t.a.x) * m;
        const y = t.a.y + (t.b.y - t.a.y) * m;
        t.el.style.width = `${t.a.w + (t.b.w - t.a.w) * m}px`;
        t.el.style.height = `${t.a.h + (t.b.h - t.a.h) * m}px`;
        t.el.style.background = `color-mix(in srgb, ${t.ca}, ${t.cb} ${m * 100}%)`;
        t.el.style.transform = `translate(${x}px, ${y}px) scale(${1 - 0.14 * Math.sin(Math.PI * m)})`;
      }
    };

    const pool = poolRef.current!;
    const stage = root.querySelector<HTMLElement>(".stage")!;
    const boxes = scenes.map((s) => [...s.querySelectorAll<HTMLElement>(".box")]);
    const copies = scenes.map((s) => s.querySelector<HTMLElement>(".copy")!);
    let tiles: Tile[] = [];

    // position of an element inside the stage
    const rect = (el: HTMLElement): R => {
      const o = stage.getBoundingClientRect();
      const r = el.getBoundingClientRect();
      return { x: r.left - o.left, y: r.top - o.top, w: r.width, h: r.height };
    };

    // piece n (0..5) of a box: 3 across, 2 down
    const cell = (b: R, n: number): R => ({
      x: b.x + ((n % 3) * b.w) / 3,
      y: b.y + (Math.floor(n / 3) * b.h) / 2,
      w: b.w / 3,
      h: b.h / 2,
    });

    // make 6 tiles for every box of every hand-over
    const build = () => {
      pool.textContent = "";
      tiles = [];
      for (let k = 0; k < hand; k++) {
        boxes[k].forEach((from, i) => {
          const to = boxes[k + 1][i]; // box i of this scene becomes box i of the next
          const a = rect(from);
          const b = rect(to);
          const ca = getComputedStyle(from).backgroundColor;
          const cb = getComputedStyle(to).backgroundColor;
          for (let n = 0; n < 6; n++) {
            const el = document.createElement("i");
            pool.append(el);
            tiles.push({ k, el, a: cell(a, n), b: cell(b, n), ca, cb });
          }
        });
      }
    };

    const redo = () => {
      build();
      frame();
    };
    redo();
    window.addEventListener("scroll", frame, { passive: true });
    window.addEventListener("resize", redo); // positions change when the window changes
    return () => {
      window.removeEventListener("scroll", frame);
      window.removeEventListener("resize", redo);
    };
  }, [hand]);

  return (
    <div className="roles" ref={rootRef} style={{ "--run": `${hand * SCREENS * 100}vh` } as CSSProperties}>
      <div className="stage">
        <div className="pool" ref={poolRef} aria-hidden="true" />
        {SCENES.map((s, k) => (
          <section key={s.title} className={k % 2 ? "scene flip" : "scene"}>
            <h2>{s.title}</h2>
            <div className="boxes">
              {s.colours.map((c) => (
                <div key={c} className="box" style={{ background: c }} />
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}