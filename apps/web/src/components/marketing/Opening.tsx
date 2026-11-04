"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import { useLenis } from "lenis/react";
import "@/components/marketing/Opening.css";
import { site } from "@/content";
import { markRevealed } from "@/components/marketing/reveal";

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
const MIN_LOAD = 1000; // the loader shows at least this long, so it never just flashes
const HOLD = 250; // after the loader fades out, the wordmark sits still this long before the dissolve
const PLAY = 2200; // how long the opening animation runs
const REVEAL_AT = 0.42; // point in the animation (0 -> 1) where the nav and hero start coming in underneath

// mosaic: gap between tiles (px) and the tile width it aims for, so phones get fewer, bigger tiles
const GAP = 5;
const TARGET_TILE = 110;

// loading: wordmark + loader | playing: loader fades out, then the opening animation | done: cover removed
type Phase = "loading" | "playing" | "done";

export default function Opening() {
  const [phase, setPhase] = useState<Phase>("loading");
  const lenis = useLenis();

  // the loader bar; painted straight from the fill loop, not through React state
  const loaderRef = useRef<HTMLDivElement>(null);

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
    // tiles per row from the screen width; each tile spans 2 columns, plus 1 spare column for the brick offset
    const perRow = Math.round(clamp(window.innerWidth / TARGET_TILE, 5, 12));
    const cols = perRow * 2 + 1;
    host.style.setProperty("--cols", String(cols));
    // one column's width
    const colWidth = (window.innerWidth - GAP * (cols - 1)) / cols;
    // a tile spans 2 columns
    const tileHeight = colWidth * 2 * 0.92;
    // number of rows that fill the screen height, + 1 spare
    const rows = Math.ceil(window.innerHeight / (tileHeight + GAP)) + 1;
    // wipes old tiles
    host.textContent = "";
    const list: Tile[] = [];
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < perRow; x++) {
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
    tiles.current.forEach((t) => {
      const k = clamp((P - (0.03 + t.order * 0.62)) / 0.34);
      const e = soft(k);
      t.el.style.visibility = k >= 1 ? "hidden" : "";
      t.el.style.transform = k > 0 ? `rotate${t.axis}(${t.dir * e * 180}deg) scale(${1 - e * 0.1})` : "";
      t.el.style.opacity = k > 0 ? String(1 - e) : "";
    });

    // start the nav + hero entrance while the tiles are still clearing
    if (P >= REVEAL_AT) markRevealed();
  }, []);

  // paints the loader bar for v (0 -> 1)
  const paintLoader = useCallback((v: number) => {
    const el = loaderRef.current;
    if (!el) return;
    el.style.setProperty("--p", String(v));
    el.setAttribute("aria-valuenow", String(Math.round(v * 100)));
  }, []);

  // lock scrolling (and hide the scrollbar) while the cover is up, release it when it's gone
  useEffect(() => {
    const root = document.documentElement;
    if (phase === "done") {
      lenis?.start();
      root.classList.remove("is-loading");
      return;
    }
    lenis?.stop();
    root.classList.add("is-loading");
    return () => root.classList.remove("is-loading");
  }, [phase, lenis]);

  // mount: build tiles, wait for the page to load, then play the animation
  useEffect(() => {
    reduce.current = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    // coming back to this page in the same tab: hide the nav + hero again until the cover lifts
    document.documentElement.classList.remove("is-revealed");
    window.scrollTo(0, 0);
    build();

    let raf = 0;
    let cancelled = false;

    // after loading: play the opening animation
    const play = () => {
      // reduced motion: skip the animation, just remove the cover
      if (reduce.current) {
        markRevealed();
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
    };

    // the loader fills toward how much work is done (page load + fonts), never faster than MIN_LOAD
    // for the whole bar, so it shows real progress but never just flashes
    let done = 0;
    let target = 0.08; // a sliver straight away, so it reads as a loader
    const finish = () => {
      if (cancelled) return;
      done += 1;
      target = Math.max(target, done / 2);
    };
    new Promise<void>((res) => {
      if (document.readyState === "complete") res();
      else window.addEventListener("load", () => res(), { once: true });
    }).then(finish);
    (document.fonts?.ready ?? Promise.resolve()).then(finish);

    let shown = 0;
    let last = performance.now();
    const fill = (now: number) => {
      shown = Math.min(target, shown + (now - last) / MIN_LOAD);
      last = now;
      paintLoader(shown);
      if (shown < 1) raf = requestAnimationFrame(fill);
      else play();
    };
    raf = requestAnimationFrame(fill);

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
  }, [build, render, paintLoader]);

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

      {/* loader under the wordmark; fades out once loading is done */}
      <div
        ref={loaderRef}
        className={`loader${phase === "loading" ? "" : " loader-out"}`}
        role="progressbar"
        aria-label="Loading"
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <span className="loader-bar" />
      </div>
    </div>
  );
}
