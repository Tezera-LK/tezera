"use client"

// The landing page: one dark LED stage (drawn by show.js on a fixed canvas) with the page's stops laid
// over it. All the copy is in this markup, so it is server-rendered and readable without the stage;
// show.js only animates it: the camera, the pixel reveals, the playlist, the cursor and the opening.

import { useEffect, useRef, type CSSProperties, type ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { useLenis } from "lenis/react";
import "./landing.css";
import site from "@/content/site.json";
import hero from "@/content/landing/hero.json";
import problem from "@/content/landing/problem.json";
import audience from "@/content/landing/audience.json";
import organiser from "@/content/landing/organiser.json";
import vendor from "@/content/landing/vendor.json";
import freelance from "@/content/landing/freelance.json";
import attendee from "@/content/landing/attendee.json";
import purpose from "@/content/landing/purpose.json";
import team from "@/content/landing/team.json";
import join from "@/content/landing/join.json";
import footer from "@/content/landing/footer.json";
import privacy from "@/content/landing/privacy.json";
import navlinks from "@/content/landing/navlinks.json";

// the stops, in camera order (show.js uses the same order)
const STOPS = ["hero", "problem", "audience", "organiser", "vendor", "freelancer", "attendee", "outro"];
const go = (stop: string) => STOPS.indexOf(stop);

// brand colours by role: light tint for text and lights, darker fill for buttons with white text
const TINT: Record<string, string> = { org: "var(--org)", ven: "var(--ven)", att: "var(--att)", fre: "var(--fre)" };
const FILL: Record<string, string> = { org: "var(--org-fill)", ven: "var(--ven-fill)", att: "var(--att-fill)", fre: "var(--ven-fill)" };
const css = (vars: Record<string, string>) => vars as CSSProperties;
// feature screenshots: phones get the 1100px copy (*-m.webp), about the size they show at, instead of decoding the full one
const shotSet = (src: string) => `${src.replace(/\.webp$/, "-m.webp")} 1100w, ${src} 1940w`;
const SHOT_SIZES = "(max-width: 899px) 90vw, 2000px";

const ROLES = [
  { id: "organiser", content: organiser, tint: "org" },
  { id: "vendor", content: vendor, tint: "ven" },
  { id: "freelancer", content: freelance, tint: "ven" },
  { id: "attendee", content: attendee, tint: "att" },
];

const Chip = ({ children }: { children: ReactNode }) => (
  <span className="chip" aria-hidden="true">
    <svg viewBox="0 0 16 16" aria-hidden="true">{children}</svg>
  </span>
);
const ARROW = <path d="M3 8h9M8.5 4.5 12 8l-3.5 3.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />;
const DOWN = <path d="M8 3v9M4.5 8.5 8 12l3.5-3.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />;
const SPEAKER = <path d="M2 6h2.5L8 3v10L4.5 10H2z" fill="currentColor" />;

export default function LandingShow() {
  const rootRef = useRef<HTMLDivElement>(null);
  const lenis = useLenis();
  const lenisRef = useRef(lenis);
  useEffect(() => {
    lenisRef.current = lenis;
  }, [lenis]);

  // the stage runs for as long as the page is mounted
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    let stop: (() => void) | undefined;
    let cancelled = false;
    import("./show.js").then(({ startShow }) => {
      if (!cancelled) stop = startShow(root, { getLenis: () => lenisRef.current ?? null });
    });
    return () => {
      cancelled = true;
      stop?.();
    };
  }, []);

  return (
    <div className="tz" ref={rootRef}>
      <a className="skip-link" href="#main">Skip to content</a>
      <canvas id="stage" aria-hidden="true" />
      <div className="cur" aria-hidden="true"><i className="ring" /><i className="dot" /></div>

      <div className="gate" role="dialog" aria-label="Enter the show">
        <button className="btn solid in-sound" type="button">
          {hero.gate.withSound}
          <Chip>{SPEAKER}<path d="M10.5 5.2a4 4 0 0 1 0 5.6M12.4 3.4a6.6 6.6 0 0 1 0 9.2" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></Chip>
        </button>
        <button className="btn ghost in-quiet" type="button">
          {hero.gate.quiet}
          <Chip>{SPEAKER}<path d="M10.5 6l4 4M14.5 6l-4 4" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></Chip>
        </button>
        <p>{hero.gate.note}</p>
      </div>

      <header className="nav">
        <a className="logo" href="#main" data-go={0} aria-label="Tezera, back to the top">{site.wordmark}</a>
        <nav aria-label="Sections">
          <ul>
            {navlinks.links.map((l) => (
              <li key={l.name}>
                {"stop" in l && l.stop
                  ? <a className="l" href={`#${l.stop}`} data-go={go(l.stop)}>{l.name}</a>
                  : <a className="l" href={"href" in l ? l.href : "#main"}>{l.name}</a>}
              </li>
            ))}
          </ul>
        </nav>
        <Link className="btn solid sm cta-mini" href={hero.primary.href}>{hero.primary.label}<Chip>{ARROW}</Chip></Link>
      </header>

      <main id="main">
        <div className="journey" id="journey" />

        {/* hero: the show's main screen, hung in the rig (placed in world space by the stage) */}
        <section className="stop" id="hero" data-stop="hero" aria-labelledby="hero-title">
          <div className="hung screen px live" id="hero-main">
            <div className="face">
              <p className="onair"><i aria-hidden="true" />{hero.onair}</p>
              <h1 id="hero-title">{hero.headline.before}<span className="one" data-glow={hero.headline.highlight}>{hero.headline.highlight}</span>{hero.headline.after}</h1>
              <p className="value">{hero.value}</p>
              <div className="cta">
                <Link className="btn solid" href={hero.primary.href}>{hero.primary.label}<Chip>{ARROW}</Chip></Link>
                <a className="btn ghost down" href="#problem" data-go={go("problem")}>{hero.secondary.label}<Chip>{DOWN}</Chip></a>
              </div>
              <div className="ticker" aria-hidden="true">
                <div>
                  {[...hero.ticker, ...hero.ticker].map((t, i) => (
                    <span key={i}><i className="led" style={css({ "--c": TINT[t.role] })} /><b>{t.title}</b> {t.detail}</span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* the problem, and how Tezera solves it */}
        <section className="stop" id="problem" data-stop="problem" aria-label={problem.label}>
          <div className="pwrap">
            <div className="ptext lit" data-pool>
              <div data-g="before">
                <p className="kick px" style={css({ "--kf": "var(--att-fill)" })}><i className="led" />{problem.before.kicker}</p>
                <h2 className="px">{problem.before.heading}</h2>
                <p className="body px">{problem.before.body}</p>
              </div>
              <div data-g="after">
                <p className="kick px" style={css({ "--kf": "var(--ven-fill)" })}><i className="led" />{problem.after.kicker}</p>
                <h2 className="px">{problem.after.heading}</h2>
                <p className="body px">{problem.after.body}</p>
              </div>
            </div>
            <div className="pstage" aria-hidden="true">
              <div className="pile">
                {problem.notes.map((n, i) => (
                  <div className={`note ${n.kind}`} key={i}>
                    {n.kind === "miss" ? <span className="av">✆</span>
                      : n.kind === "seen" ? <span className="av">✓✓</span>
                      : <span className="av" style={css({ "--avc": n.colour })}>{n.avatar}</span>}
                    <span className="tx">
                      <b>{n.name}</b>
                      {n.kind === "voice" && (
                        <span className="wave">{[5, 9, 13, 7, 11, 14, 8, 5, 10, 12, 6, 9].map((h, k) => <i key={k} style={{ height: h }} />)}</span>
                      )}
                      {n.text}
                    </span>
                    {n.badge ? <span className="badge">{n.badge}</span> : n.time ? <time>{n.time}</time> : null}
                  </div>
                ))}
              </div>
              <div className="hub panel px" data-g="hub" style={css({ "--c": "var(--lamp)" })}>
                <div className="brand">{site.wordmark}</div>
                <div className="roles4">
                  <span style={css({ "--c": "var(--org)" })}>Organisers</span>
                  <span style={css({ "--c": "var(--ven)" })}>Vendors</span>
                  <span style={css({ "--c": "var(--fre)" })}>Freelancers</span>
                  <span style={css({ "--c": "var(--att)" })}>Attendees</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* who's in the show */}
        <section className="stop" id="audience" data-stop="audience" aria-labelledby="aud-title">
          <div className="wrap lit">
            <div data-pool>
              <h2 className="px" id="aud-title">{audience.heading}</h2>
              <p className="sub px">{audience.subheading}</p>
            </div>
            <div className="roles">
              {audience.cards.map((c) => (
                <button key={c.label} className="panel px live" style={css({ "--c": TINT[c.role] })} data-go={go(c.stop)} type="button">
                  <p className="lab"><i className="led" />{c.label}</p>
                  <b>{c.line}</b>
                  <em>{c.cta} →</em>
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* role stops: the section name is the big coloured title, with a screenshot screen and feature tabs */}
        {ROLES.map(({ id, content, tint }) => {
          const first = content.cards[0];
          return (
            <section key={id} className="stop role" id={id} data-stop={id} aria-labelledby={`${id}-title`}
              style={css({ "--c": TINT[tint], "--kf": FILL[tint], "--bf": FILL[tint] })}>
              <div className="info lit" data-pool>
                <p className="eyebrow px"><i className="led" />{content.theme}</p>
                <h2 className="rname px" id={`${id}-title`}>{content.name}</h2>
                <p className="tagline px">{content.heading}</p>
                <p className="sub px">{content.subheading}</p>
                <div className="screen shot px">
                  <div className="face">
                    <div className="imgs">
                      {/* plain img: the stage swaps these sources as the tabs change */}
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img className="a" alt="" src={first.img} srcSet={shotSet(first.img)} sizes={SHOT_SIZES} />
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img className="b" alt={`${first.title}: ${first.point}`} src={first.img} srcSet={shotSet(first.img)} sizes={SHOT_SIZES} />
                    </div>
                    <p className="cap" id={`${id}-cap`} role="tabpanel" aria-live="polite"><b>{first.title}</b><span>{first.point}</span></p>
                  </div>
                </div>
                <div className="tabs px live" role="tablist" aria-label={`${content.name} features`}>
                  {content.cards.map((c, i) => (
                    <button key={c.title} type="button" role="tab" aria-selected={i === 0} aria-controls={`${id}-cap`} tabIndex={i === 0 ? 0 : -1}
                      data-src={c.img} data-srcset={shotSet(c.img)} data-title={c.title} data-point={c.point}>
                      <i className="led" />{c.title}<span className="bar" />
                    </button>
                  ))}
                </div>
                <Link className="btn solid sm go px live" href={content.signup}>{content.signupLabel}<Chip>{ARROW}</Chip></Link>
              </div>
            </section>
          );
        })}
        <section className="stop" id="outro" data-stop="outro" aria-hidden="true" />

        {/* after the set: these scroll over the dimmed stage */}
        <div className="after">
          <section id="purpose" className="manifesto" data-pool aria-labelledby="purpose-title">
            <p className="kick px reveal" id="purpose-title"><i className="led" />{purpose.kicker}</p>
            <p className="statement px reveal">
              {purpose.statement.map((p, i) => ("role" in p && p.role
                ? <span key={i} style={css({ "--c": TINT[p.role] })}>{p.text}</span>
                : p.text))}
            </p>
            <p className="mission px reveal">{purpose.mission.lead}<b>{purpose.mission.who}</b>{purpose.mission.rest}</p>
            <div className="tri px reveal" aria-hidden="true">
              <i style={css({ "--c": "var(--org)" })} /><i style={css({ "--c": "var(--ven)" })} /><i style={css({ "--c": "var(--att)" })} />
            </div>
          </section>

          <section id="team" data-pool aria-labelledby="team-title">
            <h2 className="px reveal" id="team-title">{team.heading}</h2>
            <p className="sub px reveal">{team.subheading}</p>
            <div className="team">
              {team.cards.map((m, i) => (
                <div key={m.name} className="panel px reveal" style={css({ "--c": ["var(--org)", "var(--ven)", "var(--att)", "var(--fre)", "var(--ven)"][i % 5] })}>
                  <Image src={m.image} alt={m.name} width={320} height={320} sizes="(max-width: 900px) 70vw, 18vw" style={{ height: "auto" }} />
                  <b>{m.name}</b>
                  <p className="lab"><i className="led" />{m.title}</p>
                  <small>{m.hobby}</small>
                </div>
              ))}
            </div>
          </section>

          <section className="join" data-pool aria-labelledby="join-title">
            <h2 className="px reveal" id="join-title">{join.heading}</h2>
            <p className="sub px reveal">{join.subheading}</p>
            <div className="cta px reveal">
              {join.buttons.map((b) => (
                <Link key={b.href} className="btn solid" style={css({ "--bf": FILL[b.role] })} href={b.href}>{b.label}<Chip>{ARROW}</Chip></Link>
              ))}
            </div>
          </section>

          <footer className="panel px reveal" id="contact">
            <div>
              <div className="brand">{footer.brand}</div>
              <p style={{ color: "var(--ink-soft)", marginTop: 6 }}>{footer.tagline}</p>
            </div>
            <div>
              <h3>{footer.explore.title}</h3>
              {footer.explore.links.map((l) => ("stop" in l && l.stop
                ? <a key={l.label} href={`#${l.stop}`} data-go={go(l.stop)}>{l.label}</a>
                : <a key={l.label} href={"href" in l ? l.href : "#main"}>{l.label}</a>))}
              <button className="linkish" type="button" data-open="privacy">{footer.privacyLabel}</button>
            </div>
            <div>
              <h3>{footer.contact.title}</h3>
              <a href={`mailto:${site.contactEmail}`}>{site.contactEmail}</a>
              <a href={footer.contact.instagram} rel="noopener">Instagram</a>
              <a href={footer.contact.tiktok} rel="noopener">TikTok</a>
            </div>
            <p className="credit">{footer.credit}</p>
          </footer>
        </div>
      </main>

      <dialog className="panel" id="privacy" aria-labelledby="privacy-title">
        <h2 id="privacy-title">{privacy.heading}</h2>
        {privacy.paragraphs.map((p, i) => <p key={i}>{p.replace("{email}", site.contactEmail)}</p>)}
        <form method="dialog">
          <button className="btn solid sm">Close<Chip><path d="M4.5 4.5l7 7M11.5 4.5l-7 7" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></Chip></button>
        </form>
      </dialog>

      <nav className="rail" aria-label="Show stops" />
      <div className="prog" aria-hidden="true"><i /></div>

      <div className="deck" role="group" aria-label="Music">
        <button className="ic pause" type="button" aria-pressed="false" aria-label="Pause the show" />
        <button className="sw" type="button" role="switch" aria-checked="false" aria-label="Sound">
          <svg className="spk" viewBox="0 0 16 16" aria-hidden="true" />
          <span className="track" aria-hidden="true" />
          <span className="state" aria-hidden="true">Off</span>
        </button>
        <input className="vol" type="range" min={0} max={100} step={1} defaultValue={50} aria-label="Volume" title="Volume 50%" />
        <div className="now" aria-live="polite"><span className="t" /><small className="a" /></div>
      </div>
    </div>
  );
}
