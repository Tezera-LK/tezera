"use client"

import { useEffect, useRef, useState } from "react";
import { onRevealed } from "@/components/marketing/reveal";

// HeroStage: the LED wall behind the hero. One canvas, drawn as a grid of square cells:
// a lighting rig with an equaliser under the nav, sweeping beams, flown speaker columns at both
// screen edges, subwoofers beside the cards, a bouncing crowd with haze over its heads, sparks on
// the drop, a follow-spot on the cursor, and a pixel dither that dissolves the stage into the page.
//
// Everything is a pure function of the loop clock: the show is one seamless loop of LOOP beats
// (three 8-bar phrases, one per light colour), so it never jumps when it starts over.
// The hero reads a smooth beat pulse as --pulse for the card and "ONE" glow.

type RGB = [number, number, number];

const BPM = 124;
const BEAT = 60 / BPM; // seconds
const PHRASE = 32; // beats: 8 bars; the crowd throws its hands up and the rig sparks on each drop
const LOOP = PHRASE * 3; // beats: one phrase per light colour, then the loop starts over
const LOOP_SEC = LOOP * BEAT; // ~46 s
const POWER_ON = 1.1; // seconds for the wall to light up after the opening hands off

const WALL: RGB = [29, 25, 27]; // an unlit cell
const GAP = "rgb(14,12,13)"; // between cells
const CREAM = "rgb(247,240,237)"; // --page-bg
const LIGHTS: RGB[] = [
  [240, 128, 108], // coral
  [120, 160, 205], // blue
  [104, 190, 155], // green
];
const WHITE: RGB = [255, 238, 226];

// fixed scatter, so the crowd is the same on every load
const makeRng = (seed: number) => {
  let s = seed;
  return () => (s = (s * 9301 + 49297) % 233280) / 233280;
};
// a fixed random number for an index, for the sparks
const hash = (n: number) => {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
};
const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const smooth = (a: number, b: number, v: number) => {
  const t = clamp((v - a) / (b - a));
  return t * t * (3 - 2 * t);
};
const easeOut = (t: number) => 1 - Math.pow(1 - clamp(t), 3);
const mix = (a: RGB, b: RGB, t: number): RGB => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const TAU = Math.PI * 2;

// ordered dither for the stage's bottom edge
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];

// speaker cell kinds
const SUB_FACE = 1, SUB_EDGE = 2, SUB_DRIVER = 3, ARRAY_EDGE = 4, ARRAY_GRILLE = 5, ARRAY_WAVE = 6, RIGGING = 7;

type Arms = "down" | "up" | "pump" | "sway" | "phone";
type Person = {
  x: number; // centre, in cells
  front: boolean;
  h: number; // floor to top of head, in cells
  headR: number;
  sh: number; // half the shoulder width
  phase: number; // offset into the beat
  amp: number; // bounce height, in cells
  half: boolean; // bounces every other beat
  arms: Arms;
  side: 1 | -1; // which arm pumps or holds the phone
};

type Beam = { x: number; base: number; phase: number; light: number };

type Layout = {
  dpr: number;
  cell: number; // device px per cell
  cols: number;
  rows: number;
  floor: number; // first row of the dither band
  crowdRows: number;
  lamp: number; // the rig's lamp row; the beams start here
  narrow: boolean;
  dim: Float32Array; // lights fade behind the copy and the nav
  noise: Float32Array; // per-cell variation, so the wall reads as LEDs
  order: Float32Array; // power-on order, 0 = first
  spk: Int8Array; // speaker cell kinds
  spkD: Float32Array; // sub drivers: distance to the driver centre / its radius
  people: Person[];
  beams: Beam[];
  beamGain: number;
};

