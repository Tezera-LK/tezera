"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import { useLenis } from "lenis/react";
import "@/components/marketing/Opening.css";
import { site } from "@/content";

// random number generator to keep a fixed scatter of tiles, on every reload
const makeRng = (seed: number) => {
  let s = seed;
  return () => (s = (s * 9301 + 49297) % 2333280) / 233280;
};
// forces a number to stay between 'a' and 'b'. Defaults are 0 and 1
const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));
// ease-in-out curve
const soft = (t: number) => -(Math.cos(Math.PI * t) - 1) / 2;

// tile object
type Tile = {
  el: HTMLElement;
  order: number;
  dir: 1 | -1;
  axis: "X" | "Y";
};

// header text
const WORD = site.wordmark;

// timing (ms)
const MIN_LOAD = 1400; // the loader shows at least this long, so it never just flashes
const HOLD = 900; // after the loader leaves, the wordmark sits still this long before the dissolve
const PLAY = 2600; // how long the opening animation runs

// loading: the three boxes | playing: loader fades out, then the opening animation | done: cover removed
type Phase = "loading" | "playing" | "done";

export default function Opening() {
  const [phase, setPhase] = useState<Phase>("loading");
  const lenis = useLenis();

  // grid container for inserting tiles
  const tilesRef = useRef<HTMLDivElement>(null);
  // array of ref, one per letter
  const letterRefs = useRef<(HTMLSpanElement | null)[]>([]);
  // array for background + 3 blobs, so they fade together
  const blobRefs = useRef<(HTMLDivElement | null)[]>([]);
  // list of tile objects
  const tiles = useRef<Tile[]>([]);
  // latest animation progress (0 -> 1), so a resize can redraw the same frame
  const progress = useRef(0);
  // flag to check if visitor has reduce motion turned on in their OS
  const reduce = useRef(false);

  const build = useCallback(() => {
    const host = tilesRef.current;
    if (!host) return;
    // fresh generator each build so result is identical every time
    const range = makeRng(7);
    // one column's width
    const colWidth = (window.innerWidth - 24 * 5) / 25;
    // a tile spans 2 columns
    const tileHeight = colWidth * 2 * 0.92;
    // number of rows that fill the screen height, + 1 spare
    const rows = Math.ceil(window.innerHeight / (tileHeight + 5)) + 1;
    // wipes old tiles
    host.textContent = "";
    const list: Tile[] = [];
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < 12; x++) {
        const el = document.createElement("i");
        el.style.background = range() < 0.2 ? "#e8e9ebb0" : "#ffffff47";
        if (y % 2 === 0 && x === 0) el.className = "off";
        host.append(el);
        list.push({
          el,
          order: range(),
          dir: range() < 0.5 ? 1 : -1,
          axis: range() < 0.65 ? "Y" : "X",
        });
      }
    }
    // normalise the random order to 0..1
    [...list]
      .sort((p, q) => p.order - q.order)
      .forEach((t, i, arr) => {
        t.order = i / Math.max(1, arr.length);
      });
    tiles.current = list;
  }, []);

  // draws one frame for a given progress P (0 -> 1)
  const render = useCallback((P: number) => {
    progress.current = P;

    // first half of the animation drives the letters
    const tp = soft(clamp(P / 0.5));
    // letters' distance from the centre
    const mid = (WORD.length - 1) / 2;
    letterRefs.current.forEach((s, i) => {
      if (!s) return;
      s.style.transform = `translateX(${(i - mid) * tp * 0.9}em)`;
      s.style.opacity = String(1 - tp);
      s.style.filter = tp > 0 ? `blur(${tp * 6}px)` : "none";
    });

    // fade the slate + blobs
    const backgroundFade = 1 - soft(clamp((P - 0.08) / 0.86));
    blobRefs.current.forEach((b) => b && (b.style.opacity = String(backgroundFade)));

    // each tile flips and fades on its own slice of the timeline
    for (const t of tiles.current) {
      const k = clamp((P - (0.03 + t.order * 0.62)) / 0.34);
      const e = soft(k);
      t.el.style.visibility = k >= 1 ? "hidden" : "";
      t.el.style.transform = k > 0 ? `rotate${t.axis}(${t.dir * e * 180}deg) scale(${1 - e * 0.1})` : "";
      t.el.style.opacity = k > 0 ? String(1 - e) : "";
    }
  }, []);

  // lock scrolling while the cover is up, release it when it's gone
  useEffect(() => {
    if (phase === "done") {
      lenis?.start();
      document.documentElement.style.overflow = "";
      return;
    }
    lenis?.stop();
    document.documentElement.style.overflow = "hidden";
    return () => {
      document.documentElement.style.overflow = "";
    };
  }, [phase, lenis]);

  // mount: build tiles, wait for the page to load, then play the animation
  useEffect(() => {
    reduce.current = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.scrollTo(0, 0);
    build();

    let raf = 0;
    let cancelled = false;

    // all three must finish before the animation starts
    const pageLoaded = new Promise<void>((res) => {
      if (document.readyState === "complete") res();
      else window.addEventListener("load", () => res(), { once: true });
    });
    const fontsReady: Promise<unknown> = document.fonts?.ready ?? Promise.resolve();
    const minWait = new Promise<void>((res) => setTimeout(res, MIN_LOAD));

    Promise.all([pageLoaded, fontsReady, minWait]).then(() => {
      if (cancelled) return;
      // reduced motion: skip the animation, just remove the cover
      if (reduce.current) {
        setPhase("done");
        return;
      }
      setPhase("playing");
      const start = performance.now() + HOLD;
      const tick = (now: number) => {
        const P = clamp((now - start) / PLAY);
        render(P);
        if (P < 1) raf = requestAnimationFrame(tick);
        else setPhase("done");
      };
      raf = requestAnimationFrame(tick);
    });

    // on resize, rebuild the tiles and redraw the current frame
    const onResize = () => {
      if (!tilesRef.current) return;
      build();
      render(progress.current);
    };
    window.addEventListener("resize", onResize);

    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
    };
  }, [build, render]);

  // animation finished: remove the cover from the page
  if (phase === "done") return null;

  return (
    <div className="opening">
      <div className="opening-bg" ref={(el) => { blobRefs.current[0] = el; }} />
      <div className="blob blob-a" ref={(el) => { blobRefs.current[1] = el; }} />
      <div className="blob blob-b" ref={(el) => { blobRefs.current[2] = el; }} />
      <div className="blob blob-c" ref={(el) => { blobRefs.current[3] = el; }} />
      <div className="tiles" ref={tilesRef} />

      {/* decorative: the real h1 is in Hero, so this stays out of the accessibility tree */}
      <div className="wordmark" aria-hidden="true">
        <div className="wordmark-text">
          {WORD.split("").map((ch, i) => (
            <span key={i} ref={(el) => { letterRefs.current[i] = el; }}>{ch}</span>
          ))}
        </div>
      </div>

      {/* loading screen: covers everything until the page is ready, then fades out */}
      <div className={`loader${phase === "loading" ? "" : " loader-out"}`} role="status" aria-label="Loading">
        <div className="loader-boxes">
          <span className="loader-box loader-box-1" />
          <span className="loader-box loader-box-2" />
          <span className="loader-box loader-box-3" />
        </div>
      </div>
    </div>
  );
}