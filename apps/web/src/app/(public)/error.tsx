"use client";

import { useEffect } from "react";
import ErrorState, { errorReference } from "@/components/states/ErrorState";

// Catches anything that throws while a public page renders. The header stays on screen.
export default function PublicError({ error, retry }: { error: unknown; retry: () => void }) {
  useEffect(() => {
    // shows up in the browser console; swap for an error-reporting service once the team picks one
    console.error(error);
  }, [error]);

  return <ErrorState headingLevel={1} onRetry={retry} reference={errorReference(error)} />;
}
