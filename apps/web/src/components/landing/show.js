// The landing page's stage: an LED wall drawn on one canvas, a camera that flies between the page's
// stops as you scroll, a playlist the lights follow, and the opening. Ported from the approved mock;
// startShow wires it to the server-rendered markup in LandingShow and returns a cleanup.
// It stays plain JS for now (a 1,500-line canvas engine); its one export is typed in show.d.ts.

export function startShow(root, opts = {}) {
  let dead = false;
  const offs = [];
  const on = (target, type, fn, o) => { target.addEventListener(type, fn, o); offs.push(() => target.removeEventListener(type, fn, o)); };



  // ============================================================================================
  // helpers
  // ============================================================================================
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const smooth = (a, b, v) => { const t = clamp((v - a) / (b - a)); return t * t * (3 - 2 * t); };
  const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  const easeOut = (t) => 1 - Math.pow(1 - clamp(t), 3);
  const mix = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
  const hash = (n) => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
  const makeRng = (seed) => { let s = seed; return () => (s = (s * 9301 + 49297) % 233280) / 233280; };
  const TAU = Math.PI * 2;
  const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;

  const WALL = [29, 25, 27];
  const WHITE = [255, 238, 226];
  const GAP = "rgb(14,12,13)";

  // light palettes: the hero's three, then one per role (brand colours, lifted to read as light)
  const PAL = {
    hero: [[240, 128, 108], [120, 160, 205], [104, 190, 155]],
    organiser: [[128, 160, 192], [104, 176, 150], [150, 186, 214]],
    vendor: [[112, 196, 152], [138, 168, 204], [196, 214, 160]],
    freelancer: [[138, 170, 206], [176, 200, 220], [150, 204, 176]],
    attendee: [[240, 128, 112], [246, 162, 188], [236, 200, 106]],
  };


  // ============================================================================================
  // content (copied from apps/web/src/content/landing/*.json)
  // ============================================================================================
  // ---- the feature tabs at each role stop: a click or the arrow keys pick one and hold it for a while;
  // otherwise they follow the music. Each tab carries its screenshot and text in data attributes.
  const TABS = {};
  function selectTab(tb, i) {
    if (i === tb.idx) return;
    tb.idx = i;
    const b0 = tb.btns[i];
    tb.btns.forEach((b, k) => { b.setAttribute("aria-selected", String(k === i)); b.tabIndex = k === i ? 0 : -1; });
    tb.b.classList.remove("flick");
    void tb.b.offsetWidth; // restart the scan-in
    tb.b.src = b0.dataset.src;
    tb.b.alt = `${b0.dataset.title}: ${b0.dataset.point}`;
    if (reduce) tb.a.src = tb.b.src;
    else tb.b.classList.add("flick");
    tb.capTitle.textContent = b0.dataset.title;
    tb.capText.textContent = b0.dataset.point;
  }
  for (const root2 of root.querySelectorAll(".role")) {
    const id = root2.dataset.stop;
    const tb = { id, idx: 0, pinUntil: 0, wasOn: false, base: 0, btns: [...root2.querySelectorAll('[role="tab"]')], a: root2.querySelector("img.a"), b: root2.querySelector("img.b"), capTitle: root2.querySelector(".cap b"), capText: root2.querySelector(".cap span") };
    tb.b.addEventListener("animationend", () => (tb.a.src = tb.b.src));
    tb.btns.forEach((b, i) => {
      b.addEventListener("click", () => { selectTab(tb, i); tb.pinUntil = performance.now() + 20000; });
      b.addEventListener("keydown", (ev) => {
        const d = ev.key === "ArrowRight" ? 1 : ev.key === "ArrowLeft" ? -1 : 0;
        if (!d) return;
        ev.preventDefault();
        const nx = (i + d + tb.btns.length) % tb.btns.length;
        selectTab(tb, nx);
        tb.pinUntil = performance.now() + 20000;
        tb.btns[nx].focus();
      });
    });
    TABS[id] = tb;
  }
  // the problem stop's clutter: a fixed scatter over the stage area (x, y in -1..1 of its half-size)
  const PSTAGE = root.querySelector(".pstage");
  const rngN = makeRng(31);
  const notes = [...root.querySelectorAll(".pile .note")];
  const FRAGS = notes.map((el, i) => {
    const a = rngN() * TAU, rr = 0.25 + Math.sqrt(rngN()) * 0.75;
    return {
      el, tf: "", op: "",
      x: Math.cos(a) * rr * 0.92, y: Math.sin(a) * rr * 0.9,
      r: (rngN() - 0.5) * 14,
      at: i < 7 ? 0 : 0.03 + ((i - 7) / Math.max(1, notes.length - 7)) * 0.4, // the first few are already there; the rest keep arriving
      d: rngN() * 0.3, s: 0.6 + rngN() * 0.6,
    };
  });

  PAL.organiser = [[112, 152, 196], [143, 176, 206], [92, 132, 178]];
  PAL.vendor = [[104, 196, 150], [130, 210, 166], [86, 172, 132]];
  PAL.freelancer = PAL.vendor;
  PAL.attendee = [[240, 122, 104], [246, 150, 132], [232, 104, 90]];

  // ============================================================================================
  // the playlist: beat maps measured from the files (tempo, first downbeat, bass energy per bar 0-9).
  // enter = the bar a song comes in on; out = the bar its crossfade into the next song starts.
  // ============================================================================================
  const SONGS = {
    heroes: {
      title: "Heroes Tonight", artist: "Janji feat. Johnning", src: "/audio/heroes-tonight.mp3",
      bpm: 128, first: 0.052, opening: 32, enter: 0, out: 96, drops: [36, 84], bounce: 1, pal: "hero",
      energy: "44550010011377777761100010035444432389988985777777637888877511111111110111036555542389988985888878740000000000",
    },
    onon: {
      title: "On & On", artist: "Cartoon & Jéja feat. Daniel Levi", src: "/audio/on-and-on.mp3",
      bpm: 174, first: -33.103, enter: 24, out: 140, drops: [40, 92, 128], bounce: 2, pal: "hero", // the file starts at bar 24
      energy: "12222322222233222233222353222333221111037689888756898888521355556656555555555222233322111103868998877689888622222222222222222145898987768999872221221100",
    },
    savannah: {
      title: "Savannah", artist: "Diviners feat. Philly K", src: "/audio/savannah.mp3",
      bpm: 108, first: -35.555, enter: 16, out: 81, drops: [35, 69], bounce: 1, pal: "hero", // the file starts at bar 16
      energy: "000000000110000012222212100000000049999989810000002444444430000000004989898869998434100000000",
    },
  };
  const ORDER = ["heroes", "onon", "savannah"];
  const nextOf = (k) => ORDER[(ORDER.indexOf(k) + 1) % ORDER.length];
  for (const s of Object.values(SONGS)) {
    s.beat = 60 / s.bpm;
    s.bar = s.beat * 4;
    s.barT = (n) => s.first + n * s.bar;
  }
  const FADE_BARS = 4; // the outgoing song's bars the crossfade takes

  // ============================================================================================
  // transport: every song's playhead is a pure function of the clock, so the show runs the same
  // muted or not. Before sound is on the clock is performance time, after it is the audio clock.
  // ============================================================================================
  const T = {
    ctx: null, master: null, bus: null, analyser: null, freq: null, buffers: {}, soundOn: false, loading: false,
    paused: false, pauseAt: 0, pausedTotal: 0,
    tracks: {}, // key -> { anchorClock, anchorPos, src, gain, filter }
    lead: "heroes", // the song the stage follows
    next: null, // the scheduled crossfade: { from, to, tb, fade }
  };

  function clock() {
    if (T.ctx) return T.ctx.currentTime - (T.ctx.outputLatency || 0);
    return ((T.paused ? T.pauseAt : performance.now()) - T.pausedTotal) / 1000;
  }
  function posOf(key, t = clock()) {
    const tr = T.tracks[key];
    return tr ? tr.anchorPos + (t - tr.anchorClock) : null;
  }
  function anchor(key, atClock, pos) {
    T.tracks[key] = Object.assign(T.tracks[key] || {}, { anchorClock: atClock, anchorPos: pos });
  }

  // audio graph per song: source -> lowpass -> gain -> bus (analyser) -> master
  function startSource(key, when, offset, gain0) {
    if (!T.ctx || !T.buffers[key]) return;
    stopSource(key, when);
    const tr = T.tracks[key];
    const src = T.ctx.createBufferSource();
    src.buffer = T.buffers[key];
    const filter = T.ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 18000;
    filter.Q.value = 0.7;
    const gain = T.ctx.createGain();
    gain.gain.value = gain0;
    src.connect(filter).connect(gain).connect(T.bus);
    src.start(Math.max(T.ctx.currentTime, when), Math.max(0, offset));
    Object.assign(tr, { src, filter, gain });
  }
  function stopSource(key, when) {
    const tr = T.tracks[key];
    if (tr && tr.src) {
      try { tr.src.stop(when ?? 0); } catch { /* already stopped */ }
      tr.src = null;
    }
  }

  // queue the lead song's hand-off to the next one, on the lead's "out" downbeat.
  // The incoming song enters on that downbeat at its own entry bar and fades up while the outgoing one
  // closes a lowpass and fades over FADE_BARS of its bars, so two tempos never fight for long.
  function scheduleNext(at = null, fadeBars = FADE_BARS) {
    const from = T.lead, to = nextOf(from);
    const fs = SONGS[from], ts = SONGS[to];
    const tb = at ?? T.tracks[from].anchorClock + (fs.barT(fs.out) - T.tracks[from].anchorPos);
    T.next = { from, to, tb, fade: fs.bar * fadeBars };
    anchor(to, tb, ts.barT(ts.enter));
    if (T.ctx) scheduleAudio(T.next);
  }
  function scheduleAudio(n) {
    const ts = SONGS[n.to];
    startSource(n.to, n.tb, ts.barT(ts.enter), 0.0001);
    const ti = T.tracks[n.to], to = T.tracks[n.from];
    ti.gain.gain.setValueAtTime(0.0001, n.tb);
    ti.gain.gain.linearRampToValueAtTime(1, n.tb + n.fade);
    if (to.gain) {
      to.gain.gain.cancelScheduledValues(n.tb);
      to.gain.gain.setValueAtTime(1, n.tb);
      to.gain.gain.linearRampToValueAtTime(0.0001, n.tb + n.fade);
      to.filter.frequency.cancelScheduledValues(n.tb);
      to.filter.frequency.setValueAtTime(18000, n.tb);
      to.filter.frequency.exponentialRampToValueAtTime(260, n.tb + n.fade);
      stopSource(n.from, n.tb + n.fade + 0.05);
    }
  }

  // the stage follows the incoming song from the middle of the crossfade; once it is over, queue the next
  function tickTransport() {
    const now = clock();
    for (let guard = 0; guard < 4 && T.next; guard++) {
      const n = T.next;
      if (T.lead === n.from && now >= n.tb + n.fade * 0.5) {
        T.lead = n.to;
        setTrackLabel();
      }
      if (now >= n.tb + n.fade) {
        T.next = null;
        scheduleNext();
      } else break;
    }
  }
  const tickTimer = setInterval(() => { if (!T.paused) tickTransport(); }, 250); // keeps the playlist going in a background tab

  // ---- sound on / off
  async function enableSound() {
    if (T.loading) return;
    T.loading = true;
    setSwitch(true, "…");
    const AC = window.AudioContext || window.webkitAudioContext;
    const ctx = new AC({ latencyHint: "interactive" });
    try {
      const bufs = await Promise.all(ORDER.map((k) => fetch(SONGS[k].src).then((r) => r.arrayBuffer()).then((b) => ctx.decodeAudioData(b))));
      ORDER.forEach((k, i) => (T.buffers[k] = bufs[i]));
    } catch (e) {
      console.error(e);
      T.loading = false;
      setSwitch(false, "Off");
      return;
    }
    // a crossfade in flight while muted just completes, then the playheads move to the audio clock
    if (T.next && clock() >= T.next.tb) { T.lead = T.next.to; T.next = null; setTrackLabel(); }
    const before = clock();
    T.ctx = ctx;
    T.master = ctx.createGain();
    T.master.gain.value = 0;
    T.bus = ctx.createGain();
    T.analyser = ctx.createAnalyser();
    T.analyser.fftSize = 2048;
    T.analyser.smoothingTimeConstant = 0.55;
    T.freq = new Uint8Array(T.analyser.frequencyBinCount);
    T.bus.connect(T.analyser);
    T.bus.connect(T.master).connect(ctx.destination);
    await ctx.resume();
    const lat = ctx.outputLatency || 0;
    const at = ctx.currentTime + 0.08;
    const delta = at - (before + 0.08 + lat); // old clock + delta = new clock
    for (const tr of Object.values(T.tracks)) tr.anchorClock += delta;
    if (T.next) T.next.tb += delta;
    startSource(T.lead, at, posOf(T.lead, at), 1);
    if (T.next) scheduleAudio(T.next);
    else scheduleNext();
    T.loading = false;
    setSound(true);
  }
  // volume: starts at 50%, remembered for this browser
  const volEl = root.querySelector(".deck .vol");
  T.volume = 0.5;
  try { const v = parseFloat(localStorage.getItem("tz-volume")); if (v >= 0 && v <= 1) T.volume = v; } catch { /* storage off */ }
  function showVolume() {
    const pct = Math.round(T.volume * 100);
    volEl.value = pct;
    volEl.style.setProperty("--v", pct + "%");
    volEl.title = `Volume ${pct}%`;
    volEl.setAttribute("aria-valuetext", `${pct}%`);
    volEl.classList.toggle("off", !T.soundOn);
  }
  volEl.addEventListener("input", () => {
    T.volume = volEl.value / 100;
    try { localStorage.setItem("tz-volume", String(T.volume)); } catch { /* storage off */ }
    if (T.ctx && T.soundOn) T.master.gain.setTargetAtTime(T.volume, T.ctx.currentTime, 0.04);
    showVolume();
  });
  showVolume();
  function setSound(on) {
    if (!T.ctx) return on ? enableSound() : null;
    T.soundOn = on;
    const g = T.master.gain;
    g.cancelScheduledValues(T.ctx.currentTime);
    g.setValueAtTime(g.value, T.ctx.currentTime);
    g.linearRampToValueAtTime(on ? T.volume : 0, T.ctx.currentTime + 0.4);
    setSwitch(on, on ? "On" : "Off");
    showVolume();
  }

  // pause freezes the show and the audio clock with it
  function setPaused(p) {
    if (p === T.paused) return;
    T.paused = p;
    if (T.ctx) { if (p) T.ctx.suspend(); else T.ctx.resume(); }
    else if (p) T.pauseAt = performance.now();
    else T.pausedTotal += performance.now() - T.pauseAt;
    pauseBtn.setAttribute("aria-pressed", String(p));
    pauseBtn.setAttribute("aria-label", p ? "Play the show" : "Pause the show");
    pauseBtn.innerHTML = p ? ICON.play : ICON.pause;
  }

  const ICON = {
    pause: '<svg viewBox="0 0 16 16" aria-hidden="true"><rect x="3.5" y="2.5" width="3" height="11" rx="1.5"/><rect x="9.5" y="2.5" width="3" height="11" rx="1.5"/></svg>',
    play: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M5 3.2c0-.8.9-1.3 1.6-.9l6.6 4.3c.6.4.6 1.3 0 1.7l-6.6 4.3c-.7.4-1.6-.1-1.6-.9z"/></svg>',
    on: '<path d="M2 6h2.5L8 3v10L4.5 10H2z"/><path d="M10.5 5.2a4 4 0 0 1 0 5.6M12.4 3.4a6.6 6.6 0 0 1 0 9.2" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>',
    off: '<path d="M2 6h2.5L8 3v10L4.5 10H2z"/><path d="M10.5 6l4 4M14.5 6l-4 4" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>',
  };
  const soundBtn = root.querySelector(".deck .sw");
  const pauseBtn = root.querySelector(".deck .pause");
  pauseBtn.innerHTML = ICON.pause;
  soundBtn.addEventListener("click", () => setSound(!T.soundOn));
  pauseBtn.addEventListener("click", () => setPaused(!T.paused));
  // the switch shows the state (on or off), never the action
  function setSwitch(on, label) {
    soundBtn.setAttribute("aria-checked", String(on));
    soundBtn.querySelector(".spk").innerHTML = on ? ICON.on : ICON.off;
    soundBtn.querySelector(".state").textContent = label;
  }
  function setTrackLabel() {
    const s = SONGS[T.lead];
    const now = root.querySelector(".now");
    now.querySelector(".t").textContent = s.title;
    now.querySelector(".a").textContent = s.artist;
  }
  setSwitch(false, "Off");

  // the show opens on Heroes Tonight's build, a few bars before its first drop
  anchor("heroes", clock(), SONGS.heroes.barT(SONGS.heroes.opening));
  scheduleNext();

  // ============================================================================================
  // the journey: stops along one scroll runway. Each stop holds the camera for its HOLDS entry (in vh of scroll),
  // then the camera flies to the next one over FLY, pulling out to a wide shot on the way.
  // ============================================================================================
  const STOPS = ["hero", "problem", "audience", "organiser", "vendor", "freelancer", "attendee", "outro"];
  // touch screens get shorter holds and flights: every swipe should visibly move the show on
  const TOUCH = matchMedia("(pointer: coarse)").matches || innerWidth < 900;
  const FLY = TOUCH ? 75 : 110;
  const HOLDS = STOPS.map((id) => (id === "problem" ? (TOUCH ? 100 : 150) : TOUCH ? 55 : 90));
  const STARTS = HOLDS.map((_, i) => HOLDS.slice(0, i).reduce((a, h) => a + h + FLY, 0));
  const U_END = STARTS[STOPS.length - 1] + HOLDS[STOPS.length - 1]; // the end of the last hold, in vh
  const holdCentre = (i) => STARTS[i] + HOLDS[i] / 2;
  const PK = STOPS.indexOf("problem");
  const SEC = { // light tint, button fill
    hero: [[239, 143, 127], [192, 80, 63]], problem: [[239, 143, 127], [192, 80, 63]], audience: [[239, 143, 127], [192, 80, 63]],
    organiser: [[143, 176, 198], [82, 108, 128]], vendor: [[124, 196, 164], [67, 122, 99]], freelancer: [[124, 196, 164], [67, 122, 99]],
    attendee: [[239, 143, 127], [192, 80, 63]], outro: [[239, 143, 127], [192, 80, 63]],
  };
  // per-frame CSS values, collected here and written at the end of the frame by flushVars
  const VARS = {};
  function setVar(k, v) { VARS[k] = v; }
  const journeyEl = root.querySelector("#journey");
  const panels = STOPS.map((id) => {
    const el = root.querySelector(`[data-stop="${id}"]`);
    return { id, el, items: [...el.querySelectorAll(".px")].map((n) => ({ n, lvl: -1, g: n.closest("[data-g]")?.dataset.g })), on: false, v: 0 };
  });
  const POOLS = [...root.querySelectorAll("[data-pool]")].map((el) => ({ el, pn: null }));

  // Per-frame values are written only where they're used, so a change restyles a few elements instead of the
  // whole page: --pulse and --lamp (registered as non-inherited in landing.css) on each element that reads
  // them; the inherited --sec and --sec-fill on the page's top-level parts; --prog on the progress bar.
  // Parts inside a stop are written only while it's on stage, the sections after the show only while in view.
  const USES = {
    "--pulse": ".panel, .led, .screen, .one, .sw .track",
    "--lamp": ".nav .logo, .panel, .lab, .led, .screen, .lit h2, #hero-main h1, .hub .brand",
  };
  const afterEl = root.querySelector(".after");
  const VT = []; // { el, keys, g: -1 always | stop index | "after", last }
  const groupOf = (el) => { const st = el.closest(".stop"); return st ? panels.findIndex((q) => q.el === st) : afterEl.contains(el) ? "after" : -1; };
  const target = (el, keys) => {
    let t = VT.find((x) => x.el === el);
    if (!t) VT.push((t = { el, keys: [], g: groupOf(el), last: {} }));
    for (const k of keys) if (!t.keys.includes(k)) t.keys.push(k);
  };
  for (const [k, sel] of Object.entries(USES)) root.querySelectorAll(sel).forEach((el) => target(el, [k]));
  for (const el of root.children) if (el.tagName !== "MAIN") target(el, ["--sec", "--sec-fill"]);
  panels.forEach((p) => target(p.el, ["--sec", "--sec-fill"]));
  target(afterEl, ["--sec", "--sec-fill"]);
  target(root.querySelector(".prog"), ["--prog"]);
  function flushVars(afterIn) {
    for (const t of VT) {
      if (t.g === "after" ? !afterIn : t.g >= 0 && !panels[t.g].on) continue;
      for (const k of t.keys) { const v = VARS[k]; if (v !== undefined && t.last[k] !== v) { t.last[k] = v; t.el.style.setProperty(k, v); } }
    }
  }
  const J = { u: 0, us: 0 };
  let VH = innerHeight, VW = innerWidth;
  function layoutJourney() { journeyEl.style.height = `${((U_END + 100) / 100) * VH}px`; }
  const uFromScroll = () => (scrollY / VH) * 100;
  const scrollFromU = (u) => (u / 100) * VH;

  // where along the runway: the stop held, or the pair being flown between and how far
  function where(u) {
    const uu = clamp(u, 0, U_END);
    let i = STOPS.length - 1;
    while (i > 0 && STARTS[i] > uu) i--;
    const w = uu - STARTS[i];
    if (w <= HOLDS[i] || i === STOPS.length - 1) return { i, j: i, t: 0, hold: clamp(w / HOLDS[i]) };
    return { i, j: i + 1, t: (w - HOLDS[i]) / FLY, hold: 1 };
  }
  // wheel and trackpad glide (touch stays native); same settings as the site's SmoothScroll
  const getLenis = opts.getLenis || (() => null);
  function goTo(idx) {
    idx = clamp(idx, 0, STOPS.length - 1);
    const top = scrollFromU(holdCentre(idx));
    const lenis = getLenis();
    if (lenis) {
      const dist = Math.abs(top - scrollY) / VH;
      lenis.scrollTo(top, { duration: Math.min(3.2, 1.2 + dist * 0.18), easing: (x) => 0.5 - 0.5 * Math.cos(Math.PI * x) });
    } else scrollTo({ top, behavior: reduce ? "auto" : "smooth" });
  }
  // nav, rail and role buttons jump to a stop; [data-open] opens a dialog
  on(document, "click", (ev) => {
    const a = ev.target.closest("[data-go]");
    if (a) { ev.preventDefault(); goTo(+a.dataset.go); return; }
    const o = ev.target.closest("[data-open]");
    if (o) root.querySelector("#" + o.dataset.open).showModal();
  });
  const rail = root.querySelector(".rail");
  const RAIL_NAMES = { hero: "Home", problem: "Why Tezera", audience: "Who it's for", organiser: "Organisers", vendor: "Vendors", freelancer: "Freelancers", attendee: "Attendees", outro: "After the show" };
  POOLS.forEach((p) => { const st = p.el.closest(".stop"); p.pn = st ? panels.find((q) => q.el === st) : null; });
  rail.innerHTML = STOPS.map((id, i) => `<button type="button" data-go="${i}" aria-label="${RAIL_NAMES[id]}" title="${RAIL_NAMES[id]}"></button>`).join("");

  // pixel-dither masks: level k shows k of the 16 cells in each 4x4 block (4px cells, ordered)
  (function makeMasks() {
    const css = [];
    for (let k = 0; k <= 16; k++) {
      const c = document.createElement("canvas");
      c.width = c.height = 16;
      const x = c.getContext("2d");
      x.fillStyle = "#000";
      for (let j = 0; j < 16; j++) if (BAYER[j] < k) x.fillRect((j % 4) * 4, Math.floor(j / 4) * 4, 4, 4);
      css.push(`--d${k}: url(${c.toDataURL()});`);
    }
    const st = document.createElement("style");
    st.textContent = `:root { ${css.join(" ")} }`;
    document.head.appendChild(st);
  })();
  function setLevel(item, v) {
    const lvl = Math.round(clamp(v) * 16);
    if (lvl === item.lvl) return;
    item.lvl = lvl;
    const s = item.n.style;
    s.visibility = lvl === 0 ? "hidden" : ""; // empty, so a hidden stop still hides it
    const m = lvl >= 16 || lvl === 0 ? "none" : `var(--d${lvl})`;
    s.webkitMaskImage = m;
    s.maskImage = m;
    s.translate = lvl >= 16 ? "" : `0 ${((16 - lvl) * 0.5).toFixed(1)}px`;
  }

  // the sections after the show resolve once, as they scroll in
  const reveals = [...root.querySelectorAll(".after .reveal")].map((n) => ({ n, lvl: -1, start: 0 }));
  reveals.forEach((r) => setLevel(r, 0));
  const io = new IntersectionObserver((es) => es.forEach((e) => {
    const r = reveals.find((q) => q.n === e.target);
    if (e.isIntersecting && !r.start) r.start = performance.now() + 80 * (reveals.indexOf(r) % 5);
  }), { threshold: 0.2 });
  reveals.forEach((r) => io.observe(r.n));


  // ============================================================================================
  // the stage
  // ============================================================================================
  const canvas = root.querySelector("#stage");
  const ctx2 = canvas.getContext("2d");
  let L = null;

  function buildLayout() {
    const w = innerWidth, h = innerHeight;
    const dpr = Math.min(devicePixelRatio || 1, 2);
    const narrow = w < 900;
    const css = narrow ? 7 : 12; // phones: a finer wall, so close-ups keep their detail on a small screen
    const cell = Math.round(css * dpr);
    const cols = Math.ceil((w * dpr) / cell), rows = Math.ceil((h * dpr) / cell);
    const lamp = Math.ceil(64 / css);
    const F = rows; // floor: the crowd stands on the bottom edge of the wide shot
    const cr = clamp(Math.round(rows * 0.2), 12, 22); // crowd height
    // prop scale: 1 unit = 1 cell on a typical desktop. Phones keep the props full size and spread them
    // along a stage wider than the screen; the camera pans to each one instead of zooming into a tiny one
    const u = cr / 18;
    const c0 = cols / 2;

    // where things stand (world cells; at zoom 1 the world is the screen)
    const P = {
      stallL: narrow ? c0 - 34 * u : Math.max(18 * u + 2, cols * 0.16),
      stallR: narrow ? c0 + 92 * u : cols + 3 * u,
      booth: narrow ? c0 : cols * 0.6,
      riser: narrow ? c0 + 62 * u : cols * 0.79,
      crowd: narrow ? c0 + 31 * u : cols * 0.37,
    };

    const rng = makeRng(7);
    const noise = new Float32Array(cols * rows);
    const order = new Float32Array(cols * rows);
    const ox = cols / 2, oy = rows * 0.42, reach = Math.hypot(ox, oy);
    for (let i = 0; i < cols * rows; i++) {
      const x = i % cols, y = (i / cols) | 0;
      noise[i] = rng();
      order[i] = 0.72 * (Math.hypot(x - ox, y - oy) / reach) + 0.28 * rng();
    }

    // speakers on the world grid (same size as the screen grid at zoom 1)
    const spk = new Int8Array(cols * rows), spkD = new Float32Array(cols * rows);
    const put = (x, y, k) => { if (x >= 0 && x < cols && y >= 0 && y < F) spk[y * cols + x] = k; };
    if (!narrow) {
      const aw = 8, top = lamp + 3, bottom = F - Math.round(cr * 2.1);
      const boxes = clamp(Math.floor((bottom - top) / 3), 4, 11);
      for (const side of [-1, 1]) {
        const x0 = side < 0 ? -2 : cols - aw + 2;
        for (const cx of [x0 + 1, x0 + aw - 2]) for (let y = lamp + 1; y < top; y++) put(cx, y, 7);
        for (let k = 0; k < boxes; k++) {
          const curl = Math.round(Math.pow(Math.max(0, k - boxes * 0.55), 1.5) * 0.45);
          const left = x0 + side * curl, y = top + k * 3;
          for (let x = left; x < left + aw; x++) {
            const c = x - left, edge = c === 0 || c === aw - 1;
            put(x, y, 4);
            put(x, y + 1, edge ? 4 : c >= 2 && c <= aw - 3 ? 6 : 5);
            put(x, y + 2, edge ? 4 : 5);
          }
        }
      }
      // subwoofers on the stage lip, far behind the crowd
      const sw = 8;
      for (const left of []) {
        for (let k = 0; k < 2; k++) {
          const boxTop = F - Math.round(cr * 0.7) - sw * (k + 1);
          const cx = left + sw / 2, cy = boxTop + sw / 2, rr = sw * 0.36;
          for (let y = boxTop; y < boxTop + sw; y++) for (let x = left; x < left + sw; x++) {
            if (y < 0 || x < 0 || x >= cols) continue;
            const i = y * cols + x, edge = y === boxTop || x === left || x === left + sw - 1;
            spk[i] = edge ? 2 : 1;
            const d = Math.hypot(x + 0.5 - cx, y + 0.5 - cy) / rr;
            if (!edge && d <= 1.25) { spk[i] = 3; spkD[i] = d; }
          }
        }
      }
    }

    // the crowd; gaps left where the stalls and the booth stand
    const prng = makeRng(23);
    const people = [];
    const armsFor = (front) => {
      const r = prng();
      if (front) return r < 0.28 ? "down" : r < 0.5 ? "pump" : r < 0.66 ? "up" : r < 0.8 ? "sway" : r < 0.9 ? "phone" : "stick";
      return r < 0.45 ? "down" : r < 0.65 ? "up" : r < 0.85 ? "pump" : "sway";
    };
    const size = narrow ? 0.8 : 1;
    const stallHalf = 12 * u;
    const blocked = (x, front) =>
      Math.abs(x - P.stallL) < stallHalf + (front ? -2 : 1) ||
      Math.abs(x - P.stallR) < stallHalf + (front ? -2 : 1) ||
      (front && Math.abs(x - P.booth) < 8 * u) ||
      (!front && Math.abs(x - P.booth) < 12 * u);
    const addRow = (front, spacing, start) => {
      for (let x = start - (narrow ? cols * 2.2 : cols * 0.7); x < (narrow ? cols * 3.4 : cols * 1.7); x += spacing * (0.85 + prng() * 0.3)) {
        const q = {
          x, front, base: F,
          h: cr * (front ? 0.74 + prng() * 0.14 : 0.88 + prng() * 0.1),
          headR: ((front ? 1.85 : 1.35) + prng() * 0.3) * size,
          sh: ((front ? 2.9 : 2.1) + prng() * 0.5) * size,
          phase: prng() * 0.35, amp: front ? 1 + Math.round(prng()) : Math.round(prng() * 1.4),
          half: prng() < 0.25, arms: armsFor(front), side: prng() < 0.5 ? 1 : -1, hue: (prng() * 3) | 0,
        };
        if (!blocked(x, front)) people.push(q);
      }
    };
    addRow(false, narrow ? 5.2 : 6.2, 3);
    addRow(true, narrow ? 7 : 8.6, 0.5);
    people.filter((q) => q.front && Math.abs(q.x - P.crowd) < 16 * u).forEach((q, j) => (q.arms = ["stick", "up", "phone", "stick", "pump"][j % 5]));
    // the attendee shot: someone on a friend's shoulders, right where the camera lands
    const carrier = people.filter((q) => q.front).reduce((a, q) => (Math.abs(q.x - P.crowd) < Math.abs(a.x - P.crowd) ? q : a));
    carrier.arms = "down";
    carrier.carry = true;
    people.push({ x: carrier.x, front: true, rider: carrier, h: cr * 0.5, headR: 1.6 * size, sh: 2.2 * size, phase: carrier.phase, amp: 0, half: false, arms: "up", side: 1, hue: 1, base: 0 });

    const beams = narrow
      ? [{ x: cols * 0.3, base: 0.18, phase: 0, light: 0 }, { x: cols * 0.7, base: -0.18, phase: Math.PI, light: 1 }]
      : [{ x: cols * 0.17, base: 0.32, phase: 0, light: 0 }, { x: cols * 0.4, base: 0.1, phase: 1.3, light: 1 }, { x: cols * 0.62, base: -0.1, phase: Math.PI + 1.3, light: 2 }, { x: cols * 0.85, base: -0.32, phase: Math.PI, light: 0 }];

    // camera targets: where each role's dive lands, and how much of the world it frames
    const shots = {
      organiser: { x: P.booth, y: F - 15 * u, fh: 30 * u, fw: 27 * u },
      vendor: { x: P.stallL, y: F - 13 * u, fh: 30 * u, fw: 27 * u },
      freelancer: { x: P.riser, y: F - 31 * u, fh: 26 * u, fw: 28 * u },
      attendee: { x: P.crowd, y: F - cr * 1.0, fh: cr * 1.4, fw: 24 * u },
    };

    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    const small = document.createElement("canvas");
    small.width = cols; small.height = rows;
    const sctx = small.getContext("2d");
    const img = sctx.createImageData(cols, rows);
    const tile = document.createElement("canvas");
    tile.width = tile.height = cell;
    const tc = tile.getContext("2d");
    const g = Math.max(1, Math.round(dpr * 1.6));
    tc.fillStyle = GAP; tc.fillRect(0, 0, cell, cell);
    tc.globalCompositeOperation = "destination-out";
    tc.beginPath(); tc.roundRect(g / 2, g / 2, cell - g, cell - g, Math.round(2 * dpr)); tc.fill();
    const grid = ctx2.createPattern(tile, "repeat");

    L = { dpr, cell, cols, rows, lamp, F, cr, u, narrow, P, noise, pool: new Float32Array(cols * rows), word: null, order, spk, spkD, people, beams, shots, small, sctx, img, grid,
      R: new Float32Array(cols * rows), G: new Float32Array(cols * rows), B: new Float32Array(cols * rows),
      back: new Uint8Array(cols * rows), front: new Uint8Array(cols * rows), beamGain: narrow ? 1.5 : 1 };
  }

  function segDist(px, py, ax, ay, bx, by) {
    const dx = bx - ax, dy = by - ay;
    const t = clamp(((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy || 1));
    return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
  }

  // a standing person, side-agnostic: h is foot to top of head, in units; legs = false hides them
  function figure(lx, ly, cx, foot, h, bob = 0, legs = true) {
    const headR = h * 0.12, headY = foot + h - headR + bob;
    const dx = Math.abs(lx - cx);
    if ((lx - cx) ** 2 + (ly - headY) ** 2 < headR * headR) return true;
    const sh = foot + h * 0.76 + bob, hip = foot + h * 0.44 + bob * 0.6;
    if (ly > sh && ly < headY && dx < h * 0.045) return true; // neck
    if (ly <= sh && ly > hip) {
      const r = h * 0.07, w0 = h * 0.17 - (sh - ly) * 0.06;
      const w = ly > sh - r ? w0 - r + Math.sqrt(Math.max(0, r * r - (ly - (sh - r)) ** 2)) : w0;
      return dx < w;
    }
    if (legs && ly <= hip && ly >= foot) return Math.abs(dx - h * 0.065) < h * 0.05;
    return false;
  }

  // 3x5 pixel letters for the stall signs
  const GLYPH = { F: "111100110100100", O: "111101101101111", D: "110101101101110", M: "101111111101101", E: "111100110100111", R: "110101110101101", C: "111100100100111", H: "101101111101101", Q: "111101101111001" };
  function glyphHit(word, lx, ly, gs) {
    // lx, ly: from the sign's top-left, in units; gs: units per glyph pixel
    const gx = Math.floor(lx / gs), gy = Math.floor(ly / gs);
    if (gy < 0 || gy > 4 || gx < 0) return false;
    const li = Math.floor(gx / 4), col = gx % 4;
    if (li >= word.length || col === 3) return false;
    return GLYPH[word[li]][gy * 3 + col] === "1";
  }

  // ============================================================================================
  // the opening: the wall is dark, "tezera" glows in LED cells with an equaliser filling under it as
  // the page loads; then Enter with sound / Enter quietly, and the wall boots outward from the wordmark
  // ============================================================================================
  const OPEN = { phase: "loading", t0: performance.now(), loaded: false, bootAt: 0, short: false, mask: null, sparks: null };
  const BOOT = 2500; // ms from the click to the hero being fully up
  const MIN_LOAD = 1600; // long enough for the colour to fill the wordmark
  try { OPEN.short = sessionStorage.getItem("tz-opened") === "1"; } catch { /* storage off */ }
  // ?intro always plays the full opening (for demos and reviews)
  if (new URLSearchParams(location.search).has("intro")) OPEN.short = false;
  document.documentElement.classList.add("tz-opening");
  const markLoaded = () => document.fonts.ready.then(() => { if (dead) return; OPEN.loaded = true; if (L) L.word = null; measureHung(); });
  if (document.readyState === "complete") markLoaded(); else on(window, "load", markLoaded);
  const gate = root.querySelector(".gate");
  function boot(withSound) {
    if (OPEN.phase === "boot" || OPEN.phase === "done") return;
    OPEN.phase = "boot";
    OPEN.bootAt = performance.now();
    try { sessionStorage.setItem("tz-opened", "1"); } catch { /* storage off */ }
    gate.classList.remove("on");
    // the show starts so its first drop lands as the boot finishes
    anchor("heroes", clock(), SONGS.heroes.barT(36) - (OPEN.short ? 0.5 : BOOT / 1000));
    T.next = null;
    scheduleNext();
    if (withSound) setSound(true);
  }
  gate.querySelector(".in-sound").addEventListener("click", () => boot(true));
  gate.querySelector(".in-quiet").addEventListener("click", () => boot(false));

  // the brand's three colours: organiser blue, vendor green, attendee coral
  const TRI = [[120, 160, 210], [104, 196, 150], [240, 122, 104]];
  // t in 0..1 runs blue -> green -> coral
  const tri = (t) => { const u = clamp(t) * 2; return u < 1 ? mix(TRI[0], TRI[1], u) : mix(TRI[1], TRI[2], u - 1); };
  // a slow diagonal sweep of the three colours across the wordmark, looping blue -> green -> coral -> blue
  function triSweep(x, span, now) {
    const u = (((x / (span * 0.35) - now / 2600) % 3) + 3) % 3;
    const k = Math.floor(u), f = u - k;
    // each colour holds most of its band and hands over quickly, so no muddy in-between dominates
    return mix(TRI[k], TRI[(k + 1) % 3], smooth(0.72, 1, f));
  }
  // the wordmark rasterised into wall cells (built on layout, once fonts are in)
  function wordMask() {
    const { cols, rows } = L;
    const c = document.createElement("canvas");
    c.width = cols; c.height = rows;
    const x = c.getContext("2d");
    const size = Math.round(Math.min(cols * 0.2, rows * 0.32));
    x.font = `800 ${size}px ${getComputedStyle(root.querySelector(".logo")).fontFamily}`;
    x.textAlign = "center";
    x.textBaseline = "middle";
    x.fillStyle = "#fff";
    x.fillText("tezera", cols / 2, rows * 0.42);
    const d = x.getImageData(0, 0, cols, rows).data;
    const m = new Uint8Array(cols * rows);
    let n = 0;
    for (let i = 0; i < cols * rows; i++) if (d[i * 4 + 3] > 110) { m[i] = 1; n++; }
    let x0 = cols, x1 = 0;
    for (let i = 0; i < cols * rows; i++) if (m[i]) { const x = i % cols; if (x < x0) x0 = x; if (x > x1) x1 = x; }
    return { m, n, x0, x1, cx: cols / 2, cy: rows * 0.42, base: Math.round(rows * 0.42 + size * 0.42) };
  }

  // ============================================================================================
  // one frame
  // ============================================================================================
  let powerStart = Infinity;
  const bassState = { v: 0 };
  let lastStop = -1;

  // everything the frame needs to measure, read before any style is written (no forced layouts mid-frame)
  function readPhase() {
    const pr = [];
    for (const p of POOLS) {
      if (p.pn && !p.pn.on) continue;
      const r = p.el.getBoundingClientRect();
      if (r.bottom < -40 || r.top > innerHeight + 40 || !r.width) continue;
      pr.push({ r, pn: p.pn });
    }
    const pst = panels[PK].on ? PSTAGE.getBoundingClientRect() : null;
    let cur = null;
    if (document.documentElement.classList.contains("tz-cursor") && CUR.ta) {
      const under = document.elementFromPoint(CUR.x, CUR.y);
      const tg = under ? under.closest("a, button, [role='tab'], input, [data-go]") : null;
      if (tg) cur = { r: tg.getBoundingClientRect(), rad: parseFloat(getComputedStyle(tg).borderTopLeftRadius) || 6 };
    }
    const afterIn = afterEl.getBoundingClientRect().top < innerHeight;
    return { pr, pst, cur, afterIn };
  }
  let lastNow = 0;
  function frame(now) {
    if (dead) return;
    rafId = requestAnimationFrame(frame);
    const lz = getLenis();
    if (lz) { const hold = OPEN.phase !== "done"; if (hold !== !!lz.isStopped) { if (hold) lz.stop(); else lz.start(); } }
    const dtF = lastNow ? Math.min(0.1, (now - lastNow) / 1000) : 0.016;
    lastNow = now;
    if (!L) { tickCursor(null); return; }
    const RD = readPhase();
    tickCursor(RD.cur);
    if (!T.paused) tickTransport();
    const { cols, rows, F, cr, u, lamp, cell } = L;

    // ---- the opening's state
    if (OPEN.phase === "loading" && OPEN.loaded && now - OPEN.t0 > (OPEN.short ? 0 : MIN_LOAD)) {
      if (OPEN.short) boot(false);
      else { OPEN.phase = "gate"; gate.classList.add("on"); gate.querySelector(".in-sound").focus({ preventScroll: true }); }
    }
    if (OPEN.phase === "boot" && powerStart === Infinity) powerStart = OPEN.bootAt + (OPEN.short ? 0 : 500);
    const bootT = OPEN.phase === "boot" || OPEN.phase === "done" ? (now - OPEN.bootAt) / (OPEN.short ? 600 : BOOT) : 0;
    if (OPEN.phase === "boot" && bootT >= 1) { OPEN.phase = "done"; document.documentElement.classList.remove("tz-opening"); }
    if (!L.word && OPEN.loaded) L.word = wordMask();
    if (L.word && OPEN.phase !== "done") gate.style.top = `${((L.word.base + 6) * cell) / L.dpr}px`;

    // ---- where along the journey (the scroll, eased a touch so wheel steps glide)
    J.u = uFromScroll();
    // the camera trails the scroll by about a quarter of a second, so starts and stops feel cushioned
    J.us = reduce ? J.u : J.us + (J.u - J.us) * (1 - Math.exp(-dtF / (TOUCH ? 0.12 : 0.24)));
    if (Math.abs(J.u - J.us) < 0.01) J.us = J.u;
    const W = where(J.us);
    const ef = reduce ? (W.t < 0.5 ? 0 : 1) : 0.5 - 0.5 * Math.cos(Math.PI * W.t); // sine: no sudden speed-up mid-flight

    // stop weights: 1 while held, shared across a flight
    const w = {};
    STOPS.forEach((id) => (w[id] = 0));
    w[STOPS[W.i]] += 1 - ef;
    if (W.j !== W.i) w[STOPS[W.j]] += ef;
    const stopNow = W.t < 0.5 ? W.i : W.j;
    if (stopNow !== lastStop) {
      lastStop = stopNow;
      root.querySelectorAll(".rail button, .nav a.l[data-go]").forEach((b) => b.setAttribute("aria-current", String(+b.dataset.go === stopNow)));
    }
    // how far through a stop's hold: 0 on arrival, 1 when leaving
    const holdOf = (k) => (W.i === k && W.j === k ? W.hold : W.j === k ? 0 : W.i === k ? 1 : 0);

    // ---- music clock
    const s = SONGS[T.lead];
    const t = clock();
    const pos = posOf(T.lead, t);
    const beatF = (pos - s.first) / s.beat;
    const beatI = Math.floor(beatF);
    const p = beatF - beatI;
    const bar = Math.floor(beatF / 4);
    const e = (+s.energy[clamp(bar, 0, s.energy.length - 1)] || 0) / 9;
    const drop = s.drops.some((b) => bar === b);
    const sinceDrop = Math.min(...s.drops.map((b) => (pos >= s.barT(b) ? pos - s.barT(b) : 99)));
    const gridKick = Math.exp(-p * 5.5) * (beatI % 4 === 0 ? 1 : 0.8) * (0.35 + 0.65 * e);
    let live = 0;
    if (T.analyser && !T.paused) {
      T.analyser.getByteFrequencyData(T.freq);
      const hz = T.ctx.sampleRate / T.analyser.fftSize;
      let sum = 0, n = 0;
      for (let i = 1; i * hz < 150; i++) { sum += T.freq[i]; n++; }
      // onsets, not level: a kick is a jump above the recent average, so held basslines don't pin it
      const v = sum / Math.max(1, n) / 255;
      bassState.avg = (bassState.avg ?? v) * 0.9 + v * 0.1;
      const hit = clamp((v - bassState.avg * 1.04) / 0.12);
      bassState.v = hit > bassState.v ? hit : bassState.v * 0.84;
      // the analyser hears samples before the speakers do: hold each reading back by the output latency
      const q = (bassState.q ||= []);
      q.push([T.ctx.currentTime, bassState.v]);
      const due = T.ctx.currentTime - (T.ctx.outputLatency || 0);
      while (q.length > 1 && q[1][0] <= due) q.shift();
      live = q[0][1];
    }
    const kick = T.analyser && T.soundOn ? Math.max(gridKick * 0.55, live) : gridKick;
    const pulse = Math.pow(0.5 + 0.5 * Math.cos(TAU * p), 3) * (0.4 + 0.6 * e);
    const sweep = (TAU * beatF) / 8;
    const phrase = Math.floor(bar / 8);
    const fade = smooth(6, 8, (beatF / 4) % 8);

    // ---- the problem stop: the scattered fragments drift, then pull together into Tezera as you scroll
    const pHold = holdOf(PK);
    const fixT = smooth(0.5, 0.86, pHold);
    if (panels[PK].on && RD.pst) {
      const st = RD.pst;
      const pv = panels[PK].v;
      FRAGS.forEach((f, i) => {
        const inK = reduce ? (pHold >= f.at ? 1 : 0) : smooth(f.at, f.at + 0.05, pHold); // pops in
        const k2 = easeInOut(clamp((fixT - f.d) / 0.62)); // pulled into the hub
        const shake = reduce ? 0 : (1 - k2) * (1.2 + 1.6 * smooth(0.2, 0.48, pHold));
        const dx = f.x * st.width * 0.5 * (1 - k2) + Math.sin(now / 90 * f.s + i * 1.7) * shake + Math.sin(now / 1300 + i) * 5 * (1 - k2);
        const dy = f.y * st.height * 0.5 * (1 - k2) + Math.cos(now / 110 * f.s + i * 2.3) * shake;
        const sc = (0.7 + 0.3 * inK) * (1 - 0.7 * k2);
        const tf = `translate(-50%, -50%) translate(${dx.toFixed(1)}px, ${dy.toFixed(1)}px) rotate(${(f.r * (1 - k2)).toFixed(2)}deg) scale(${sc.toFixed(3)})`;
        if (tf !== f.tf) { f.tf = tf; f.el.style.transform = tf; }
        const op = (pv * inK * (1 - smooth(0.7, 1, k2))).toFixed(3);
        if (op !== f.op) { f.op = op; f.el.style.opacity = op; }
      });
    }

    // ---- panels: each stop's info resolves from pixels as the camera lands and breaks up as it leaves
    const intro = OPEN.phase === "done" ? 1 : smooth(0.45, 0.95, bootT);
    panels.forEach((pn, k) => {
      let v = 0;
      if (W.i === k && W.j === k) v = 1;
      else if (W.i === k) v = 1 - smooth(0, 0.38, W.t);
      else if (W.j === k) v = smooth(0.6, 1, W.t);
      if (k === 0) v *= intro;
      if (OPEN.phase !== "done" && OPEN.phase !== "boot") v = 0;
      const on = v > 0.001;
      if (on !== pn.on) { pn.on = on; pn.el.classList.toggle("on", on); pn.el.inert = !on; }
      pn.v = v;
      if (!on) return;
      const n = pn.items.length;
      pn.items.forEach((it, idx) => {
        const g = it.g === "before" ? 1 - smooth(0.3, 0.48, fixT) : it.g === "after" ? smooth(0.46, 0.64, fixT) : it.g === "hub" ? smooth(0.55, 0.9, fixT) : 1;
        setLevel(it, (v * 1.5 - (idx / Math.max(1, n - 1)) * 0.5) * g);
      });
    });
    reveals.forEach((r) => { if (r.start) setLevel(r, (now - r.start) / 650); });

    if (TOUCH) {
      const pn = panels[W.i];
      const el = pn.el.firstElementChild;
      if (el && W.i === W.j && pn.id !== "hero") { const tf = `translateY(${((0.5 - W.hold) * 26).toFixed(1)}px)`; if (el.dataset.tf !== tf) { el.dataset.tf = tf; el.style.transform = tf; } }
    }
    setVar("--prog", (clamp(J.us / U_END)).toFixed(4));

    // ---- feature tabs at each role stop: they move on with the song, one every 8 bars, from the first
    for (const id in TABS) {
      const tb = TABS[id];
      if (!panels[STOPS.indexOf(id)].on) { tb.wasOn = false; continue; }
      if (!tb.wasOn) { tb.wasOn = true; tb.base = Math.floor(bar / 8); selectTab(tb, 0); }
      const auto = (((Math.floor(bar / 8) - tb.base) % 4) + 4) % 4;
      const pinned = now < tb.pinUntil;
      if (!pinned && auto !== tb.idx) selectTab(tb, auto);
      const prog = pinned ? 0 : (((beatF / 4) % 8) + 8) % 8 / 8;
      tb.btns.forEach((b, k) => { const v2 = `scaleX(${k === tb.idx ? prog.toFixed(3) : 0})`; if (b.lastChild.dataset.v !== v2) { b.lastChild.dataset.v = v2; b.lastChild.style.transform = v2; } });
    }

    // ---- camera: each stop's shot; flights pull out towards the wide shot and back in
    const desktop = !L.narrow;
    const shotOf = (id) => {
      if (id === "hero" || id === "outro") return { x: cols / 2, y: rows / 2, z: 1 };
      if (id === "problem") return { x: cols / 2, y: rows * 0.56, z: 1.22 };
      if (id === "audience") return { x: cols / 2, y: rows / 2 + rows * 0.04, z: 1.12 };
      const sh = L.shots[id];
      if (!desktop) {
        const zp = clamp(Math.min((rows * 0.46) / sh.fh, (cols * 0.96) / sh.fw), 1.1, 2.4);
        return { x: sh.x, y: sh.y + (0.2 * rows) / zp, z: zp };
      }
      const z = Math.max(2.2, rows / sh.fh) * 0.92;
      // desktop: subject right of centre, the info on the left; phones: subject up top, the info below
      return desktop ? { x: sh.x - (0.2 * cols) / z, y: sh.y, z } : { x: sh.x, y: sh.y + (0.3 * rows) / z, z };
    };
    const A0 = shotOf(STOPS[W.i]), B0 = shotOf(STOPS[W.j]);
    // a slow push-in while a stop is held; it carries on into the flight, so leaving never snaps back out
    A0.z *= 1 + (reduce ? 0 : desktop ? 0.03 : 0.07) * (W.j === W.i ? W.hold : 1);
    const lA = Math.log(A0.z), lB = Math.log(B0.z);
    const zm = 1.08; // how far a flight pulls out
    const dip = Math.max(0, Math.min(lA, lB) - Math.log(zm)) * Math.sin(Math.PI * ef);
    let z = Math.exp(lA + (lB - lA) * ef - dip);
    if (OPEN.phase !== "done") z = 1 + 0.05 * (1 - easeOut(bootT)); // the boot settles back from a hair closer
    const pullK = Math.sin(Math.PI * ef) * (dip > 0 ? 0.65 : 0);
    let cx = A0.x + (B0.x - A0.x) * ef, cy = A0.y + (B0.y - A0.y) * ef;
    cx += (cols / 2 - cx) * pullK;
    cy += (rows / 2 - cy) * pullK;
    const hw = cols / (2 * z), hh = rows / (2 * z);
    // the view never shows above the rig; phones may look a little below the floor, so the subject can sit high
    cy = clamp(cy, hh, Math.max(hh, F + (desktop ? 0 : (rows * 0.75) / z) - hh));
    const camL = cx - hw, camT = cy - hh;
    const toW = (sx) => camL + (sx + 0.5) / z; // screen cell -> world x
    const toWy = (sy) => camT + (sy + 0.5) / z;
    const c = clamp((z - 1) / 2); // how close the camera is

    // ---- the hero's screens hang in the rig: placed in world cells, so they fly and zoom with the camera
    const cpx = cell / L.dpr;
    const heroV = panels[0].v || 0;
    for (const h of L.hung) {
      if (!h.show) continue;
      const sx = (h.x - camL) * z * cpx, sy = (h.y - camT) * z * cpx;
      const tf = `translate3d(${sx.toFixed(1)}px, ${sy.toFixed(1)}px, 0) scale(${z.toFixed(4)})`;
      if (tf !== h.tf) { h.tf = tf; h.el.style.transform = tf; }
    }
    const hungW = heroV > 0.02 ? L.hung.filter((h) => h.show) : [];

    // ---- lights: the song's colours, leaning to the role's colours at its stop; house lights after the set
    let palMix = (i) => mix(PAL[s.pal][(i + phrase) % 3], PAL[s.pal][(i + phrase + 1) % 3], fade);
    for (const r of ["organiser", "vendor", "freelancer", "attendee"]) {
      if (w[r] > 0) { const prev = palMix, k = w[r]; palMix = (i) => mix(prev(i), PAL[r][(i + phrase) % 3], k); }
    }
    const dis = w.problem * (1 - fixT);
    if (dis > 0) { const prev = palMix; palMix = (i) => mix(prev(i), [112, 102, 108], 0.7 * dis); }
    const pal = palMix;
    const A = pal(0), Bc = pal(1);
    const beamCol = L.beams.map((bm) => pal(bm.light));
    const power = reduce && OPEN.phase === "done" ? 1 : clamp((now - powerStart) / 1300);
    const house = w.outro;
    const level = (0.45 + 0.55 * e) * (0.62 + 0.38 * kick) * (1 - 0.6 * house) * (1 - 0.4 * dis);
    setVar("--lamp", A.map((v) => Math.round(clamp(v, 0, 255))).join(", "));
    let sl = [0, 0, 0], sf = [0, 0, 0];
    for (const id of STOPS) {
      if (!w[id]) continue;
      const c2 = SEC[id] || SEC.hero;
      sl = sl.map((v, k) => v + c2[0][k] * w[id]);
      sf = sf.map((v, k) => v + c2[1][k] * w[id]);
    }
    setVar("--sec", sl.map(Math.round).join(", "));
    setVar("--sec-fill", sf.map(Math.round).join(", "));

    // ---- light pools behind the copy (screen space): the wall dims and takes a soft tint there
    const { R, G, B, back, front, noise, order } = L;
    const N = cols * rows;
    const pool = L.pool;
    pool.fill(0);
    const pad = 40, cssCell = cell / L.dpr;
    for (const { r, pn } of RD.pr) {
      const vis = pn ? pn.v : 1;
      if (vis <= 0.01) continue;
      const x0 = (r.left - pad) / cssCell, x1 = (r.right + pad) / cssCell, y0 = (r.top - pad) / cssCell, y1 = (r.bottom + pad) / cssCell;
      for (let y = Math.max(0, Math.floor(y0)); y < Math.min(rows, Math.ceil(y1)); y++) {
        for (let x = Math.max(0, Math.floor(x0)); x < Math.min(cols, Math.ceil(x1)); x++) {
          const ex = Math.min(x + 0.5 - x0, x1 - x - 0.5), ey = Math.min(y + 0.5 - y0, y1 - y - 0.5);
          const k = smooth(0, 4, Math.min(ex, ey)) * vis;
          const i = y * cols + x;
          if (k > pool[i]) pool[i] = k;
        }
      }
    }

    const focus = (name) => 0.1 + 0.32 * w[name];
    const practicals = [
      { x: L.P.booth, y: F - 17 * u, r: 15 * u, col: pal(0), k: focus("organiser") },
      { x: L.P.stallL, y: F - 15 * u, r: 15 * u, col: [255, 186, 120], k: focus("vendor") },
      { x: L.P.riser, y: F - 35 * u, r: 13 * u, col: pal(1), k: focus("freelancer") * 1.3 },
      { x: L.P.crowd, y: F - cr * 1.25, r: cr * 1.1, col: pal(2), k: 0.3 * w.attendee },
    ];

    // ---- 1. the wall, rig, beams, haze, speakers (all in world space)
    const glowTop = F - cr * 2.6, glowFull = F - cr * 0.55, hazeTop = F - cr * 2.2, hazeBot = F - cr * 0.5;
    const beamAng = L.beams.map((bm) => bm.base + 0.36 * Math.sin(sweep + bm.phase));
    const NB = L.beams.length;
    const bLo = new Float64Array(NB), bHi = new Float64Array(NB);
    const rowPr = [];
    // haze: split each sine into a per-column and a per-row part, so the per-cell cost is a few multiplies
    const hzS1 = L.hzS1 ||= new Float64Array(cols), hzS2 = L.hzS2 ||= new Float64Array(cols), hzC2 = L.hzC2 ||= new Float64Array(cols), hzS3 = L.hzS3 ||= new Float64Array(cols), hzC3 = L.hzC3 ||= new Float64Array(cols);
    for (let sx = 0; sx < cols; sx++) {
      const m = clamp(toW(sx) / cols);
      const a2 = TAU * (5 * m - 2 * t / 46), a3 = TAU * (9 * m + 3 * t / 46);
      hzS1[sx] = Math.sin(TAU * (2 * m + t / 46)); hzS2[sx] = Math.sin(a2); hzC2[sx] = Math.cos(a2); hzS3[sx] = Math.sin(a3); hzC3[sx] = Math.cos(a3);
    }
    const glowK = (0.3 + 0.22 * kick + 0.12 * e + (drop ? 0.1 : 0)) * (1 - 0.45 * c);
    for (let sy = 0; sy < rows; sy++) {
      const wy = toWy(sy);
      const glowRow = wy > glowTop ? Math.pow(smooth(glowTop, glowFull, wy), 1.4) * glowK : 0;
      const rS2 = Math.sin(wy * 0.5), rC2 = Math.cos(wy * 0.5), rS3 = Math.sin(wy * 0.9), rC3 = Math.cos(wy * 0.9);
      // per row: the x-range each beam's cone can reach, and which practical lights reach this row at all
      const dyB = wy - (lamp + 0.5);
      for (let j = 0; j < NB; j++) { bLo[j] = L.beams[j].x + dyB * Math.tan(beamAng[j] - 0.1601) - 1e-6; bHi[j] = L.beams[j].x + dyB * Math.tan(beamAng[j] + 0.1601) + 1e-6; }
      rowPr.length = 0;
      for (const pr of practicals) if (((wy - pr.y) * 1.25) ** 2 < pr.r * pr.r) rowPr.push(pr);
      const rowHung = hungW.filter((h) => wy < h.y + h.h + 7);
      const hazeEnv = wy > hazeTop && wy < hazeBot ? Math.sin((Math.PI * (wy - hazeTop)) / (hazeBot - hazeTop)) : 0;
      for (let sx = 0; sx < cols; sx++) {
        const i = sy * cols + sx;
        const wx = toW(sx);
        const n = noise[i];
        const on = clamp((power * 1.35 - order[i]) * 6);
        const lit = on * (1 - 0.72 * pool[i]);
        const m = clamp(wx / cols);
        let r = WALL[0] + (n - 0.5) * 6, g = WALL[1] + (n - 0.5) * 6, b = WALL[2] + (n - 0.5) * 6;
        if (wy >= F) {
          // the floor: near black, catching a little of the stage light
          const fl = (1 - clamp((wy - F) / (cr * 0.9))) * 0.07 * lit;
          R[i] = 12 + A[0] * fl; G[i] = 10 + A[1] * fl; B[i] = 11 + A[2] * fl;
          continue;
        }
        const iy = Math.floor(wy);
        if (iy < lamp) {
          if (iy === lamp - 1) { const metal = Math.floor(wx) % 2 === 0 ? 58 : 40; r = metal; g = metal - 6; b = metal - 3; }
          else if (iy >= 0) {
            // equaliser: the real spectrum when sound is on, the beat map otherwise
            const barX = Math.floor(wx / 3);
            r = 24; g = 21; b = 23;
            if (((Math.floor(wx) % 3) + 3) % 3 !== 2) {
              const nb = Math.ceil(cols / 3);
              let lvl;
              if (T.analyser) {
                const f0 = Math.pow(2, 5 + (barX / nb) * 9.3); // 32 Hz .. ~20 kHz, log spaced
                const bin = clamp(Math.round(f0 / (T.ctx.sampleRate / T.analyser.fftSize)), 1, T.freq.length - 1);
                lvl = clamp(T.freq[bin] / 255 * 1.15 - 0.1);
              } else {
                const bass = 1 - clamp(barX / nb);
                const f = 1 + (barX * 7) % 4;
                lvl = clamp((0.15 + 0.5 * kick * (0.4 + 0.6 * bass) + 0.4 * (0.5 + 0.5 * Math.sin((TAU * beatF * f) / 4 + hash(barX) * TAU))) * (0.4 + 0.6 * e));
              }
              const eqRows = lamp - 1, row = lamp - 2 - iy;
              if (row < Math.round(lvl * eqRows + 0.3)) {
                const cc = mix(A, Bc, row / Math.max(1, eqRows - 1));
                const kk = (0.5 + 0.25 * kick) * lit;
                r += cc[0] * kk; g += cc[1] * kk; b += cc[2] * kk;
              }
            }
          }
        } else if (iy === lamp) {
          for (let j = 0; j < L.beams.length; j++) {
            if (Math.abs(wx - L.beams[j].x) < 1.2) {
              const cc = beamCol[j], kk = (0.55 + 0.45 * level) * on;
              r = r * (1 - kk) + cc[0] * kk; g = g * (1 - kk) + cc[1] * kk; b = b * (1 - kk) + cc[2] * kk;
            }
          }
        } else {
          if (wy > glowTop) {
            const kk = glowRow * lit;
            r += (A[0] * (1 - m) + Bc[0] * m) * kk; g += (A[1] * (1 - m) + Bc[1] * m) * kk; b += (A[2] * (1 - m) + Bc[2] * m) * kk;
          }
          for (let j = 0; j < NB; j++) {
            if (wx < bLo[j] || wx > bHi[j]) continue;
            const bm = L.beams[j];
            const ang = beamAng[j];
            const dx = wx - bm.x, dy = wy - (lamp + 0.5);
            const dd = Math.abs(Math.atan2(dx, dy) - ang);
            if (dd > 0.16) continue;
            const kk = (smooth(0.16, 0.05, dd) * 0.36 + smooth(0.035, 0, dd) * 0.3) * (1 - 0.45 * (dy / rows)) * level * lit * L.beamGain;
            const cc = beamCol[j];
            r += cc[0] * kk; g += cc[1] * kk; b += cc[2] * kk;
          }
        }
        for (const h of rowHung) {
          if (wx < h.x - 7 || wx > h.x + h.w + 7) continue;
          // two cables per screen, from the rail down to the bezel
          if (wy > lamp && wy < h.y && (Math.abs(wx - (h.x + 2)) < 0.5 || Math.abs(wx - (h.x + h.w - 2)) < 0.5)) { r = 74; g = 68; b = 72; }
          // the screen's light spilling onto the wall round it
          const ddx = Math.max(h.x - wx, 0, wx - (h.x + h.w)), ddy = Math.max(h.y - wy, 0, wy - (h.y + h.h));
          if (ddx === 0 && ddy === 0) continue; // inside the screen: hidden behind it
          const dd = Math.sqrt(ddx * ddx + ddy * ddy);
          if (dd < 7) { const kk = (1 - dd / 7) ** 2 * 0.16 * heroV * lit; r += A[0] * kk; g += A[1] * kk; b += A[2] * kk; }
        }
        for (const pr of rowPr) {
          const dd = ((wx - pr.x) ** 2 + ((wy - pr.y) * 1.25) ** 2) / (pr.r * pr.r);
          if (dd < 1) { const kk = (1 - dd) * (1 - dd) * pr.k * on; r += pr.col[0] * kk; g += pr.col[1] * kk; b += pr.col[2] * kk; }
        }
        // speakers (on the world grid, so they grow blocky as the camera closes in)
        const ix = Math.floor(wx);
        const si = ix >= 0 && ix < cols && iy >= 0 && iy < rows ? iy * cols + ix : -1;
        const sp = si >= 0 ? L.spk[si] : 0;
        if (sp) {
          if (sp <= 3) {
            const face = sp === 2 ? 50 : 22;
            r = face; g = face - 6; b = face - 3;
            if (sp === 3) {
              const dd = L.spkD[si] / (1 + 0.14 * kick * on);
              if (dd <= 1) {
                if (dd > 0.72) { const kk = (0.25 + 0.75 * kick) * on; r = 78 + A[0] * kk * 0.85; g = 70 + A[1] * kk * 0.85; b = 74 + A[2] * kk * 0.85; }
                else if (dd < 0.32) { r = 92; g = 84; b = 87; }
                else { r = 12 + 18 * kick * on; g = 10 + 15 * kick * on; b = 11 + 16 * kick * on; }
              }
            }
          } else if (sp === 7) { r = 52; g = 47; b = 50; }
          else if (sp === 4) { const near = 0.4 + 0.6 * lit; const kk = 0.16 * on * near; r = 30 + 36 * near + A[0] * kk; g = 26 + 34 * near + A[1] * kk; b = 28 + 35 * near + A[2] * kk; }
          else if (sp === 5) { r = 17; g = 14; b = 16; }
          else { const kk = (0.25 + 0.75 * kick) * on * (0.5 + 0.5 * lit); r = 24 + A[0] * kk * 0.95; g = 20 + A[1] * kk * 0.95; b = 22 + A[2] * kk * 0.95; }
        }
        if (hazeEnv > 0 && !sp) {
          const dns = 0.5 + 0.25 * hzS1[sx] + 0.15 * (hzS2[sx] * rC2 + hzC2[sx] * rS2) + 0.1 * (hzS3[sx] * rC3 + hzC3[sx] * rS3);
          const fog = smooth(0.42, 0.95, dns) * hazeEnv * 0.24 * lit * (1 - 0.3 * c);
          r += ((A[0] * (1 - m) + Bc[0] * m) * 0.55 + 40) * fog; g += ((A[1] * (1 - m) + Bc[1] * m) * 0.55 + 36) * fog; b += ((A[2] * (1 - m) + Bc[2] * m) * 0.55 + 38) * fog;
        }
        if (pool[i] > 0) { const k2 = pool[i] * 0.06 * on; r += A[0] * k2; g += A[1] * k2; b += A[2] * k2; }
        R[i] = r; G[i] = g; B[i] = b;
      }
    }

    // helper: paint a prop over its screen box. fn(lx, ly) works in units (u) from the prop's foot, y up,
    // and returns an [r,g,b] or null
    const paint = (X, halfW, height, fn, below = 0) => {
      const sx0 = Math.max(0, Math.floor((X - halfW * u - camL) * z)), sx1 = Math.min(cols - 1, Math.ceil((X + halfW * u - camL) * z));
      const sy0 = Math.max(0, Math.floor((F - height * u - camT) * z)), sy1 = Math.min(rows - 1, Math.ceil((F + below * u - camT) * z));
      for (let sy = sy0; sy <= sy1; sy++) {
        const ly = (F - toWy(sy)) / u;
        for (let sx = sx0; sx <= sx1; sx++) {
          const lx = (toW(sx) - X) / u;
          const col = fn(lx, ly, sy * cols + sx);
          if (col) { const i = sy * cols + sx; const o2 = clamp((power * 1.35 - order[i]) * 6); R[i] = col[0] * o2 + R[i] * (1 - o2); G[i] = col[1] * o2 + G[i] * (1 - o2); B[i] = col[2] * o2 + B[i] * (1 - o2); }
        }
      }
    };
    const lightOn = (col, kk) => [col[0] * kk, col[1] * kk, col[2] * kk];
    const stageLit = (base, kk) => [base[0] + A[0] * kk, base[1] + A[1] * kk, base[2] + A[2] * kk];

    // ---- 2. props behind the crowd: two stalls and the camera riser
    const stall = (word, stripeA, stripeB, side) => (lx, ly, idx) => {
      const ax = Math.abs(lx);
      if (ax > 12 || ly < 0 || ly > 27) return null;
      // canopy: striped, with a scalloped valance
      if (ly >= 22 && ly <= 26.5 - ax * 0.12) {
        const stripe = Math.floor((lx + 12) / 2.4) % 2 === 0 ? stripeA : stripeB;
        return stageLit(lightOn(stripe, 0.62 - (ly - 22) * 0.03), 0.08 + 0.06 * kick);
      }
      const scallop = 22 - Math.sqrt(Math.max(0, 1.44 - Math.pow(((lx + 12) % 2.4) - 1.2, 2))) * 1.1;
      if (ly < 22 && ly >= scallop) {
        const stripe = Math.floor((lx + 12) / 2.4) % 2 === 0 ? stripeA : stripeB;
        return lightOn(stripe, 0.5);
      }
      // string lights hanging under the valance
      const sag = 19.6 - 1.4 * Math.cos((lx / 12) * Math.PI * 0.5);
      const bi = Math.round(lx / 2);
      if (Math.hypot(lx - bi * 2, ly - (19.6 - 1.4 * Math.cos((bi * 2 / 12) * Math.PI * 0.5) - 0.5)) < 0.42) {
        const lit_ = (bi + beatI) % 2 === 0 ? 1 : 0.45;
        return lightOn([255, 205, 130], lit_);
      }
      if (Math.abs(ly - sag) < 0.12 && ax < 11.5) return [40, 34, 30];
      // posts
      if (ax > 10.6 && ax < 11.4 && ly < 22) return [44, 39, 41];
      // counter with a sign
      if (ly < 8.4 && ax < 10.6) {
        if (ly > 7.6) return stageLit([96, 88, 84], 0.1);
        const sw = word.length * 4 * 0.9 - 0.9;
        const gx = lx + sw / 2, gy = 6.6 - ly;
        if (glyphHit(word, gx, gy, 0.9)) return lightOn([250, 238, 214], 0.85 + 0.15 * pulse);
        return lightOn(stripeB, 0.34);
      }
      // the stall holder behind the counter, waving on the beat
      const bob = Math.abs(Math.sin(Math.PI * beatF / s.bounce)) * 0.4;
      const hx = side * -4;
      if (ly >= 8.4 && figure(lx, ly, hx, 3.6, 12.6, bob, false)) return [16, 13, 14];
      const wave = Math.sin(TAU * beatF / 2) * 0.5;
      if (segDist(lx, ly, hx + 2.2 * side * -1, 12 + bob, hx + (3.4 + wave) * side * -1, 16.4 + bob) < 0.55) return [16, 13, 14];
      // goods on the counter: food trays or folded shirts
      if (ly >= 8.4 && ly < 9.6 && ax < 9.5 && Math.floor((lx + 10) / 2.2) % 2 === 0) {
        return word === "FOOD" ? lightOn([[230, 150, 80], [210, 90, 70], [240, 210, 110]][Math.floor((lx + 10) / 4.4) % 3], 0.75) : lightOn(PAL.vendor[Math.floor((lx + 10) / 4.4) % 3], 0.6);
      }
      // steam from the food stall
      if (word === "FOOD") {
        for (let k2 = 0; k2 < 3; k2++) {
          const ph = ((t * 0.35 + k2 / 3) % 1);
          const py = 10 + ph * 9, px = 3 + k2 * 2 + Math.sin(ph * 6 + k2) * 0.8;
          if (Math.hypot(lx - px, ly - py) < 0.6 + ph * 0.9) { const a = 0.28 * (1 - ph); return [R[idx] + (235 - R[idx]) * a, G[idx] + (232 - G[idx]) * a, B[idx] + (230 - B[idx]) * a]; }
        }
      }
      // shirts hanging on the merch rail
      if (word === "MERCH" && ly > 14.5 && ly < 18.5) {
        const si2 = Math.floor((lx + 9) / 3.6);
        const cxs = -9 + si2 * 3.6 + 1.8;
        if (si2 >= 0 && si2 < 5) {
          const ry = ly - 14.5, dx = Math.abs(lx - cxs);
          if (dx < 1.2 + (ry > 2.6 ? 0.6 : 0) && !(ry > 3.4 && dx < 0.4)) return lightOn(PAL.attendee[si2 % 3], 0.55 + 0.15 * pulse);
        }
      }
      return null;
    };
    const sage = [112, 169, 146], cream = [233, 231, 226], slate = [101, 128, 149], khaki = [182, 195, 167];
    paint(L.P.stallL, 12.2, 27.5, stall("FOOD", sage, cream, 1));
    paint(L.P.stallR, 12.2, 27.5, stall("MERCH", slate, khaki, -1));

    // the camera riser: scaffold tower, a photographer and a videographer
    const flashOn = (beatI % 4 === 0 && p < 0.14) || (drop && p < 0.1);
    const riser = (lx, ly) => {
      const ax = Math.abs(lx);
      if (ly < 0 || ly > 43 || ax > 13) return null;
      // flash burst around the photographer's camera
      const fxp = -6.3, fyp = 37.2;
      if (flashOn) {
        const dd = Math.hypot(lx - fxp, ly - fyp);
        const star = Math.min(Math.abs(lx - fxp), Math.abs(ly - fyp));
        if (dd < 1 || (star < 0.35 && dd < 4.5)) return WHITE;
      }
      // railing
      if (ly >= 27.5 && ly <= 31.2) {
        if (ly > 30.6 && ax < 6.4) return stageLit([70, 64, 66], 0.12);
        if (Math.abs(ax - 6) < 0.35 || Math.abs(lx) < 0.3) return [58, 53, 55];
      }
      // deck
      if (ly >= 26 && ly < 27.5 && ax < 6.6) return ly > 27 ? stageLit([88, 80, 82], 0.15) : [38, 34, 36];
      // scaffold below the deck
      if (ly < 26 && ax < 6) {
        if (Math.abs(ax - 5.6) < 0.4) return [62, 57, 59];
        const seg = 6.5, yy = ly % seg;
        if (yy < 0.4) return [56, 51, 53];
        const t1 = yy / seg;
        if (Math.abs(lx - (-5.6 + 11.2 * t1)) < 0.4 || Math.abs(lx - (5.6 - 11.2 * t1)) < 0.4) return [48, 44, 46];
        return null;
      }
      // photographer (left): side-on, camera to the eye, pointing at the stage
      const bob = Math.abs(Math.sin(Math.PI * beatF / s.bounce)) * 0.25;
      const px = -2.2;
      if (lx > -6.2 && lx < -3.6 && ly > 36.2 + bob && ly < 38.2 + bob) return ly > 37.8 + bob ? [120, 114, 116] : [74, 70, 72];
      if (lx > -7.2 && lx <= -6.2 && ly > 36.6 + bob && ly < 37.8 + bob) return lx < -6.9 ? lightOn(pal(1), 0.8) : [44, 41, 43];
      if (Math.abs(lx - -4.9) < 0.6 && ly >= 38.2 + bob && ly < 39 + bob) return [70, 66, 66];
      if (segDist(lx, ly, px - 1, 34.2 + bob, -4.4, 36.6 + bob) < 0.5) return [14, 12, 13];
      if (figure(lx, ly, px, 27.5, 11.4, bob)) return [14, 12, 13];
      // videographer (right): camera on a tripod with a red tally light
      const vx = 4.4;
      if (segDist(lx, ly, 2.6, 27.5, 2.6, 33.4) < 0.25 || segDist(lx, ly, 2.6, 30, 1.6, 27.5) < 0.22 || segDist(lx, ly, 2.6, 30, 3.6, 27.5) < 0.22) return [50, 46, 48];
      if (lx > 0.6 && lx < 4.2 && ly > 33.4 && ly < 35.8) return ly > 35.4 ? [110, 104, 106] : [66, 62, 64];
      if (lx > -0.4 && lx <= 0.6 && ly > 33.8 && ly < 35.4) return lx < -0.1 ? lightOn(pal(1), 0.8) : [44, 41, 43];
      if (Math.hypot(lx - 3.6, ly - 35.3) < 0.36) return beatI % 2 === 0 ? [255, 60, 50] : [120, 30, 26];
      if (segDist(lx, ly, vx - 1.1, 34 + bob, 3.6, 34.8) < 0.45) return [14, 12, 13];
      if (figure(lx, ly, vx + 0.4, 27.5, 10.8, bob)) return [14, 12, 13];
      return null;
    };
    paint(L.P.riser, 13, 43, riser);

    // ---- 3. the crowd (rasterised through the camera, so silhouettes sharpen as it closes in)
    back.fill(0); front.fill(0);
    const rise = reduce ? 0 : Math.round((1 - easeOut((power * 1.1 - 0.25) / 0.9)) * (cr + 3));
    const bounceOf = (q) => {
      const speed = (q.half ? 0.5 : 1) / s.bounce;
      return Math.round((q.amp * (0.5 + 0.7 * e) + (drop && q.front ? 1 : 0)) * Math.abs(Math.sin(Math.PI * (beatF * speed + q.phase))));
    };
    const rasterPerson = (q, mask) => {
      const speed = (q.half ? 0.5 : 1) / s.bounce;
      let baseY, top;
      if (q.rider) {
        const cq = q.rider;
        const cTop = cq.base - cq.h - bounceOf(cq) + rise;
        baseY = cTop + cq.headR * 2.2;
        top = baseY - q.h;
      } else {
        baseY = q.base;
        top = q.base - q.h - bounceOf(q) + rise;
      }
      const headCy = top + q.headR, shY = top + q.headR * 2 + 0.5;
      const armLen = q.rider ? q.h * 0.9 : q.h * (q.front ? 0.62 : 0.5);
      const sx = q.sh * 0.72;
      const arms = [];
      const mode = drop && !q.carry && q.arms !== "phone" && q.arms !== "stick" && (q.arms !== "down" || q.phase < 0.2) ? "up" : q.arms;
      const qp = (beatF * speed + q.phase) % 1;
      if (mode === "up") arms.push([q.x - sx, shY, q.x - sx - 1.3, shY - armLen], [q.x + sx, shY, q.x + sx + 1.3, shY - armLen]);
      else if (mode === "pump") { const up = qp < 0.5; arms.push([q.x + q.side * sx, shY, q.x + q.side * (sx + (up ? 0.5 : 1.6)), shY - armLen * (up ? 1 : 0.5)]); }
      else if (mode === "sway") { const a = 0.45 * Math.sin((Math.PI * beatF) / (2 * s.bounce) + q.phase * 6); arms.push([q.x - sx, shY, q.x - sx + Math.sin(a) * armLen, shY - Math.cos(a) * armLen], [q.x + sx, shY, q.x + sx + Math.sin(a) * armLen, shY - Math.cos(a) * armLen]); }
      else if (mode === "phone" || mode === "stick") { const a = 0.18 * Math.sin((Math.PI * beatF) / 4 + q.phase * 6); arms.push([q.x + q.side * sx, shY, q.x + q.side * (sx + 0.4) + Math.sin(a) * armLen, shY - armLen * 1.05]); }
      if (q.carry) arms.push([q.x - sx, shY, q.x - sx - 0.4, shY - 1.2], [q.x + sx, shY, q.x + sx + 0.4, shY - 1.2]); // holding the rider's legs
      const legs = q.rider ? [[q.x - 1, baseY - 0.5, q.x - 2.2, baseY + 3.2], [q.x + 1, baseY - 0.5, q.x + 2.2, baseY + 3.2]] : [];
      const val = q.front ? 2 : 1;
      const armW = q.front ? 0.72 : 0.5;
      const sx0 = Math.max(0, Math.floor((q.x - q.sh - 4 - camL) * z)), sx1 = Math.min(cols - 1, Math.ceil((q.x + q.sh + 4 - camL) * z));
      const sy0 = Math.max(0, Math.floor((top - armLen - 2 - camT) * z)), sy1 = Math.min(rows - 1, Math.ceil((baseY + (q.rider ? 4 : 0) - camT) * z));
      const segs = arms.concat(legs);
      for (let syy = sy0; syy <= sy1; syy++) {
        const py = toWy(syy);
        for (let sxx = sx0; sxx <= sx1; sxx++) {
          const px = toW(sxx);
          let hit = py <= baseY && (px - q.x) ** 2 + (py - headCy) ** 2 <= q.headR * q.headR + 0.2;
          if (!hit && py > headCy && py < shY + 0.5) hit = Math.abs(px - q.x) < q.headR * 0.5;
          if (!hit && py >= shY && py <= baseY) hit = Math.abs(px - q.x) <= q.sh * Math.min(1, 0.5 + (py - shY) * 0.45);
          if (!hit) for (const a of segs) if (segDist(px, py, a[0], a[1], a[2], a[3]) <= armW || Math.hypot(px - a[2], py - a[3]) <= armW + 0.3) { hit = true; break; }
          if (hit) { const i = syy * cols + sxx; if (mask[i] < val) mask[i] = val; }
        }
      }
      if ((mode === "phone" || mode === "stick") && arms[0]) {
        const [, , hx, hy] = arms[0];
        // phone torch: one bright point; glow stick: a short bar in the light colour
        for (let j = 0; j < (mode === "stick" ? 4 : 1); j++) {
          const syy = Math.floor((hy - 1 - j * 0.45 - camT) * z), sxx = Math.floor((hx - camL) * z);
          const ww = Math.max(1, Math.round(z * (mode === "stick" ? 0.45 : 0.6)));
          for (let a2 = 0; a2 < ww; a2++) for (let b2 = 0; b2 < ww; b2++) {
            const yy = syy + a2, xx = sxx + b2;
            if (xx >= 0 && xx < cols && yy >= 0 && yy < rows) mask[yy * cols + xx] = mode === "stick" ? 4 + q.hue : 3;
          }
        }
      }
    };
    for (const q of L.people) if (!q.front) rasterPerson(q, back);
    for (let i = 0; i < N; i++) {
      if (!back[i]) continue;
      const m = (i % cols) / cols;
      R[i] = 26 + (A[0] * (1 - m) + Bc[0] * m) * 0.1; G[i] = 21 + (A[1] * (1 - m) + Bc[1] * m) * 0.1; B[i] = 24 + (A[2] * (1 - m) + Bc[2] * m) * 0.1;
      if (back[i] === 3) { R[i] = WHITE[0]; G[i] = WHITE[1]; B[i] = WHITE[2]; }
    }

    // ---- 4. the organiser's Event HQ: a production tent at the side of the crowd
    const runRow = Math.floor(bar / 8) % 5; // the schedule ticks on every phrase
    const booked = 6 + (Math.floor(bar / 4) % 10); // stall bookings filling up on the laptop
    const BLUE = [92, 128, 170], BLUE2 = [128, 162, 198];
    const hq = (lx, ly) => {
      const ax = Math.abs(lx);
      if (ax > 12.6 || ly < 0 || ly > 27.2) return null;
      const roofTop = 26.8 - ax * 0.48;
      // the "HQ" plate hanging under the ridge
      if (ax < 4.5 && ly > 14.8 && ly < 21) {
        if (ly > 20.6 || ax > 4.1 || ly < 15.2) return [60, 58, 62];
        if (glyphHit("HQ", lx + 3.68, 20.15 - ly, 1.05)) return [34, 54, 92];
        return lightOn([226, 230, 236], 0.78 + 0.08 * pulse);
      }
      if (ax < 0.18 && ly >= 20.8 && ly < roofTop - 1.4) return [70, 66, 70]; // its cord
      // walkie-talkie at the organiser's ear, red light blinking on the beat
      const ox = -1.6;
      if (lx > ox - 2.75 && lx < ox - 1.85 && ly > 11.4 && ly < 13.4) return ly > 13.05 && lx < ox - 2.35 ? (beatI % 2 === 0 ? [255, 70, 56] : [110, 30, 24]) : [24, 22, 24];
      if (Math.abs(lx - (ox - 2.55)) < 0.12 && ly >= 13.4 && ly < 14.8) return [40, 38, 40];
      // clipboard in the other hand
      if (lx > ox + 1.3 && lx < ox + 3.5 && ly > 7.2 && ly < 10.2) {
        if (ly > 9.85 && Math.abs(lx - (ox + 2.4)) < 0.45) return [150, 150, 156];
        const line = (10 - ly) % 0.6 < 0.18 && ly < 9.6 && lx > ox + 1.6 && lx < ox + 3.2;
        return line ? [90, 96, 110] : lightOn([214, 218, 226], 0.8);
      }
      // the organiser: on their feet, radio up, clipboard out
      const bob = Math.abs(Math.sin(Math.PI * beatF / s.bounce)) * 0.15;
      if (segDist(lx, ly, ox - 1.3, 10.9 + bob, ox - 2.2, 12.2) < 0.48) return [14, 12, 16];
      if (segDist(lx, ly, ox + 1.4, 10.6 + bob, ox + 2.2, 8.9) < 0.48) return [14, 12, 16];
      if ((lx - ox) ** 2 + (ly - (13.2 + bob)) ** 2 < 1.45 * 1.45) return [16, 14, 18];
      if (figure(lx, ly, ox, 0.2, 14.6, bob)) return ly > 9.6 + bob && ly < 11.2 + bob && Math.abs(lx - ox) < 1.2 ? lightOn(BLUE2, 0.9) : [14, 12, 16]; // blue lanyard badge
      // the table, with a laptop showing the stall plan filling up
      if (lx > 2.2 && lx < 11 && ly > 7.4 && ly < 8.1) return stageLit([96, 90, 94], 0.1);
      if ((Math.abs(lx - 2.9) < 0.3 || Math.abs(lx - 10.3) < 0.3) && ly < 7.4) return [52, 48, 52];
      if (lx > 4 && lx < 8.6 && ly >= 8.1 && ly < 8.45) return [70, 68, 74];
      if (lx > 4.3 && lx < 8.3 && ly >= 8.45 && ly < 11.4) {
        if (ly > 11.05 || lx < 4.55 || lx > 8.05) return [30, 30, 36];
        const cx2 = Math.floor((lx - 4.6) / 0.62), cy2 = Math.floor((11 - ly) / 0.62);
        const inner = (lx - 4.6) % 0.62 > 0.12 && (11 - ly) % 0.62 > 0.12;
        if (!inner || cx2 > 5 || cy2 > 3) return [18, 26, 38];
        return cy2 * 6 + cx2 < booked ? [104, 196, 150] : [44, 64, 92];
      }
      // a crew member behind the table, checking in
      const cxr = 8.6;
      if ((lx - cxr) ** 2 + (ly - (12.6 + bob)) ** 2 < 1.3 * 1.3) return ly > 13.2 + bob ? lightOn(BLUE2, 0.75) : [16, 14, 18]; // cap
      if (figure(lx, ly, cxr, 1, 12.8, bob, false) && ly > 8.1) return [18, 16, 20];
      // the schedule board on an easel
      if (lx > -11.2 && lx < -4.6 && ly > 9.2 && ly < 17.2) {
        if (lx < -10.9 || lx > -4.9 || ly < 9.5 || ly > 16.9) return [150, 148, 152];
        const row = Math.floor((16.5 - ly) / 1.3);
        const rowY = 16.5 - row * 1.3 - ly;
        if (row < 0 || row > 4 || rowY < 0.3 || rowY > 0.9) return lightOn([224, 228, 234], 0.72);
        const done = row < runRow, now_ = row === runRow;
        if (lx < -10.1) return done ? [70, 170, 120] : now_ ? lightOn(BLUE2, 1) : [150, 154, 162];
        const len = -9.6 + 3 + hash(row) * 1.6;
        if (lx > -9.7 && lx < len) return now_ ? lightOn(BLUE, 0.95) : done ? [150, 156, 166] : [92, 98, 112];
        return lightOn([224, 228, 234], 0.72);
      }
      if (segDist(lx, ly, -9.8, 9.2, -10.6, 0.2) < 0.22 || segDist(lx, ly, -5.8, 9.2, -5, 0.2) < 0.22) return [70, 66, 70];
      // tent poles, roof and back wall
      if (ax > 11.5 && ax < 12.1 && ly < roofTop) return [70, 74, 84];
      if (ly <= roofTop && ly > roofTop - 1.7 && ax < 12.6) return lightOn(Math.floor((lx + 13) / 1.6) % 2 ? BLUE : BLUE2, 0.62 + 0.06 * pulse);
      if (ly <= roofTop - 1.7 && ly > roofTop - 2.4 && ax < 12.4) {
        const sc = ((lx + 13) % 1.6) / 1.6;
        return ly > roofTop - 1.7 - 0.7 * Math.sin(Math.PI * sc) ? lightOn(BLUE2, 0.5) : null;
      }
      if (ax < 11.5 && ly < roofTop - 1.7) return ly < 0.6 ? [26, 24, 28] : lightOn([70, 88, 120], 0.6 + 0.22 * (ly / 20) + 0.05 * pulse); // the tent lit from inside
      return null;
    };
    paint(L.P.booth, 12.6, 27.2, hq);

    // ---- 5. front row (with the rider on shoulders), rim-lit by the stage
    for (const q of L.people) if (q.front) rasterPerson(q, front);
    const sticks = PAL.attendee;
    for (let i = 0; i < N; i++) {
      const v = front[i];
      if (!v) continue;
      if (v === 3) { R[i] = WHITE[0] * 0.9; G[i] = WHITE[1] * 0.9; B[i] = WHITE[2] * 0.9; continue; }
      if (v >= 4) { const cc = sticks[v - 4]; R[i] = cc[0]; G[i] = cc[1]; B[i] = cc[2]; continue; }
      const above = i >= cols ? front[i - cols] : 0;
      R[i] = 9; G[i] = 7; B[i] = 8;
      if (!above || above >= 3) { R[i] += A[0] * 0.42; G[i] += A[1] * 0.42; B[i] += A[2] * 0.42; }
    }

    // ---- 6. sparks from the rig on each drop
    if (sinceDrop < 3 && !reduce) {
      const count = L.narrow ? 40 : 72;
      for (let kk = 0; kk < count; kk++) {
        const seed = phrase * 131 + kk;
        const age = sinceDrop - hash(seed) * 0.3, life = 1.3 + hash(seed + 0.5) * 1.1;
        if (age < 0 || age > life) continue;
        const bm = L.beams[kk % L.beams.length];
        const vx = (hash(seed + 0.25) - 0.5) * 12, vy = 1 + hash(seed + 0.75) * 6;
        const col = mix(WHITE, pal(kk % 3), hash(seed + 0.1) * 0.6);
        const fo = Math.pow(1 - age / life, 1.4) * power;
        for (const [lag, bright] of [[0, 1.25], [0.07, 0.5]]) {
          const tt = Math.max(0, age - lag);
          const wx = bm.x + vx * tt, wy = lamp + 1 + vy * tt + 7 * tt * tt;
          const sxx = Math.floor((wx - camL) * z), syy = Math.floor((wy - camT) * z);
          const ww = Math.max(1, Math.round(z * 0.8));
          for (let a2 = 0; a2 < ww; a2++) for (let b2 = 0; b2 < ww; b2++) {
            const xx = sxx + b2, yy = syy + a2;
            if (xx < 0 || xx >= cols || yy < 0 || yy >= rows) continue;
            const i = yy * cols + xx;
            if (front[i] || back[i]) continue;
            R[i] += col[0] * fo * bright; G[i] += col[1] * fo * bright; B[i] += col[2] * fo * bright;
          }
        }
      }
    }

    // ---- 7. the opening: the wordmark in LED cells, the loader equaliser, then the wordmark bursting
    if (OPEN.phase !== "done" && L.word) {
      const Wm = L.word;
      const ageMs = now - OPEN.t0;
      if (OPEN.phase !== "boot") {
        const a = smooth(0, 500, ageMs);
        // the page's load progress: the wordmark starts as grey, unlit cells and the brand colours fill it
        // left to right, with a bright leading edge; once full it keeps its colour sweep
        const loadP = OPEN.loaded ? clamp(ageMs / MIN_LOAD) : Math.min(0.85, ageMs / (MIN_LOAD * 2));
        const span = Math.max(1, Wm.x1 - Wm.x0);
        for (let i = 0; i < N; i++) {
          if (!Wm.m[i]) continue;
          const x = i % cols, y = (i / cols) | 0;
          const fillV = loadP * 1.14 - (x - Wm.x0 + (y - Wm.cy) * 0.35) / span - noise[i] * 0.06;
          let col;
          if (fillV > 0) {
            const tw = 0.82 + 0.18 * Math.sin(now / 260 + noise[i] * 40);
            col = triSweep(x + y * 0.6, cols, now).map((v) => v * tw);
            if (fillV < 0.04) col = mix(col, WHITE, 0.75);
          } else {
            const tw = 0.92 + 0.08 * Math.sin(now / 420 + noise[i] * 40);
            col = [74 * tw, 69 * tw, 72 * tw]; // an unlit cell, just visible
          }
          R[i] = col[0] * a + R[i] * (1 - a); G[i] = col[1] * a + G[i] * (1 - a); B[i] = col[2] * a + B[i] * (1 - a);
        }
        // loader: an equaliser under the wordmark, filling left to right as the page loads
        const eqA = OPEN.phase === "loading" ? smooth(150, 600, ageMs) : 0;
        const bars = 24, y0 = Wm.base + 4;
        for (let k = 0; k < bars && eqA > 0; k++) {
          const x = Math.round(Wm.cx - bars + k * 2);
          const filled = k / bars < loadP;
          const hgt = filled ? 1 + Math.round(3.5 * (0.5 + 0.5 * Math.sin(now / 150 + k * 0.8))) : 1;
          for (let j = 0; j < hgt; j++) {
            const y = y0 - j;
            if (x < 0 || x >= cols || y < 0 || y >= rows) continue;
            const i = y * cols + x;
            const col = filled ? tri(k / bars) : [60, 54, 57];
            R[i] = col[0] * eqA + R[i] * (1 - eqA); G[i] = col[1] * eqA + G[i] * (1 - eqA); B[i] = col[2] * eqA + B[i] * (1 - eqA);
          }
        }
      } else {
        // boot: every lit cell of the wordmark bursts outward and falls, as the wall powers on behind it
        const tt = (now - OPEN.bootAt) / 1000;
        if (!OPEN.sparks) {
          OPEN.sparks = [];
          for (let i = 0; i < N; i++) if (Wm.m[i]) OPEN.sparks.push([i % cols, (i / cols) | 0, noise[i]]);
        }
        for (const [x0, y0, nz] of OPEN.sparks) {
          const dx = x0 - Wm.cx, dy = y0 - Wm.cy, d = Math.hypot(dx, dy) || 1;
          const sp = 10 + nz * 26;
          const life = 0.7 + nz * 0.7;
          const delay = nz * 0.12;
          const a = tt < delay ? 1 : Math.pow(clamp(1 - (tt - delay) / life), 1.6);
          if (a <= 0.01) continue;
          const k = Math.max(0, tt - delay);
          const x = Math.round(x0 + (dx / d) * sp * k), y = Math.round(y0 + (dy / d) * sp * k + 9 * k * k);
          if (x < 0 || x >= cols || y < 0 || y >= rows) continue;
          const i = y * cols + x;
          const col = mix(WHITE, TRI[(x0 + y0) % 3], Math.min(1, 0.35 + k * 2.2));
          R[i] = Math.max(R[i], col[0] * a); G[i] = Math.max(G[i], col[1] * a); B[i] = Math.max(B[i], col[2] * a);
        }
      }
    }

    // ---- output: house lights warm and dim the wall after the set
    const data = L.img.data;
    for (let i = 0; i < N; i++) {
      let r = R[i], g = G[i], b = B[i];
      if (house > 0) { r = r * (1 - 0.35 * house) + 16 * house; g = g * (1 - 0.35 * house) + 11 * house; b = b * (1 - 0.35 * house) + 8 * house; }
      // the light pool behind copy covers props and crowd too, not just the wall
      if (CUR.a > 0.01) {
        // the cursor's follow-spot on the wall
        const ddx = (i % cols) + 0.5 - CUR.x / cpx, ddy = ((i / cols) | 0) + 0.5 - CUR.y / cpx;
        const d2 = (ddx * ddx + ddy * ddy) / 81;
        if (d2 < 1) { const kk = (1 - d2) * (1 - d2) * 0.15 * CUR.a; r += WHITE[0] * kk; g += WHITE[1] * kk; b += WHITE[2] * kk; }
      }
      const pl = pool[i];
      if (pl > 0) { const k = 1 - 0.58 * pl; r = r * k + A[0] * 0.035 * pl; g = g * k + A[1] * 0.035 * pl; b = b * k + A[2] * 0.035 * pl; }
      const o = i * 4;
      data[o] = r; data[o + 1] = g; data[o + 2] = b; data[o + 3] = 255;
    }
    L.sctx.putImageData(L.img, 0, 0);
    ctx2.imageSmoothingEnabled = false;
    ctx2.drawImage(L.small, 0, 0, cols * cell, rows * cell);
    ctx2.fillStyle = L.grid;
    ctx2.fillRect(0, 0, cols * cell, rows * cell);

    setVar("--pulse", (T.paused || reduce ? 0.35 : pulse * power).toFixed(3));
    flushVars(RD.afterIn);
  }

  // the hero's screens, in world cells: the main screen centred under the rig, two side screens on wide screens
  function measureHung() {
    if (!L) return;
    const css = L.cell / L.dpr, vw = innerWidth;
    const g = Math.max(16, vw * 0.04);
    const mainW = Math.min(860, vw - 2 * g);
    const main = root.querySelector("#hero-main");
    main.style.width = mainW + "px";
    const top = (64 + Math.max(10, innerHeight * 0.045)) / css;
    L.hung = [{ el: main, x: L.cols / 2 - mainW / css / 2, y: top, w: mainW / css, h: main.offsetHeight / css, show: true, tf: "" }];
  }

  // ---- the cursor: an LED dot, and a ring that hugs links and buttons (mouse and trackpad only)
  const fine = matchMedia("(hover: hover) and (pointer: fine)");
  const CUR = { x: -200, y: -200, rx: -200, ry: -200, rw: 28, rh: 28, rr: 14, a: 0, ta: 0, target: null };
  const curEl = root.querySelector(".cur"), dotEl = curEl.querySelector(".dot"), ringEl = curEl.querySelector(".ring");
  const syncFancy = () => document.documentElement.classList.toggle("tz-cursor", fine.matches);
  syncFancy();
  on(fine, "change", syncFancy);
  on(window, "pointermove", (ev) => {
    if (ev.pointerType !== "mouse") return;
    CUR.x = ev.clientX;
    CUR.y = ev.clientY;
    CUR.ta = 1;
    curEl.classList.remove("out");
  }, { passive: true });
  on(document.documentElement, "pointerleave", () => { CUR.ta = 0; curEl.classList.add("out"); });
  on(window, "pointerdown", () => curEl.classList.add("down"));
  on(window, "pointerup", () => curEl.classList.remove("down"));
  function tickCursor(cur) {
    if (!document.documentElement.classList.contains("tz-cursor")) { CUR.a = 0; return; }
    CUR.a += (CUR.ta - CUR.a) * 0.1;
    dotEl.style.translate = `${CUR.x}px ${CUR.y}px`;
    let tx, ty, tw, th, tr;
    if (cur) {
      const r = cur.r, pad = 5;
      tx = r.left - pad; ty = r.top - pad; tw = r.width + pad * 2; th = r.height + pad * 2;
      tr = Math.min(cur.rad + pad, tw / 2, th / 2);
    } else {
      tw = th = 28; tx = CUR.x - 14; ty = CUR.y - 14; tr = 14;
    }
    const k = reduce ? 1 : 0.24;
    CUR.rx += (tx - CUR.rx) * k; CUR.ry += (ty - CUR.ry) * k;
    CUR.rw += (tw - CUR.rw) * k; CUR.rh += (th - CUR.rh) * k; CUR.rr += (tr - CUR.rr) * k;
    ringEl.style.translate = `${CUR.rx.toFixed(1)}px ${CUR.ry.toFixed(1)}px`;
    ringEl.style.width = `${CUR.rw.toFixed(1)}px`;
    ringEl.style.height = `${CUR.rh.toFixed(1)}px`;
    ringEl.style.borderRadius = `${CUR.rr.toFixed(1)}px`;
    ringEl.style.opacity = cur ? "1" : "0.4";
  }

  layoutJourney();
  buildLayout();
  measureHung();
  document.fonts.ready.then(() => { if (!dead) measureHung(); });
  setTrackLabel();
  on(window, "resize", () => {
    // a phone's address bar showing or hiding only changes the height a little: ignore it, or the journey would jump
    if (TOUCH && innerWidth === VW && Math.abs(innerHeight - VH) < 160) return;
    const u = uFromScroll();
    VH = innerHeight; VW = innerWidth;
    layoutJourney(); buildLayout(); measureHung();
    scrollTo(0, scrollFromU(u)); // stay at the same point of the show
  });
  const prevRestore = history.scrollRestoration;
  history.scrollRestoration = "manual";
  scrollTo(0, 0);
  let rafId = requestAnimationFrame(frame);

  return () => {
    dead = true;
    cancelAnimationFrame(rafId);
    clearInterval(tickTimer);
    offs.forEach((f) => f());
    io.disconnect();
    if (T.ctx) T.ctx.close().catch(() => {});
    document.documentElement.classList.remove("tz-opening", "tz-cursor");
    history.scrollRestoration = prevRestore;
    const lz2 = getLenis();
    if (lz2 && lz2.isStopped) lz2.start();
  };
}
