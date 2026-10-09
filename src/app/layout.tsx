import type { Metadata, Viewport } from "next";
import "@fontsource-variable/bricolage-grotesque/opsz.css";
import "@fontsource-variable/source-sans-3/index.css";
import "@fontsource-variable/jetbrains-mono/index.css";
import "katex/dist/katex.min.css";
import "./tokens.css";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Pensum", template: "%s · Pensum" },
  description: "Üben, bis es sitzt.",
  appleWebApp: { capable: true, title: "Pensum", statusBarStyle: "default" },
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  // browser bar follows the page color of the active theme (surface-100)
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f3f6f6" },
    { media: "(prefers-color-scheme: dark)", color: "#0f1a1f" },
  ],
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="de-CH" className="h-full antialiased">
      <body className="min-h-full">{children}</body>
    </html>
  );
}
