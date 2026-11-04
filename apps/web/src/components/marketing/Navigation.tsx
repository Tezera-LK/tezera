"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useLenis } from "lenis/react"
import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react"
import navLinks from "@/content/landing/navlinks.json";
import { site } from "@/content";
import "./Navigation.css"

export default function Navigation() {
  const lenis = useLenis();
  const pathname = usePathname();
  // mobile menu open/closed
  const [open, setOpen] = useState(false);
  // page scrolled past the top: the bar gets a hairline and a blur
  const [scrolled, setScrolled] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);

  // only re-renders when the scrolled flag actually flips
  const onScroll = useCallback(({ scroll }: { scroll: number }) => setScrolled(scroll > 8), []);
  useLenis(onScroll);

  // closes the mobile menu, then runs the scroll once Lenis is running again
  const close = useCallback((then?: () => void) => {
    setOpen(false);
    lenis?.start();
    then?.();
  }, [lenis]);

  // already on the home page: scroll to the top ourselves instead of letting Link do nothing
  const goHome = (e: React.MouseEvent) => {
    if (pathname === "/" && lenis) {
      e.preventDefault();
      close(() => lenis.scrollTo(0));
    }
  };

  // same idea for in-page anchors like "/#team" or "#team"
  const goToAnchor = (e: React.MouseEvent, href: string) => {
    const id = href.slice(href.indexOf("#"));
    const target = document.querySelector<HTMLElement>(id);
    if (target && lenis) {
      e.preventDefault();
      close(() => lenis.scrollTo(target));
    }
  };

  // menu open: stop page scrolling, move focus in, keep Tab inside the menu, Esc closes
  useEffect(() => {
    if (!open) return;
    lenis?.stop();
    const menu = menuRef.current;
    const focusables = () => [
      toggleRef.current,
      ...Array.from(menu?.querySelectorAll<HTMLElement>("a") ?? []),
    ].filter(Boolean) as HTMLElement[];
    focusables()[1]?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        close();
        toggleRef.current?.focus();
        return;
      }
      if (e.key !== "Tab") return;
      const list = focusables();
      const first = list[0];
      const last = list[list.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, lenis, close]);

  // screen widened past the mobile breakpoint while the menu was open: close it
  useEffect(() => {
    const wide = window.matchMedia("(min-width: 1180px)");
    const onChange = () => wide.matches && close();
    wide.addEventListener("change", onChange);
    return () => wide.removeEventListener("change", onChange);
  }, [close]);

  const renderLink = (link: { name: string; href: string }, className?: string) =>
    link.href.includes("#") ? (
      <a href={link.href} className={className} onClick={(e) => goToAnchor(e, link.href)}>{link.name}</a>
    ) : (
      <Link href={link.href} className={className} onClick={() => close()}>{link.name}</Link>
    );

  return (
    <>
      <nav className={`site-nav${scrolled ? " is-scrolled" : ""}${open ? " is-open" : ""}`} aria-label="Main">
        <Link href={navLinks.home} className="nav-logo" aria-label="Tezera home" onClick={goHome}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={navLinks.img} alt="" className="nav-icon" />
          <span className="nav-wordmark" aria-hidden="true">{site.wordmark}</span>
        </Link>

        <ul className="nav">
          {navLinks.links.map((link) => (
            <li key={link.name}>{renderLink(link)}</li>
          ))}
        </ul>

        <div className="nav-end">
          <button
            ref={toggleRef}
            type="button"
            className="nav-toggle"
            aria-expanded={open}
            aria-controls="nav-menu"
            aria-label={open ? "Close menu" : "Open menu"}
            onClick={() => (open ? close() : setOpen(true))}
          >
            <span />
            <span />
          </button>
        </div>
      </nav>

      {/* mobile menu: full screen, links staggered in */}
      <div
        id="nav-menu"
        ref={menuRef}
        className={`nav-menu${open ? " is-open" : ""}`}
        aria-hidden={!open}
        inert={!open}
        data-lenis-prevent
      >
        <ul>
          {navLinks.links.map((link, i) => (
            <li key={link.name} style={{ "--i": i } as CSSProperties}>
              {renderLink(link, "nav-menu-link")}
            </li>
          ))}
        </ul>
      </div>
    </>
  )
}
