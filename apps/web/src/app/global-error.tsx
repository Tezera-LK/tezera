"use client";

import ErrorState, { errorReference } from "@/components/states/ErrorState";
import { STATE_TEXT } from "@/components/states/text";

// Last resort, shown when the root layout itself crashes. It replaces the whole page, so it brings its
// own <html> and <body>, and globals.css and the brand font aren't loaded: plain system styles only.
export default function GlobalError({ error, retry }: { error: unknown; retry: () => void }) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "grid",
          placeItems: "center",
          padding: 16,
          fontFamily: "system-ui, sans-serif",
        }}
      >
        <title>{STATE_TEXT.errorTitle}</title>
        <ErrorState headingLevel={1} onRetry={retry} reference={errorReference(error)} />
      </body>
    </html>
  );
}
