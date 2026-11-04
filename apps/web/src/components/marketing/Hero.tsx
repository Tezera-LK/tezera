"use client"

import "@/components/marketing/Hero.css";
import { hero, site } from "@/content";

// small decorative squares: x/y = position %, s = width %, amp = float distance, dur = seconds
const chips = [
  { c: "gray", x: 8, y: 11, s: 6.3, amp: 6, dur: 5.2 },
  { c: "green", x: 44.5, y: 11, s: 8.3, amp: 8, dur: 6.1 },
  { c: "gray", x: 55.5, y: 13, s: 10.7, amp: 7, dur: 5.6 },
  { c: "red", x: 71.5, y: 14.5, s: 8.3, amp: 8, dur: 4.8 },
  { c: "blue", x: 7.4, y: 61, s: 11.8, amp: 9, dur: 5.4 },
  { c: "red", x: 74, y: 54.8, s: 10, amp: 8, dur: 5.1 },
  { c: "gray", x: 62.3, y: 66.8, s: 7.4, amp: 6, dur: 5.7 },
  { c: "red", x: 57.3, y: 82, s: 10.4, amp: 9, dur: 6.4 },
  { c: "gray", x: 33.6, y: 89.6, s: 8.1, amp: 6, dur: 5.5 },
  { c: "green", x: 100, y: 40, s: 8.1, amp: 6, dur: 5.5 },

];

export default function Hero() {
  return (
    <div className="hero">
      <div className="left">
        <div className="top">
          <div className="headline">
            <h1 dangerouslySetInnerHTML={{ __html: hero.headline }} />
          </div>
        </div>
        <div className="bottom">
          <div className="descriptions">
            <p>{hero.subhead}</p>
            <p>{hero.detail}</p>
          </div>
          <div className="signup">
            <button>
              SIGN UP
            </button>
            <a href="http://">Explore Events</a>
          </div>
        </div>
      </div>

      <div className="right">
        {chips.map((chip, i) => (
          <span
            key={i}
            className={`chip chip-${chip.c}`}
            style={{
              left: `${chip.x}%`,
              top: `${chip.y}%`,
              width: `${chip.s}%`,
              ["--amp" as string]: `${chip.amp}px`,
              ["--dur" as string]: `${chip.dur}s`,
              ["--delay" as string]: `${-i * 0.9}s`,
            }}
          />
        ))}

        <div className="card organiser-box" style={{ ["--dur" as string]: "6s", ["--delay" as string]: "-1s" }}>
          <p className="card-label">ORGANISER</p>
          <p className="card-title">Saturday Colombo Food Fair</p>
          <p className="card-sub">68% vendor slots filled</p>
          <div className="bar"><div className="bar-fill" style={{ width: "68%" }} /></div>
        </div>

        <div className="card vendor-box" style={{ ["--dur" as string]: "5.4s", ["--delay" as string]: "-2.5s" }}>
          <p className="card-label">VENDOR</p>
          <p className="card-title">Wedding Photographer needed</p>
          <p className="card-sub">Kandy</p>
        </div>

        <div className="card attendee-box" style={{ ["--dur" as string]: "6.6s", ["--delay" as string]: "-4s" }}>
          <p className="card-label">ATTENDEE</p>
          <p className="card-title">Rooftop Sunset Set</p>
          <p className="card-sub">112 Going</p>
        </div>
      </div>
    </div>
  )
}