export type IdentifierKind = "email" | "phone";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

//   "sanduni@example.com" -> { kind: "email", value: "sanduni@example.com" }
//   "077 123 4567"        -> { kind: "phone", value: "+94771234567" }
//   "hello"               -> null
export function parseIdentifier(raw: string): { kind: IdentifierKind; value: string } | null {
  const text = raw.trim(); // remove spaces at the start and end

  if (EMAIL_PATTERN.test(text)) {
    // Email addresses aren't case-sensitive, so store them in lower case.
    return { kind: "email", value: text.toLowerCase() };
  }

  // /[\s\-()]/g = any space, dash or bracket; "g" = everywhere, not just once.
  const digits = text.replace(/[\s\-()]/g, "");

  // Cognito needs phone numbers in E.164 format: "+" country code number.
  // Sri Lankan mobiles: 077 123 4567 -> +94771234567
  if (/^0\d{9}$/.test(digits)) return { kind: "phone", value: "+94" + digits.slice(1) };
  if (/^94\d{9}$/.test(digits)) return { kind: "phone", value: "+" + digits };
  // Already international, e.g. +94771234567 or +447700900123.
  if (/^\+\d{8,15}$/.test(digits)) return { kind: "phone", value: digits };

  return null;
}

export function checkPassword(password: string): string | null {
  if (password.length < 8) return "Use at least 8 characters.";
  if (!/[0-9]/.test(password)) return "Add at least one number.";
  if (!/[A-Z]/.test(password)) return "Add at least one capital letter.";
  if (!/[a-z]/.test(password)) return "Add at least one small letter.";
  if (!/[^A-Za-z0-9]/.test(password)) return "Add at least one symbol, like ! or #.";
  return null;
}