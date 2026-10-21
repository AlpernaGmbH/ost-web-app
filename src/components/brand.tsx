import Link from "next/link";
import { PRODUCT_NAME } from "@/lib/site";

/** The toggle mark of the logo, drawn with the theme tokens so it follows light and dark mode. */
export function BrandMark({ className = "" }: { className?: string }) {
  return (
    <svg aria-hidden viewBox="0 0 48 24" className={className}>
      <rect width="48" height="24" rx="12" fill="var(--primary)" />
      <circle cx="33.5" cy="12" r="8" fill="var(--accent)" />
    </svg>
  );
}

/** Mark plus wordmark; a link to "/" when `href` is set (public pages), plain text otherwise. */
export function Brand({ href }: { href?: string }) {
  const inner = (
    <>
      <BrandMark className="h-6 w-12" />
      <span className="wordmark text-[28px]">{PRODUCT_NAME}</span>
    </>
  );
  const className = "inline-flex items-center gap-3";
  return href ? (
    <Link href={href} className={className}>
      {inner}
    </Link>
  ) : (
    <span className={className}>{inner}</span>
  );
}
