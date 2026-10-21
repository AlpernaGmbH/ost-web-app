// The founder's WhatsApp number is read from the environment only: the repository is public and the
// number must not appear in the code or on any page. It shows up solely in the wa.me link a visitor
// is redirected to after clicking "Zugang anfragen" (src/app/anfrage/route.ts).

/** Digits of WHATSAPP_NUMBER as wa.me expects them, or null when the variable is unset or not usable. */
export function whatsappNumber(): string | null {
  return normalizeWhatsappNumber(process.env.WHATSAPP_NUMBER);
}

/**
 * "+41 79 000 00 00", "0041790000000" and "41790000000" all become "41790000000". A number without a
 * country code (leading 0) or with an implausible length is rejected, so a typo cannot go live silently.
 */
export function normalizeWhatsappNumber(raw: string | null | undefined): string | null {
  if (!raw) return null;
  let digits = raw.replace(/[\s().-]/g, "");
  if (digits.startsWith("+")) digits = digits.slice(1);
  else if (digits.startsWith("00")) digits = digits.slice(2);
  return /^[1-9]\d{7,14}$/.test(digits) ? digits : null;
}

/** Chat link with a prefilled message (the visitor still has to press send). */
export function whatsappLink(digits: string, text: string): string {
  return `https://wa.me/${digits}?text=${encodeURIComponent(text)}`;
}
