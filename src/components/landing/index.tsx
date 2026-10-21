import { BookOpen, CalendarCheck, Check, ChevronDown, GraduationCap, LayoutDashboard, LockKeyhole, Mail, PenLine, ShieldCheck, Upload, UserRound, Workflow } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { Brand } from "@/components/brand";
import { buttonClass, Card } from "@/components/ui";
import { CONTACT_EMAIL, PRODUCT_NAME } from "@/lib/site";
import { COMPARISONS, CTA, FAQ, FAQ_TITLE, FOCUS, FOOTER, FOUNDER, HERO, HERO_PRICE_LINE, PRICE_BIG, PRICE_NOTE, priceNoteVisible, PRICING, PRIVACY, STEPS, STEPS_TITLE, TOUR, type TourId } from "./content";
import { DashboardScreen, DraftsScreen, ExerciseScreen, Laptop, Phone, ScheduleScreen, StepVisual, VocabScreen } from "./mockups";
import { RotatingComparison } from "./pricing";
import { RevealObserver } from "./reveal";

const container = "mx-auto w-full max-w-5xl px-4 sm:px-6";
const footerLink = "inline-flex min-h-11 items-center text-muted hover:text-foreground";
const mailto = `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(`Zugang zu ${PRODUCT_NAME}`)}`;

/** Founder details are shown only once the founder filled them in (never as a placeholder on the page). */
const given = (value: string) => (value.startsWith("[TODO") ? null : value);

const FOCUS_ICONS = [CalendarCheck, GraduationCap, Workflow] as const;

const TOUR_ICONS: Record<TourId, typeof PenLine> = { exercises: PenLine, vocab: BookOpen, material: Upload, dashboard: LayoutDashboard };

function TourMockup({ id, label }: { id: TourId; label: string }) {
  switch (id) {
    case "exercises":
      return (
        <Phone label={label}>
          <ExerciseScreen />
        </Phone>
      );
    case "vocab":
      return (
        <Phone label={label}>
          <VocabScreen />
        </Phone>
      );
    case "material":
      return (
        <Laptop label={label} className="max-w-md">
          <DraftsScreen />
        </Laptop>
      );
    case "dashboard":
      return (
        <Phone label={label}>
          <ScheduleScreen />
        </Phone>
      );
  }
}

function Section({ id, children, className = "" }: { id?: string; children: ReactNode; className?: string }) {
  return (
    <section id={id} className={`${container} py-14 md:py-24 ${className}`.trim()} data-reveal>
      {children}
    </section>
  );
}

