import type { Metadata } from "next";
import { Landing } from "@/components/landing";
import { PRODUCT_NAME } from "@/lib/site";

// Served at "/" for logged-out visitors (see proxy.ts). Static: nothing here reads the session.
// robots stays noindex from the root layout while the beta is closed.
export const metadata: Metadata = {
  title: { absolute: `${PRODUCT_NAME}: Üben, bis es sitzt` },
  description: `${PRODUCT_NAME} bringt Stundenplan, Unterlagen, Aufgaben, Übungen und Wortschatz pro Fach an einen Ort.`,
};

export default function WelcomePage() {
  return <Landing />;
}
