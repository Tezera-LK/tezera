"use client";

import books from "./Bookings.module.css";

// Small pieces the payment pages (O60–O65) share.

// "Test payment, no real money" along the top of every payment page.
export function TestBanner() {
  return (
    <p className={books.testBanner}>
      <strong>Test payment, no real money</strong>
      <span>PayHere sandbox · nothing is charged</span>
    </p>
  );
}

// "Download PDF" on a receipt (O64): the browser's print dialog, where "Save as PDF" is one of
// the printers. A generated PDF can replace it once receipts are stored (EN-03).
export function PrintButton({ className, children }: { className: string; children: React.ReactNode }) {
  return (
    <button type="button" className={className} onClick={() => window.print()}>
      {children}
    </button>
  );
}
