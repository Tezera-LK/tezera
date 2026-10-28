"use client";

import { useRef, useEffect, useCallback } from "react";
import { useLenis } from "lenis/react";
import "@/components/marketing/Landing.css";

// random number generator to keep a fixed scatter of tiles, on every reload
const makeRng = (seed: number) => {
  let s = seed;
  return () => (s = (s * 9301 + 49297) % 2333280) / 233280;
}
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
  state: 0 | 1 | 2;
}

// header text
const WORD = "tezera";

export default function Landing() {
  // tall runway, read its height to compute progress
  const introRef = useRef<HTMLElement>(null);
  // cover layer hidden at the end
  const coverRef = useRef<HTMLDivElement>(null);
  // grid container for inserting tiles
  const tilesRef = useRef<HTMLDivElement>(null);
  // array of ref, one per letter
  const letterRefs = useRef<(HTMLSpanElement | null)[]>([]);
  // array for background +3 blobs, so they fade together
  const blobRefs = useRef<(HTMLDivElement | null)[]>([]);
  // list of tile objects
  const tiles = useRef<Tile[]>([]);
  // flag to check if visitor has reduce motion turned on their OS
  const reduce = useRef(false);

  const build = useCallback(() => {
    // mount current container
    const host = tilesRef.current;
    // if container isnt mounted yet, stop
    if (!host) return;
    // fresh generator each build so result is identical every time
    const range = makeRng(7);
    // one columns width
    const colWidth = (window.innerWidth - 24 * 5) / 25;
    // a tile height spans over 2 columns
    const tileHeight = colWidth * 2 * 0.92;
    // number of rows that fill the screen height, + 1 spare
    const rows = Math.ceil(window.innerHeight / (tileHeight + 5)) + 1;
    // wipes old tiles
    host.textContent = "";
    const list: Tile[] = [];
    // nested loop for rows * 12 tiles
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
          state: 0,
        })
      }
    }
    // normalise the ranodm order
    [...list].sort((p, q) => p.order - q.order).forEach((t, i, arr) => {
      t.order = i / Math.max(1, arr.length);
    })
    // save to current tiles
    tiles.current = list;
  }, [])
  // one frame of animation
  const render = useCallback((scroll: number) => {
    // mount to runway
    const intro = introRef.current;
    // if not mounted to runway, stop
    if (!intro || reduce.current) return;
    // usable scroll distance, makes it clamped so it never leaves that range
    const run = intro.offsetHeight - window.innerHeight;
    // check that avoids dividing by by 0
    const P = run > 0 ? clamp(scroll / run) : 0;
    // first half of the scroll clamp
    const tp = soft(clamp(P / 0.5));
    // letters distance from the center
    const mid = (WORD.length - 1) / 2;
    // ask and I shall explain too much to type in one sentence - Yevan :)
    letterRefs.current.forEach((s, i) => {
      if (!s) return;
      // spread effect
      s.style.transform = `translateX(${(i - mid) * tp * 0.9}em)`
      // opacity from 1 -> 0
      s.style.opacity = String(1 - tp);
      // blur effect
      s.style.filter = tp > 0 ? `blur(${tp * 6}px)` : "none"
    })
    // fade background
    const backgroundFade = 1 - soft(clamp((P - 0.08) / 0.86));
    blobRefs.current.forEach((b) => b && (b.style.opacity = String(backgroundFade)));
    // loop through each tile until the last tile
    for (let i = 0; i < tiles.current.length; i++) {
      // asign each tile an index
      const t = tiles.current[i];
      // a tile's personal 0->1 progress 
      const k = clamp((P - (0.03 + t.order * 0.62)) / 0.34);
      // eases the tile
      const e = soft(k);
      // finished check
      if (k >= 1) {
        // scroll back up check
        if (t.state !== 2) {
          t.el.style.visibility = "hidden";
          t.state = 2;
          continue;
        }
      }
      // in progress check
      if (t.state !== 2) t.el.style.visibility = "";
      t.state = k > 0 ? 1 : 0;
      t.el.style.transform = k > 0 ? `rotate${t.axis}(${t.dir * e * 180}deg) scale(${1 - e * 0.1})` : "";
      t.el.style.opacity = k > 0 ? String(1 - e) : "";
    }
    // once P reaches 1 whole cover layer is hidden
    if (coverRef.current) coverRef.current.style.visibility = P >= 1 ? "hidden" : "";
  }, [])

  // lenis calls l.scroll on every tick
  useLenis((l) => render(l.scroll));

  // mount effect
  useEffect(() => {
    // checks user's motions preference and stores it
    reduce.current = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    // build the tiles
    build();
    // if reduced motion => stop animation
    if (reduce.current) return;
    // otherwise render onScrollY
    render(window.scrollY);
    // on resize, rebuild the tiles
    const onResize = () => { build(); render(window.scrollY); };
    window.addEventListener("resize", onResize);
    // remove the listener when component unmounts
    return () => window.removeEventListener("resize", onResize);
  }, [build, render]);

  return (
    <main>
      <section className="intro" ref={introRef} aria-label="tezera">
        <div className="stage">
          <div className="base" />
          <div className="cover-layer" ref={coverRef}>
            <div className="bg" ref={(el) => { blobRefs.current[0] = el; }} />
            <div className="blob" ref={(el) => { blobRefs.current[1] = el; }} style={{ width: "70vw", height: "70vw", left: "-20vw", top: "-25vw", background: "#7999b1" }} />
            <div className="blob" ref={(el) => { blobRefs.current[2] = el; }} style={{ width: "60vw", height: "60vw", right: "-18vw", top: "5vw", background: "#d77e70" }} />
            <div className="blob" ref={(el) => { blobRefs.current[3] = el; }} style={{ width: "70vw", height: "70vw", left: "15vw", bottom: "-38vw", background: "#70a992" }} />
            <div className="tiles" ref={tilesRef} />
            <div className="hero">
              <h1 aria-label="tezera">
                {WORD.split("").map((ch, i) => (
                  <span key={i} ref={(el) => { letterRefs.current[i] = el; }}>{ch}</span>
                ))}
              </h1>
            </div>
          </div>
        </div>
      </section>
    </main>
  )
}