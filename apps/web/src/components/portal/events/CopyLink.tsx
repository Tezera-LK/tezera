"use client";

import { useState } from "react";
import ui from "../ui.module.css";

// "Copy link" on O51: copies the event page's full address. The chip beside it shows the path;
// short tzra.lk links are US-C15-T4, not built yet.
export default function CopyLink({ path, label, copied }: { path: string; label: string; copied: string }) {
  const [done, setDone] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(new URL(path, window.location.origin).toString());
      setDone(true);
    } catch {
      // clipboard blocked (an insecure page or a denied permission): leave the button as it was
    }
  }

  return (
    <button type="button" className={`${ui.rowButton} ${ui.rowButtonWhite}`} onClick={copy} aria-live="polite">
      {done ? copied : label}
    </button>
  );
}