/** Marketing page for logged-out visitors; the proxy serves it at "/" and the app at "/" once logged in. */
export function Landing() {
  return (
    <div className="flex min-h-dvh flex-col">
      <RevealObserver />
      <header className={`${container} flex items-center justify-between py-4`}>
        <Brand />
        <Link href="/login" className={buttonClass("secondary", "", "sm")}>
          {HERO.login}
        </Link>
      </header>

      <main className="flex-1">
        {/* hero */}
        <section className={`${container} pb-10 pt-10 md:pt-20`}>
          <div className="max-w-3xl">
            <p className="label text-primary-ink">{HERO.eyebrow}</p>
            <h1 className="display-lg mt-3 md:text-[56px] md:leading-[60px]">{HERO.title}</h1>
            <p className="body-lg mt-4 max-w-2xl text-muted">{HERO.lead}</p>
            <p className="small mt-3 font-bold text-primary-ink">{HERO_PRICE_LINE}</p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link href="/login" className={buttonClass("primary")}>
                {HERO.login}
              </Link>
              <a href={mailto} className={buttonClass("secondary")}>
                <Mail aria-hidden className="size-5" strokeWidth={2.25} />
                {HERO.request}
              </a>
            </div>
            <p className="small mt-4 text-muted">{HERO.access}</p>
          </div>
          <div className="relative mt-12 md:mt-16 md:pr-24">
            <Laptop label={HERO.mockupLabel}>
              <DashboardScreen />
            </Laptop>
            <Phone label="" className="hidden md:absolute md:-bottom-6 md:right-0 md:block md:w-[200px]">
              <ScheduleScreen />
            </Phone>
          </div>
        </section>

        {/* tour: one block per core feature, mockup side alternating */}
        {TOUR.map((item, i) => {
          const Icon = TOUR_ICONS[item.id];
          const flip = i % 2 === 1;
          return (
            <Section key={item.id} id={item.id}>
              <div className="grid items-center gap-10 md:grid-cols-2 md:gap-16">
                <div className={flip ? "md:order-2" : ""}>
                  <span className="flex size-12 items-center justify-center rounded-pill bg-primary-soft text-on-primary-soft">
                    <Icon aria-hidden className="size-6" strokeWidth={2.25} />
                  </span>
                  <h2 className="display-md mt-5">{item.title}</h2>
                  <p className="heading mt-3 text-primary-ink">{item.claim}</p>
                  <p className="body-lg mt-4 text-muted">{item.text}</p>
                </div>
                <div className={flip ? "md:order-1" : ""}>
                  <TourMockup id={item.id} label={item.mockupLabel} />
                </div>
              </div>
            </Section>
          );
        })}

        {/* why only the OST */}
        <Section id="ost">
          <h2 className="display-md">{FOCUS.title}</h2>
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {FOCUS.items.map((item, i) => {
              const Icon = FOCUS_ICONS[i];
              return (
                <Card key={item.title}>
                  <span className="flex size-12 items-center justify-center rounded-pill bg-primary-soft text-on-primary-soft">
                    <Icon aria-hidden className="size-6" strokeWidth={2.25} />
                  </span>
                  <h3 className="heading mt-4">{item.title}</h3>
                  <p className="mt-2 text-muted">{item.text}</p>
                </Card>
              );
            })}
          </div>
        </Section>

        {/* founder */}
        <Section id="gruender">
          <h2 className="display-md">{FOUNDER.title}</h2>
          <div className="mt-8 grid items-start gap-8 md:grid-cols-[200px_1fr] md:gap-12">
            {/* photo placeholder: no image yet, nothing invented */}
            <div className="flex aspect-square w-40 items-center justify-center rounded-card border border-border bg-sunken text-muted md:w-full" aria-hidden>
              <span className="flex flex-col items-center gap-2 text-sm">
                <UserRound className="size-10" strokeWidth={1.75} />
                {FOUNDER.photoLabel}
              </span>
            </div>
            <div>
              {given(FOUNDER.name) ? <p className="heading">{given(FOUNDER.name)}</p> : null}
              {given(FOUNDER.semester) ? <p className="small text-muted">{given(FOUNDER.semester)}</p> : null}
              {FOUNDER.paragraphs.map((text) => (
                <p key={text} className="body-lg mt-4 text-muted first:mt-0">
                  {text}
                </p>
              ))}
              {given(FOUNDER.quote) ? <blockquote className="heading mt-6 border-l-4 border-primary pl-4 text-primary-ink">{given(FOUNDER.quote)}</blockquote> : null}
              <p className="small mt-6 text-muted">{FOUNDER.note}</p>
            </div>
          </div>
        </Section>

        {/* three steps */}
        <Section>
          <h2 className="display-md">{STEPS_TITLE}</h2>
          <ol className="mt-8 grid gap-8 md:grid-cols-3">
            {STEPS.map((step, i) => (
              <li key={step.title}>
                <StepVisual step={(i + 1) as 1 | 2 | 3} />
                <div className="mt-4 flex gap-3">
                  <span className="score flex size-10 shrink-0 items-center justify-center rounded-pill bg-primary text-[18px] text-primary-foreground">{i + 1}</span>
                  <div>
                    <h3 className="heading">{step.title}</h3>
                    <p className="mt-1 text-muted">{step.text}</p>
                  </div>
                </div>
              </li>
            ))}
          </ol>
        </Section>

        {/* price: one card, the comparison rotates in the heading */}
        <Section id="preis">
          <p className="label text-primary-ink">{PRICING.eyebrow}</p>
          <RotatingComparison lines={COMPARISONS.map((c) => c.line)} className="display-md mt-3 max-w-3xl" />
          <Card className="mx-auto mt-10 max-w-md">
            <p className="display-lg">{PRICE_BIG}</p>
            <p className="mt-1 text-muted">{PRICING.perMonth}</p>
            <ul className="mt-6 space-y-2">
              {PRICING.features.map((feature) => (
                <li key={feature} className="flex gap-3">
                  <Check aria-hidden className="mt-0.5 size-5 shrink-0 text-primary-ink" strokeWidth={2.5} />
                  <span>{feature}</span>
                </li>
              ))}
            </ul>
            {priceNoteVisible ? <p className="small mt-4 text-muted">{PRICE_NOTE}</p> : null}
            <a href={mailto} className={buttonClass("primary", "mt-6 w-full")}>
              <Mail aria-hidden className="size-5" strokeWidth={2.25} />
              {PRICING.button}
            </a>
          </Card>
        </Section>

        {/* privacy and control */}
        <Section>
          <div className="flex items-center gap-3">
            <span className="flex size-12 items-center justify-center rounded-pill bg-primary-soft text-on-primary-soft">
              <ShieldCheck aria-hidden className="size-6" strokeWidth={2.25} />
            </span>
            <h2 className="display-md">{PRIVACY.title}</h2>
          </div>
          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            {PRIVACY.items.map((item) => (
              <Card key={item.title}>
                <h3 className="heading">{item.title}</h3>
                <p className="mt-2 text-muted">{item.text}</p>
              </Card>
            ))}
          </div>
          <p className="mt-6">
            <Link href="/datenschutz" className="font-bold text-primary-ink underline-offset-4 hover:underline">
              {PRIVACY.link} →
            </Link>
          </p>
        </Section>

        {/* FAQ: native details/summary, so keyboard and screen readers work without any script */}
        <Section>
          <h2 className="display-md">{FAQ_TITLE}</h2>
          <div className="mt-8 space-y-3">
            {FAQ.map((item) => (
              <details key={item.q} className="group rounded-card border border-border bg-card">
                <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 px-5 py-3 [&::-webkit-details-marker]:hidden">
                  <h3 className="heading text-[18px] leading-6">{item.q}</h3>
                  <ChevronDown aria-hidden className="size-5 shrink-0 text-muted transition-transform duration-200 group-open:rotate-180" strokeWidth={2.25} />
                </summary>
                <p className="px-5 pb-5 text-muted">{item.a}</p>
              </details>
            ))}
          </div>
        </Section>

        {/* closing call to action */}
        <Section className="pt-0 md:pt-0">
          <Card className="flex flex-col gap-5 sm:flex-row sm:items-center">
            <span className="flex size-12 shrink-0 items-center justify-center rounded-pill bg-accent-soft text-on-accent-soft">
              <LockKeyhole aria-hidden className="size-6" strokeWidth={2.25} />
            </span>
            <div className="min-w-0 flex-1">
              <h2 className="heading">{CTA.title}</h2>
              <p className="mt-1 text-muted">{CTA.text}</p>
              <p className="small mt-2 text-muted">{CTA.comparison}</p>
            </div>
            <a href={mailto} className={buttonClass("primary", "shrink-0")}>
              <Mail aria-hidden className="size-5" strokeWidth={2.25} />
              {CTA.button}
            </a>
          </Card>
        </Section>
      </main>

      <footer className="border-t border-border">
        <div className={`${container} flex flex-col gap-2 py-6 text-sm sm:flex-row sm:items-center sm:justify-between`}>
          <span className="text-muted">
            &copy; {new Date().getFullYear()} {PRODUCT_NAME}
            <span className="mt-1 block max-w-md">{FOOTER.note}</span>
          </span>
          <nav aria-label="Rechtliches" className="flex gap-6">
            <Link href="/impressum" className={footerLink}>
              {FOOTER.imprint}
            </Link>
            <Link href="/datenschutz" className={footerLink}>
              {FOOTER.privacy}
            </Link>
            <Link href="/login" className={footerLink}>
              {FOOTER.login}
            </Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}
