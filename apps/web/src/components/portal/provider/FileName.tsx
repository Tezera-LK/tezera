"use client";

import { useState } from "react";
import forms from "@/components/portal/forms.module.css";

type FileNameProps = {
  // the form field that carries the picked file's name
  name: string;
  accept: string;
  label: string;
};

// A file picker that sends only the file's NAME with the form, not the file. Nothing is stored
// until storage exists (EN-03), and server actions refuse bodies over 1 MB, which a phone photo
// passes easily. Phase B swaps this for a real upload.
export default function FileName({ name, accept, label }: FileNameProps) {
  const [picked, setPicked] = useState("");
  return (
    <>
      <input type="file" accept={accept} aria-label={label} className={forms.input} onChange={(event) => setPicked(event.target.files?.[0]?.name ?? "")} />
      <input type="hidden" name={name} value={picked} />
    </>
  );
}
