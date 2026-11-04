import Link from "next/link";
import footer from "@/content/landing/footer.json";
import "./Footer.css";

export default function Footer() {
  return (
    <footer className="footer">
      <div className="footer-top">
        <div className="footer-brand">
          <h2>{footer.brand}</h2>
          <p>{footer.tagline}</p>
        </div>

        <div className="footer-columns">
          {footer.columns.map((col) => (
            <nav className="footer-col" key={col.title} aria-label={col.title}>
              <h4>{col.title}</h4>
              <ul>
                {col.links.map((link) => (
                  <li key={link.label}>
                    <Link href={link.href}>{link.label}</Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>
      </div>

      <div className="footer-bottom">
        <p>
          © {new Date().getFullYear()} {footer.brand}. All rights reserved.
        </p>
        <ul>
          {footer.legal.map((link) => (
            <li key={link.label}>
              <Link href={link.href}>{link.label}</Link>
            </li>
          ))}
        </ul>
      </div>
    </footer>
  );
}