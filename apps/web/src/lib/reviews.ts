// Things the review pages (O29–O31, O46–O49) and their actions share.

// the four scores a provider gets from an organiser (O30)
export const REVIEW_PARTS = ["Quality", "Punctuality", "Communication", "Value for money"];

// a reply to a review can be this long (O46)
export const REPLY_MAX = 500;

// why a review can be reported (O47): value, then what the admin sees
export const REPORT_REASONS: [string, string][] = [
  ["off-topic", "Not about this booking or event"],
  ["abusive", "Rude or abusive"],
  ["personal", "Contains personal details"],
  ["fake", "Fake or from a competitor"],
];
