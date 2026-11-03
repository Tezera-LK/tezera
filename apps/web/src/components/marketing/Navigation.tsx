"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useLenis } from "lenis/react"
import navLinks from "@/content/landing/navlinks.json";
import "./Navigation.css"

export default function Navigation() {
  const lenis = useLenis();
  const pathname = usePathname();

  // already on the home page: scroll to the top ourselves instead of letting Link do nothing
  const goHome = (e: React.MouseEvent) => {
    if (pathname === "/" && lenis) {
      e.preventDefault();
      lenis.scrollTo(0);
    }
  };

  // same idea for in-page anchors like "/#team" or "#team"
  const goToAnchor = (e: React.MouseEvent, href: string) => {
    const id = href.slice(href.indexOf("#"));
    const target = document.querySelector<HTMLElement>(id);
    if (target && lenis) {
      e.preventDefault();
      lenis.scrollTo(target);
    }
  };

  return (
    <nav className="site-nav">
      <Link href={navLinks.home} className="nav-logo" aria-label="Tezera home" onClick={goHome}>
        <img src={navLinks.img} alt="" className="nav-icon" />
      </Link>
      <ul className="nav">
        {navLinks.links.map((link) => (
          <li key={link.name}>
            {link.href.includes('#') ? (
              <a href={link.href} onClick={(e) => goToAnchor(e, link.href)}>{link.name}</a>
            ) : (
              <Link href={link.href}>{link.name}</Link>
            )}
          </li>
        ))}
      </ul>
      <div className="nav-spacer" />
    </nav>
  )
}