function buildLayout(hero: HTMLElement, w: number, h: number): Layout {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const narrow = w < 900;
  const cssCell = narrow ? 10 : 12;
  const cell = Math.round(cssCell * dpr);
  const cols = Math.ceil((w * dpr) / cell);
  const rows = Math.ceil((h * dpr) / cell);
  const toCell = (px: number) => (px * dpr) / cell;

  const heroBox = hero.getBoundingClientRect();
  type Box = { l: number; t: number; r: number; b: number };
  const rel = (el: Element | null): Box | null => {
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return { l: r.left - heroBox.left, t: r.top - heroBox.top, r: r.right - heroBox.left, b: r.bottom - heroBox.top };
  };

  // the floor line and the crowd's height come from .hero-floor, which CSS sizes
  const floorBox = rel(hero.querySelector(".hero-floor"));
  const floor = floorBox ? Math.round(toCell(floorBox.b)) : rows - 6;
  const crowdRows = floorBox ? Math.max(6, Math.round(toCell(floorBox.b - floorBox.t))) : 10;

  // the rig hangs just below the nav bar: lamps on the first row under it
  const navH = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--nav-h")) || 64;
  const lamp = Math.ceil(navH / cssCell);

  // lights dim behind the copy (so it stays readable) and behind the nav's logo, links and menu button
  const dim = new Float32Array(cols * rows).fill(1);
  const dimBox = (box: Box | null, pad: number, strength: number) => {
    if (!box) return;
    const l = toCell(box.l - pad), r = toCell(box.r + pad), t = toCell(box.t - pad), b = toCell(box.b + pad);
    const y0 = Math.max(0, Math.floor(t) - 2), y1 = Math.min(rows - 1, Math.ceil(b) + 2);
    for (let y = y0; y <= y1; y++) {
      for (let x = 0; x < cols; x++) {
        // soft edge two cells wide
        const ex = Math.min(x + 0.5 - l, r - x - 0.5);
        const ey = Math.min(y + 0.5 - t, b - y - 0.5);
        const inside = smooth(-1, 2, Math.min(ex, ey));
        const i = y * cols + x;
        dim[i] = Math.min(dim[i], 1 - inside * strength);
      }
    }
  };
  dimBox(rel(hero.querySelector(".top")), 28, 0.74);
  dimBox(rel(hero.querySelector(".bottom")), 28, 0.74);
  // the nav is fixed and may still be sliding in, so measure it by its offsets (transform-free)
  document.querySelectorAll<HTMLElement>(".site-nav .nav-logo, .site-nav .nav, .site-nav .nav-toggle").forEach((el) => {
    if (!el.offsetWidth) return;
    dimBox({ l: el.offsetLeft, t: el.offsetTop, r: el.offsetLeft + el.offsetWidth, b: el.offsetTop + el.offsetHeight }, 6, 0.85);
  });

  const rng = makeRng(7);
  const noise = new Float32Array(cols * rows);
  const order = new Float32Array(cols * rows);
  const stage = rel(hero.querySelector(".right"));
  const ox = stage ? toCell((stage.l + stage.r) / 2) : cols * 0.7;
  const oy = stage ? toCell((stage.t + stage.b) / 2) : rows * 0.5;
  const reach = Math.hypot(Math.max(ox, cols - ox), Math.max(oy, rows - oy));
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const i = y * cols + x;
      noise[i] = rng();
      order[i] = 0.72 * (Math.hypot(x - ox, y - oy) / reach) + 0.28 * rng();
    }
  }

  const spk = new Int8Array(cols * rows);
  const spkD = new Float32Array(cols * rows);
  const put = (x: number, y: number, kind: number) => {
    if (x >= 0 && x < cols && y >= 0 && y < floor) spk[y * cols + x] = kind;
  };

  if (!narrow) {
    // flown speaker columns at both screen edges: a stack of boxes hung from the rig on two chains,
    // curving out towards the edge at the bottom (the "J" of a festival line array), well above the crowd
    const aw = 8;
    const top = lamp + 3;
    const bottom = floor - Math.round(crowdRows * 1.75);
    const boxes = clamp(Math.floor((bottom - top) / 3), 5, 11);
    for (const side of [-1, 1] as const) {
      const x0 = side < 0 ? -2 : cols - aw + 2; // two columns run off the screen edge
      for (const cx of [x0 + 1, x0 + aw - 2]) for (let y = lamp + 1; y < top; y++) put(cx, y, RIGGING);
      for (let k = 0; k < boxes; k++) {
        const curl = Math.round(Math.pow(Math.max(0, k - boxes * 0.55), 1.5) * 0.45);
        const left = x0 + side * curl;
        const y = top + k * 3;
        for (let x = left; x < left + aw; x++) {
          const c = x - left;
          const side = c === 0 || c === aw - 1;
          put(x, y, ARRAY_EDGE); // the seam between boxes
          put(x, y + 1, side ? ARRAY_EDGE : c >= 2 && c <= aw - 3 ? ARRAY_WAVE : ARRAY_GRILLE);
          put(x, y + 2, side ? ARRAY_EDGE : ARRAY_GRILLE);
        }
      }
    }

    // subwoofers on the floor either side of the cards: two boxes each, the top one above the crowd's heads
    if (stage) {
      const sw = Math.round(clamp(toCell(stage.r - stage.l) * 0.16, 7, 10));
      const stacks = [Math.round(toCell(stage.l)) - Math.round(sw * 0.35), Math.min(cols - sw - 7, Math.round(toCell(stage.r)) - Math.round(sw * 0.55))];
      for (const left of stacks) {
        for (let k = 0; k < 2; k++) {
          const boxTop = floor - sw * (k + 1);
          const cx = left + sw / 2, cy = boxTop + sw / 2, r = sw * 0.36;
          for (let y = boxTop; y < boxTop + sw; y++) {
            for (let x = left; x < left + sw; x++) {
              if (y < 0 || x < 0 || x >= cols) continue;
              const i = y * cols + x;
              const edge = y === boxTop || x === left || x === left + sw - 1;
              spk[i] = edge ? SUB_EDGE : SUB_FACE;
              const d = Math.hypot(x + 0.5 - cx, y + 0.5 - cy) / r;
              if (!edge && d <= 1.25) {
                spk[i] = SUB_DRIVER;
                spkD[i] = d;
              }
            }
          }
        }
      }
    }
  }

  // the crowd: a back row and a front row, overlapping at the shoulders
  const prng = makeRng(23);
  const people: Person[] = [];
  const armsFor = (front: boolean): Arms => {
    const r = prng();
    if (front) return r < 0.32 ? "down" : r < 0.55 ? "pump" : r < 0.72 ? "up" : r < 0.88 ? "sway" : "phone";
    return r < 0.45 ? "down" : r < 0.65 ? "up" : r < 0.85 ? "pump" : "sway";
  };
  // sizes in cells; phones get smaller people on their bigger cells
  const size = narrow ? 0.8 : 1;
  const addRow = (front: boolean, spacing: number, start: number) => {
    for (let x = start; x < cols + 4; x += spacing * (0.85 + prng() * 0.3)) {
      people.push({
        x,
        front,
        h: crowdRows * (front ? 0.74 + prng() * 0.14 : 0.88 + prng() * 0.1),
        headR: ((front ? 1.85 : 1.35) + prng() * 0.3) * size,
        sh: ((front ? 2.9 : 2.1) + prng() * 0.5) * size,
        phase: prng() * 0.35,
        amp: front ? 1 + Math.round(prng()) : Math.round(prng() * 1.4),
        half: prng() < 0.25,
        arms: armsFor(front),
        side: prng() < 0.5 ? 1 : -1,
      });
    }
  };
  addRow(false, narrow ? 5.2 : 6.2, 3);
  addRow(true, narrow ? 7 : 8.6, 0.5);

  // four beams on wide screens, two on narrow ones; outer pairs mirror each other
  const beams: Beam[] = narrow
    ? [
        { x: cols * 0.3, base: 0.18, phase: 0, light: 0 },
        { x: cols * 0.7, base: -0.18, phase: Math.PI, light: 1 },
      ]
    : [
        { x: cols * 0.17, base: 0.32, phase: 0, light: 0 },
        { x: cols * 0.4, base: 0.1, phase: 1.3, light: 1 },
        { x: cols * 0.62, base: -0.1, phase: Math.PI + 1.3, light: 2 },
        { x: cols * 0.85, base: -0.32, phase: Math.PI, light: 0 },
      ];

  return { dpr, cell, cols, rows, floor, crowdRows, lamp, narrow, dim, noise, order, spk, spkD, people, beams, beamGain: narrow ? 1.5 : 1 };
}

