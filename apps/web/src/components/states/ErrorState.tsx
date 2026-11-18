"use client";

import styles from "./States.module.css";
import { STATE_TEXT } from "./text";

type ErrorStateProps = {
  title?: string;
  description?: string;
  retryLabel?: string;
  // the "Try again" button only appears when this is given; error.tsx files pass Next's retry()
  onRetry?: () => void;
  // code that matches the server log (error.digest). Safe to show, unlike the error message.
  reference?: string;
  // 1 when the error replaces a whole page, 2 or 3 when it sits inside one
  headingLevel?: 1 | 2 | 3;
};

export default function ErrorState({
  title = STATE_TEXT.errorTitle,
  description = STATE_TEXT.errorDescription,
  retryLabel = STATE_TEXT.retry,
  onRetry,
  reference,
  headingLevel = 2,
}: ErrorStateProps) {
  const Heading = `h${headingLevel}` as const;

  return (
    <div className={styles.panel} role="alert">
      <Heading className={styles.title}>{title}</Heading>
      <p className={styles.description}>{description}</p>
      {onRetry && (
        <button type="button" className={styles.action} onClick={onRetry}>
          {retryLabel}
        </button>
      )}
      {reference && (
        <p className={styles.reference}>
          {STATE_TEXT.errorReference}: <code>{reference}</code>
        </p>
      )}
    </div>
  );
}

// error.tsx receives whatever was thrown. Errors from the server carry a `digest`; anything else may not be an Error at all.
export function errorReference(error: unknown): string | undefined {
  if (error instanceof Error && "digest" in error && typeof error.digest === "string") {
    return error.digest;
  }
  return undefined;
}
