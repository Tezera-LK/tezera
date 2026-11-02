"use client"

import Link from "next/link"
import navLinks from "@/content/landing/navlinks.json";
import "./Navigation.css"

export default function Navigation() {
  return (
    <nav>
      <ul className="nav">
        {navLinks.map((link) => (
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