// distance from point p to segment a-b
function segDist(px: number, py: number, ax: number, ay: number, bx: number, by: number) {
  const dx = bx - ax, dy = by - ay;
  const t = clamp(((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy || 1));
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}

export default function HeroStage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [paused, setPaused] = useState(false);
  const [moving, setMoving] = useState(true); // false under reduced motion: no pause button needed
  const pausedRef = useRef(false);
  const toggleRef = useRef<(p: boolean) => void>(() => {});

  useEffect(() => {
    const canvas = canvasRef.current;
    const hero = canvas?.parentElement;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !hero || !ctx) return;

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
    setMoving(!reduce);

    let L: Layout | null = null;
    let small: HTMLCanvasElement | null = null; // one pixel per cell
    let sctx: CanvasRenderingContext2D | null = null;
    let img: ImageData | null = null;
    let grid: CanvasPattern | null = null;
    let crowd = new Uint8Array(0);

    let raf = 0;
    let last = 0;
    let time = 0; // seconds of show, frozen while paused
    let powerStart = -1; // performance time the wall began lighting
    let visible = true;
    // follow-spot: eased towards the pointer, in cells; a = how lit it is
    const spot = { x: 0, y: 0, tx: 0, ty: 0, a: 0, ta: 0 };

    const layout = () => {
      const w = hero.clientWidth;
      const h = hero.clientHeight;
      if (!w || !h) return;
      L = buildLayout(hero, w, h);
      canvas.width = Math.round(w * L.dpr);
      canvas.height = Math.round(h * L.dpr);
      small = document.createElement("canvas");
      small.width = L.cols;
      small.height = Math.max(1, L.floor);
      sctx = small.getContext("2d");
      img = sctx!.createImageData(L.cols, Math.max(1, L.floor));
      crowd = new Uint8Array(L.cols * L.rows);

      // gap overlay: a cell-sized tile with a rounded hole, repeated over the scaled-up image
      const tile = document.createElement("canvas");
      tile.width = tile.height = L.cell;
      const t = tile.getContext("2d")!;
      const g = Math.max(1, Math.round(L.dpr * 1.6));
      t.fillStyle = GAP;
      t.fillRect(0, 0, L.cell, L.cell);
      t.globalCompositeOperation = "destination-out";
      t.beginPath();
      t.roundRect(g / 2, g / 2, L.cell - g, L.cell - g, Math.round(2 * L.dpr));
      t.fill();
      grid = ctx.createPattern(tile, "repeat");
    };

    const draw = (now: number) => {
      if (!L || !img || !sctx || !small) return;
      const { cols, rows, floor, crowdRows, cell, lamp } = L;

      // ---- the clock: everything below is periodic in LOOP beats
      const tl = ((time % LOOP_SEC) + LOOP_SEC) % LOOP_SEC;
      const u = tl / LOOP_SEC; // 0..1 through the loop
      const beatF = tl / BEAT;
      const beatI = Math.floor(beatF);
      const p = beatF - beatI; // 0..1 through the beat
      const inPhrase = beatI % PHRASE;
      const phrase = Math.floor(beatI / PHRASE); // 0, 1, 2: which colour leads
      const drop = inPhrase < 4; // first bar of the phrase
      const kick = Math.exp(-p * 5.5) * (beatI % 4 === 0 ? 1 : 0.8); // the punch: speakers, beams
      const pulse = Math.pow(0.5 + 0.5 * Math.cos(TAU * p), 3); // the smooth pulse: cards, "ONE"
      const fade = smooth(PHRASE - 4, PHRASE, inPhrase + p); // last bar: colours cross-fade to the next phrase
      const pal = (k: number): RGB => mix(LIGHTS[(k + phrase) % 3], LIGHTS[(k + phrase + 1) % 3], fade);
      const sweep = (TAU * beatF) / 8; // one sweep every two bars
      const powerT = powerStart < 0 ? 0 : reduce ? 9 : (now - powerStart) / 1000 / POWER_ON;
      const power = clamp(powerT);
      const A = pal(0), B = pal(1);
      const beamCol = L.beams.map((bm) => pal(bm.light));

      // ---- crowd mask: 1 back row, 2 front row, 3 phone light
      crowd.fill(0);
      const rise = reduce ? 0 : Math.round((1 - easeOut((powerT - 0.25) / 0.9)) * (crowdRows + 3));
      for (const pass of [false, true]) {
        for (const q of L.people) {
          if (q.front !== pass) continue;
          const speed = q.half ? 0.5 : 1;
          const bounce = Math.round((q.amp + (drop && q.front ? 1 : 0)) * Math.abs(Math.sin(Math.PI * (beatF * speed + q.phase))));
          const top = floor - q.h - bounce + rise;
          const headCy = top + q.headR;
          const shY = top + q.headR * 2 + 0.5;
          const armLen = q.h * (q.front ? 0.62 : 0.5);
          const sx = q.sh * 0.72;
          const arms: [number, number, number, number][] = []; // shoulder -> hand
          const mode: Arms = drop && q.arms !== "phone" && (q.arms !== "down" || q.phase < 0.2) ? "up" : q.arms;
          const qp = (beatF * speed + q.phase) % 1;
          if (mode === "up") {
            arms.push([q.x - sx, shY, q.x - sx - 1.3, shY - armLen], [q.x + sx, shY, q.x + sx + 1.3, shY - armLen]);
          } else if (mode === "pump") {
            const up = qp < 0.5;
            arms.push([q.x + q.side * sx, shY, q.x + q.side * (sx + (up ? 0.5 : 1.6)), shY - armLen * (up ? 1 : 0.5)]);
          } else if (mode === "sway") {
            const a = 0.45 * Math.sin((Math.PI * beatF) / 2 + q.phase * 6);
            arms.push(
              [q.x - sx, shY, q.x - sx + Math.sin(a) * armLen, shY - Math.cos(a) * armLen],
              [q.x + sx, shY, q.x + sx + Math.sin(a) * armLen, shY - Math.cos(a) * armLen],
            );
          } else if (mode === "phone") {
            const a = 0.15 * Math.sin((Math.PI * beatF) / 4 + q.phase * 6);
            arms.push([q.x + q.side * sx, shY, q.x + q.side * (sx + 0.4) + Math.sin(a) * armLen, shY - armLen * 1.05]);
          }
          const val = q.front ? 2 : 1;
          const x0 = Math.max(0, Math.floor(q.x - q.sh - 3)), x1 = Math.min(cols - 1, Math.ceil(q.x + q.sh + 3));
          const y0 = Math.max(0, Math.floor(top - armLen - 2)), y1 = floor - 1;
          const armW = q.front ? 0.72 : 0.5;
          for (let y = y0; y <= y1; y++) {
            const py = y + 0.5;
            for (let x = x0; x <= x1; x++) {
              const px = x + 0.5;
              let hit = (px - q.x) ** 2 + (py - headCy) ** 2 <= q.headR * q.headR + 0.2;
              if (!hit && py > headCy && py < shY + 0.5) hit = Math.abs(px - q.x) < q.headR * 0.5;
              if (!hit && py >= shY) hit = Math.abs(px - q.x) <= q.sh * Math.min(1, 0.5 + (py - shY) * 0.45);
              if (!hit) {
                for (const a of arms) {
                  if (segDist(px, py, a[0], a[1], a[2], a[3]) <= armW || Math.hypot(px - a[2], py - a[3]) <= armW + 0.3) {
                    hit = true;
                    break;
                  }
                }
              }
              if (hit) {
                const i = y * cols + x;
                if (crowd[i] < val) crowd[i] = val;
              }
            }
          }
          if (mode === "phone" && arms[0]) {
            const hx = Math.floor(arms[0][2]), hy = Math.floor(arms[0][3]) - 1;
            if (hx >= 0 && hx < cols && hy >= 0) crowd[hy * cols + hx] = 3;
          }
        }
      }

      // ---- per-cell colour
      const data = img.data;
      const level = 0.62 + 0.38 * kick;
      const glowTop = floor - crowdRows * 2.6;
      const glowFull = floor - crowdRows * 0.55;
      const hazeTop = floor - crowdRows * 2.2;
      const hazeBot = floor - crowdRows * 0.5;
      const eqBottom = lamp - 2, eqTop = 0; // the meter fills the band behind the nav; a rail under it
      const spotR = 11;
      for (let y = 0; y < floor; y++) {
        const hazeEnv = y > hazeTop && y < hazeBot ? Math.sin((Math.PI * (y - hazeTop)) / (hazeBot - hazeTop)) : 0;
        for (let x = 0; x < cols; x++) {
          const i = y * cols + x;
          const n = L.noise[i];
          const on = clamp((power * 1.35 - L.order[i]) * 6);
          const lit = on * L.dim[i];
          const m = x / cols;
          let r = WALL[0] + (n - 0.5) * 6, g = WALL[1] + (n - 0.5) * 6, b = WALL[2] + (n - 0.5) * 6;

          if (y < lamp) {
            // the rig: an equaliser above one rail
            if (y === lamp - 1) {
              const metal = x % 2 === 0 ? 58 : 40;
              r = metal; g = metal - 6; b = metal - 3;
            } else if (y >= eqTop && y <= eqBottom) {
              // bars two cells wide; each bar's level is periodic in 4 beats, the low end leans on the kick
              const bar = Math.floor(x / 3);
              r = 24; g = 21; b = 23;
              if (x % 3 !== 2) {
                const bass = 1 - clamp(bar / (cols / 3));
                const f = 1 + (bar * 7) % 4;
                const ph = hash(bar) * TAU;
                const lvl = clamp(0.15 + 0.5 * kick * (0.4 + 0.6 * bass) + 0.4 * (0.5 + 0.5 * Math.sin((TAU * beatF * f) / 4 + ph)));
                const row = eqBottom - y; // 0 = bottom
                const eqRows = eqBottom - eqTop + 1;
                if (row < Math.round(lvl * eqRows + 0.3)) {
                  const c = mix(A, B, row / Math.max(1, eqRows - 1));
                  const k = (0.5 + 0.25 * kick) * lit;
                  r += c[0] * k; g += c[1] * k; b += c[2] * k;
                }
              }
            }
          } else if (y === lamp) {
            // lamp heads where the beams start
            for (let j = 0; j < L.beams.length; j++) {
              if (Math.abs(x + 0.5 - L.beams[j].x) < 1.2) {
                const c = beamCol[j];
                const k = (0.55 + 0.45 * level) * on;
                r = r * (1 - k) + c[0] * k; g = g * (1 - k) + c[1] * k; b = b * (1 - k) + c[2] * k;
              }
            }
          } else {
            // haze glow rising behind the crowd
            if (y > glowTop) {
              const k = Math.pow(smooth(glowTop, glowFull, y + 0.5), 1.4) * (0.6 + 0.28 * kick + (drop ? 0.12 : 0)) * lit;
              r += (A[0] * (1 - m) + B[0] * m) * k;
              g += (A[1] * (1 - m) + B[1] * m) * k;
              b += (A[2] * (1 - m) + B[2] * m) * k;
            }
            // beams: cones from the rig, swept left and right
            for (let j = 0; j < L.beams.length; j++) {
              const bm = L.beams[j];
              const ang = bm.base + 0.36 * Math.sin(sweep + bm.phase);
              const dx = x + 0.5 - bm.x, dy = y + 0.5 - (lamp + 0.5);
              const d = Math.abs(Math.atan2(dx, dy) - ang);
              if (d > 0.16) continue;
              const k = (smooth(0.16, 0.05, d) * 0.36 + smooth(0.035, 0, d) * 0.3) * (1 - 0.45 * (dy / rows)) * level * lit * L.beamGain;
              const c = beamCol[j];
              r += c[0] * k; g += c[1] * k; b += c[2] * k;
            }
          }

          // follow-spot on the wall
          if (spot.a > 0.01) {
            const d2 = ((x + 0.5 - spot.x) ** 2 + (y + 0.5 - spot.y) ** 2) / (spotR * spotR);
            if (d2 < 1) {
              const k = (1 - d2) * (1 - d2) * 0.2 * spot.a * lit;
              r += WHITE[0] * k; g += WHITE[1] * k; b += WHITE[2] * k;
            }
          }

          // speakers
          const s = L.spk[i];
          if (s) {
            if (s === SUB_FACE || s === SUB_EDGE || s === SUB_DRIVER) {
              const face = s === SUB_EDGE ? 50 : 22;
              r = face; g = face - 6; b = face - 3;
              if (s === SUB_EDGE && y > 0 && !L.spk[i - cols]) {
                r += A[0] * 0.25 * on; g += A[1] * 0.25 * on; b += A[2] * 0.25 * on;
              }
              if (s === SUB_DRIVER) {
                const d = L.spkD[i] / (1 + 0.14 * kick * on);
                if (d <= 1) {
                  if (d > 0.72) {
                    const k = (0.25 + 0.75 * kick) * on;
                    r = 78 + A[0] * k * 0.85; g = 70 + A[1] * k * 0.85; b = 74 + A[2] * k * 0.85;
                  } else if (d < 0.32) {
                    r = 92; g = 84; b = 87;
                  } else {
                    r = 12 + 18 * kick * on; g = 10 + 15 * kick * on; b = 11 + 16 * kick * on;
                  }
                }
              }
            } else if (s === RIGGING) {
              r = 52; g = 47; b = 50;
            } else if (s === ARRAY_EDGE) {
              // metal seams and sides, catching the stage light (half-dimmed behind the copy)
              const near = 0.4 + 0.6 * L.dim[i]; // quieter where it sits behind the copy
              const k = 0.16 * on * near;
              r = 30 + 36 * near + A[0] * k; g = 26 + 34 * near + A[1] * k; b = 28 + 35 * near + A[2] * k;
            } else if (s === ARRAY_GRILLE) {
              r = 17; g = 14; b = 16;
            } else {
              // the lit slot in each box, punching with the kick
              const k = (0.25 + 0.75 * kick) * on * (0.5 + 0.5 * L.dim[i]);
              r = 24 + A[0] * k * 0.95; g = 20 + A[1] * k * 0.95; b = 22 + A[2] * k * 0.95;
            }
          }

          // haze drifting over the crowd's heads, lit by the stage; periodic in the loop (whole cycles of u)
          if (hazeEnv > 0 && !s && crowd[i] !== 2 && crowd[i] !== 3) {
            const dns = 0.5 + 0.25 * Math.sin(TAU * (2 * m + u)) + 0.15 * Math.sin(TAU * (5 * m - 2 * u) + y * 0.5) + 0.1 * Math.sin(TAU * (9 * m + 3 * u) + y * 0.9);
            const fog = smooth(0.42, 0.95, dns) * hazeEnv * 0.34 * lit * (crowd[i] === 1 ? 0.5 : 1);
            r += ((A[0] * (1 - m) + B[0] * m) * 0.55 + 40) * fog;
            g += ((A[1] * (1 - m) + B[1] * m) * 0.55 + 36) * fog;
            b += ((A[2] * (1 - m) + B[2] * m) * 0.55 + 38) * fog;
          }

          // crowd in front of everything: near-black, the top edge rim-lit by the stage
          const c = crowd[i];
          if (c === 3) {
            r = WHITE[0] * 0.9; g = WHITE[1] * 0.9; b = WHITE[2] * 0.9;
          } else if (c === 2) {
            const above = y > 0 ? crowd[i - cols] : 0;
            r = 9; g = 7; b = 8;
            if (above === 0) { r += A[0] * 0.42 * on; g += A[1] * 0.42 * on; b += A[2] * 0.42 * on; }
          } else if (c === 1) {
            r = 26 + (A[0] * (1 - m) + B[0] * m) * 0.1 * on;
            g = 21 + (A[1] * (1 - m) + B[1] * m) * 0.1 * on;
            b = 24 + (A[2] * (1 - m) + B[2] * m) * 0.1 * on;
          }

          const o = i * 4;
          data[o] = r; data[o + 1] = g; data[o + 2] = b; data[o + 3] = 255;
        }
      }

      // ---- sparks: a burst from the lamps on each drop, the same arcs every loop
      const since = (inPhrase + p) * BEAT; // seconds since this phrase's drop
      if (since < 3 && power > 0 && !reduce) {
        const count = L.narrow ? 40 : 72;
        for (let k = 0; k < count; k++) {
          const seed = phrase * 131 + k;
          const age = since - hash(seed) * 0.3;
          const life = 1.3 + hash(seed + 0.5) * 1.1;
          if (age < 0 || age > life) continue;
          const bm = L.beams[k % L.beams.length];
          const vx = (hash(seed + 0.25) - 0.5) * 12;
          const vy = 1 + hash(seed + 0.75) * 6;
          const col = mix(WHITE, LIGHTS[k % 3], hash(seed + 0.1) * 0.6);
          const fadeOut = Math.pow(1 - age / life, 1.4) * power;
          // the spark and a fainter cell where it was a moment ago
          for (const [lag, bright] of [[0, 1.25], [0.07, 0.5]]) {
            const t = Math.max(0, age - lag);
            const sx = Math.floor(bm.x + vx * t);
            const sy = Math.floor(lamp + 1 + vy * t + 0.5 * 14 * t * t);
            if (sx < 0 || sx >= cols || sy <= lamp || sy >= floor) continue;
            const i = sy * cols + sx;
            if (crowd[i] || L.spk[i]) continue;
            const a = fadeOut * bright * (0.4 + 0.6 * L.dim[i]);
            const o = i * 4;
            data[o] += col[0] * a; data[o + 1] += col[1] * a; data[o + 2] += col[2] * a;
          }
        }
      }

      sctx.putImageData(img, 0, 0);
      ctx.imageSmoothingEnabled = false;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(small, 0, 0, cols * cell, floor * cell);
      if (grid) {
        ctx.fillStyle = grid;
        ctx.fillRect(0, 0, cols * cell, floor * cell);
      }

      // the dither band: cream, with the stage floor breaking up into it
      const bandRows = rows - floor;
      ctx.fillStyle = CREAM;
      ctx.fillRect(0, floor * cell, canvas.width, canvas.height - floor * cell);
      const gap = Math.max(1, Math.round(L.dpr * 1.6));
      for (let y = floor; y < rows; y++) {
        const t = Math.pow((y - floor + 0.5) / Math.max(1, bandRows - 1), 1.5);
        const glow = (1 - t) * 0.18 * (0.6 + 0.4 * kick) * power;
        ctx.fillStyle = `rgb(${Math.round(18 + A[0] * glow)},${Math.round(15 + A[1] * glow)},${Math.round(17 + A[2] * glow)})`;
        ctx.beginPath();
        for (let x = 0; x < cols; x++) {
          if (0.35 * (BAYER[(y % 4) * 4 + (x % 4)] + 0.5) / 16 + 0.65 * L.noise[y * cols + x] <= t) continue;
          ctx.roundRect(x * cell + gap / 2, y * cell + gap / 2, cell - gap, cell - gap, Math.round(2 * L.dpr));
        }
        ctx.fill();
      }

      // the cards and "ONE" glow with the smooth pulse
      hero.style.setProperty("--pulse", (pausedRef.current || reduce ? 0.35 : pulse * power).toFixed(3));
    };

    const frame = (now: number) => {
      const dt = last ? Math.min(0.05, (now - last) / 1000) : 0;
      last = now;
      if (!pausedRef.current) time += dt;
      // the spot eases towards the pointer and fades in and out
      spot.x += (spot.tx - spot.x) * 0.14;
      spot.y += (spot.ty - spot.y) * 0.14;
      spot.a += (spot.ta - spot.a) * 0.08;
      draw(now);
      raf = visible && !pausedRef.current ? requestAnimationFrame(frame) : 0;
    };

    const start = () => {
      if (raf || reduce || pausedRef.current || !visible || powerStart < 0) return;
      last = 0;
      raf = requestAnimationFrame(frame);
    };

    const stop = () => {
      cancelAnimationFrame(raf);
      raf = 0;
    };

    // pause button: freeze on the current frame; the cards stop floating (CSS reads .is-paused)
    toggleRef.current = (p: boolean) => {
      pausedRef.current = p;
      hero.classList.toggle("is-paused", p);
      if (p) {
        stop();
        draw(performance.now());
      } else start();
    };

    layout();
    if (reduce) time = BEAT * 0.5; // one still frame: just after the drop, hands up, sparks in the air
    draw(performance.now());

    const unsubscribe = onRevealed(() => {
      powerStart = performance.now();
      if (reduce) draw(powerStart);
      else start();
    });

    const ro = new ResizeObserver(() => {
      layout();
      draw(performance.now());
    });
    ro.observe(hero);

    // only run while the hero is on screen and the tab is showing
    const io = new IntersectionObserver(([e]) => {
      visible = e.isIntersecting && !document.hidden;
      if (visible) start();
      else stop();
    });
    io.observe(hero);
    const onVis = () => {
      visible = !document.hidden;
      if (visible) start();
      else stop();
    };
    document.addEventListener("visibilitychange", onVis);

    // follow-spot: mouse and trackpad only, never with reduced motion
    const onMove = (e: PointerEvent) => {
      if (!L) return;
      const r = canvas.getBoundingClientRect();
      const x = ((e.clientX - r.left) * L.dpr) / L.cell;
      const y = ((e.clientY - r.top) * L.dpr) / L.cell;
      const inside = x >= 0 && x < L.cols && y > L.lamp && y < L.floor;
      if (inside) {
        if (spot.a < 0.02) { spot.x = x; spot.y = y; } // appear where the pointer is, then follow
        spot.tx = x;
        spot.ty = y;
      }
      spot.ta = inside ? 1 : 0;
    };
    const onLeave = () => (spot.ta = 0);
    if (finePointer && !reduce) {
      window.addEventListener("pointermove", onMove, { passive: true });
      document.documentElement.addEventListener("pointerleave", onLeave);
    }

    return () => {
      stop();
      unsubscribe();
      ro.disconnect();
      io.disconnect();
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("pointermove", onMove);
      document.documentElement.removeEventListener("pointerleave", onLeave);
    };
  }, []);

  return (
    <>
      <canvas ref={canvasRef} className="hero-stage" aria-hidden="true" />
      {moving && (
        <button
          type="button"
          className="hero-pause"
          aria-pressed={paused}
          onClick={() => {
            const next = !paused;
            setPaused(next);
            toggleRef.current(next);
          }}
        >
          <span className="hero-pause-icon" aria-hidden="true">{paused ? "▶" : "❚❚"}</span>
          {paused ? "Play the show" : "Pause the show"}
        </button>
      )}
    </>
  );
}
