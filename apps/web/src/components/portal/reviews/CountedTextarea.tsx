"use client";

import { useState } from "react";
import forms from "../forms.module.css";

// A textarea with "108 of 500 characters" under it, counting as the organiser types (O46).
export default function CountedTextarea({
  name,
  max,
  label,
  className,
  placeholder,
}: {
  name: string;
  max: number;
  label: string;
  className?: string;
  placeholder?: string;
}) {
  const [text, setText] = useState("");
  return (
    <label className={forms.field}>
      <span className={forms.label}>{label}</span>
      <textarea
        name={name}
        rows={3}
        maxLength={max}
        required
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={placeholder}
        className={`${forms.input} ${className ?? ""}`}
      />
      <span className={forms.hint} aria-live="polite">{`${text.length} of ${max} characters`}</span>
    </label>
  );
}
