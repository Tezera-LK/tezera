// ─────────────────────────────────────────────────────────────
// VALIDATION HELPERS: checking what the user typed or chose
// File: src/lib/validation.ts
//
// Plain TypeScript functions, no React. Every form (any role) uses
// these, so the rules are the same everywhere and live in one place.
//
// These checks are for a FRIENDLY experience only. Cognito (and later
// our NestJS API) checks everything again on the server, so they can't
// be bypassed by changing the browser code.
// ─────────────────────────────────────────────────────────────

// ── EMAIL OR PHONE ───────────────────────────────────────────

// What kind of identifier the user typed.
export type IdentifierKind = "email" | "phone";

// A REGULAR EXPRESSION: some characters (no spaces or @), then "@",
// then more characters, a dot, and more characters. It catches typos
// like "sanduni.example.com". It can't prove the address exists:
// the verification code does that.
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Works out whether the text is an email or a phone number, and returns
// it in the format Cognito needs. Returns null if it's neither.
//
//   "Sanduni@Example.com" -> { kind: "email", value: "sanduni@example.com" }
//   "077 123 4567"        -> { kind: "phone", value: "+94771234567" }
//   "hello"               -> null
export function parseIdentifier(raw: string): { kind: IdentifierKind; value: string } | null {
  const text = raw.trim(); // remove spaces at the start and end

  if (EMAIL_PATTERN.test(text)) {
    // Email addresses aren't case-sensitive, so store them in lower case.
    return { kind: "email", value: text.toLowerCase() };
  }

  // For phone numbers, remove spaces, dashes and brackets first.
  // /[\s\-()]/g = any space, dash or bracket; "g" = everywhere, not just once.
  const digits = text.replace(/[\s\-()]/g, "");

  // Cognito needs phone numbers in E.164 format: "+", country code, number.
  if (/^0\d{9}$/.test(digits)) return { kind: "phone", value: "+94" + digits.slice(1) }; // 0771234567
  if (/^94\d{9}$/.test(digits)) return { kind: "phone", value: "+" + digits };          // 94771234567
  if (/^\+\d{8,15}$/.test(digits)) return { kind: "phone", value: digits };             // +94771234567, +44...

  return null;
}

// A quick GUESS while the user is still typing, so a form can change as
// they type: hide the password boxes as soon as it looks like a phone
// number. parseIdentifier() above is the real check when they submit.
//   "077 12"         -> "phone"  (only digits, spaces, +, - and brackets)
//   "sanduni@"       -> "email"  (has an @ or a letter)
//   ""               -> null     (nothing typed yet)
export function guessIdentifierKind(raw: string): IdentifierKind | null {
  const text = raw.trim();
  if (text === "") return null;
  if (/^[+\d][\d\s\-()]*$/.test(text)) return "phone";
  return "email";
}

// A simple email check on its own (e.g. "Contact email" on a profile).
export function isEmail(text: string): boolean {
  return EMAIL_PATTERN.test(text.trim());
}

// ── PASSWORD ─────────────────────────────────────────────────

// These rules must match the Cognito user pool's password policy.
// Cognito's default: at least 8 characters with a number, a capital
// letter, a small letter and a symbol.
// Returns an error message, or null if the password is fine.
// Each line stops at the first rule that's broken.
export function checkPassword(password: string): string | null {
  if (password.length < 8) return "Use at least 8 characters.";
  if (!/[0-9]/.test(password)) return "Add at least one number.";
  if (!/[A-Z]/.test(password)) return "Add at least one capital letter.";
  if (!/[a-z]/.test(password)) return "Add at least one small letter.";
  // [^A-Za-z0-9] = any character that is NOT a letter or a digit, i.e. a symbol.
  if (!/[^A-Za-z0-9]/.test(password)) return "Add at least one symbol, like ! or #.";
  return null;
}

// ── AGE (PRD AC-01) ──────────────────────────────────────────
// Accounts are for people aged 16 or over (proposed). 16 and 17 year
// olds confirm that a parent or guardian agreed. Same for every role.
export const MIN_AGE = 16;
export const ADULT_AGE = 18;

// Age in whole years from a date of birth.
// dob comes from <input type="date">, which always gives "YYYY-MM-DD".
// Returns null if the date is missing, invalid or in the future.
//   getAge("2008-11-20") on 2 Nov 2026 -> 17 (birthday not reached yet)
export function getAge(dob: string, today: Date = new Date()): number | null {
  // "2008-11-20" -> [2008, 11, 20]. .map(Number) turns text into numbers.
  const [year, month, day] = dob.split("-").map(Number);
  if (!year || !month || !day) return null;

  let age = today.getFullYear() - year;

  // Take one off if this year's birthday hasn't happened yet.
  // getMonth() counts from 0 (January = 0), so add 1.
  const monthNow = today.getMonth() + 1;
  const dayNow = today.getDate();
  if (monthNow < month || (monthNow === month && dayNow < day)) {
    age = age - 1;
  }

  // Negative = a date in the future.
  return age >= 0 ? age : null;
}

// ── UPLOADED FILES (logo, verification documents) ────────────

// Biggest file we accept, in megabytes (proposed).
export const MAX_FILE_MB = 10;

// Checks one chosen file. "accepted" is a list of MIME types, the
// standard names for file kinds, e.g. "application/pdf" or "image/png".
// Returns an error message, or null if the file is fine.
export function checkFile(file: File, accepted: string[]): string | null {
  if (!accepted.includes(file.type)) {
    return `${file.name}: this kind of file isn't accepted.`;
  }
  // file.size is in bytes. 1 MB = 1024 x 1024 bytes.
  if (file.size > MAX_FILE_MB * 1024 * 1024) {
    return `${file.name} is over ${MAX_FILE_MB} MB.`;
  }
  return null;
}

// Turns a size in bytes into something readable, e.g. 1258291 -> "1.2 MB".
export function formatFileSize(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  // toFixed(1) = one number after the decimal point.
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
