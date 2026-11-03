"use client"

import Link from "next/link"
import navLinks from "@/content/landing/navlinks.json";
import "./Navigation.css"

export default function Navigation() {
  return (
    <nav>
      <Link href="/" className="nav-logo" aria-label="Tezera home">
        <img src={navLinks.img} alt="" className="nav-icon" />
      </Link>
      <ul className="nav">
        {navLinks.links.map((link) => (
          <li key={link.name}>
            {link.href.includes('#') ? (
              <a href={link.href}>{link.name}</a>
            ) : (
              <Link href={link.href}>{link.name}</Link>
            )}
          </li>
        ))}
      </ul>
    </nav>
  )
}
