import { NextResponse } from "next/server";
import { CONTACT_EMAIL, WHATSAPP_REQUEST_TEXT } from "@/lib/site";
import { whatsappLink, whatsappNumber } from "@/lib/whatsapp";

// Read the environment on every request, never at build time.
export const dynamic = "force-dynamic";

/**
 * Target of "Zugang anfragen" on the landing page: sends the visitor to a WhatsApp chat with the founder.
 * The number comes from WHATSAPP_NUMBER only, so it is in no page and not in this public repository.
 */
export function GET() {
  const number = whatsappNumber();
  if (!number) {
    return new NextResponse(`Zugangsanfragen per WhatsApp sind im Moment nicht möglich. Schreib an ${CONTACT_EMAIL}.`, {
      status: 503,
      headers: { "content-type": "text/plain; charset=utf-8" },
    });
  }
  return NextResponse.redirect(whatsappLink(number, WHATSAPP_REQUEST_TEXT), 302);
}
