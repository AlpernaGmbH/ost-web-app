import { existsSync } from "node:fs";
import { expect, test } from "@playwright/test";

// Smoke tests for everything that works without a Supabase backend (see playwright.config.ts).
// Logged-in flows need a real Supabase project and are covered by the manual checklist in the README.

test.describe("landing page (logged out)", () => {
  test("is served at / without a redirect and links to the login", async ({ page }) => {
    const errors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") errors.push(msg.text());
    });
    page.on("pageerror", (err) => errors.push(err.message));
    await page.goto("/");
    await expect(page).toHaveURL(/\/$/);
    await expect(page.getByRole("heading", { level: 1, name: "Üben, bis es sitzt." })).toBeVisible();
    await expect(page.getByRole("link", { name: "Anmelden" }).first()).toHaveAttribute("href", "/login");
    await expect(page.getByRole("link", { name: "Zugang anfragen" }).first()).toHaveAttribute("href", /^mailto:/);
    await expect(page.getByText("Aktuell geschlossene Beta")).toBeVisible();
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
    // heading order: one h1, then only h2/h3 below it
    const levels = await page.locator("h1, h2, h3").evaluateAll((els) => els.map((e) => Number(e.tagName[1])));
    expect(levels[0]).toBe(1);
    expect(levels.filter((l) => l === 1)).toHaveLength(1);
    for (let i = 1; i < levels.length; i++) expect(levels[i] - levels[i - 1]).toBeLessThanOrEqual(1);
    await page.screenshot({ path: "test-results/landing-mobile.png", fullPage: true });
    expect(errors).toEqual([]);
  });

  for (const width of [375, 768, 1280]) {
    test(`has no horizontal scroll at ${width} px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.goto("/");
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      expect(overflow).toBeLessThanOrEqual(0);
    });
  }

  test("FAQ accordion opens with the keyboard and reveals the answer", async ({ page }) => {
    await page.goto("/");
    const first = page.locator("details").first();
    const summary = first.locator("summary");
    await summary.focus();
    await expect(summary).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(first).toHaveAttribute("open", "");
    await expect(first.locator("p")).toBeVisible();
    await page.keyboard.press("Enter");
    await expect(first).not.toHaveAttribute("open", "");
  });

  test("robots.txt is public and forbids indexing", async ({ request }) => {
    const response = await request.get("/robots.txt", { maxRedirects: 0 });
    expect(response.status()).toBe(200);
    expect(await response.text()).toMatch(/Disallow: \//);
  });

  test("sections stay visible with reduced motion and without the observer", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/");
    const hidden = await page.locator("[data-reveal]").evaluateAll((els) => els.filter((e) => getComputedStyle(e).opacity !== "1").length);
    expect(hidden).toBe(0);
  });

  test("legal pages are public and render their headings", async ({ page }) => {
    for (const [path, heading] of [
      ["/impressum", "Impressum"],
      ["/datenschutz", "Datenschutzerklärung"],
    ] as const) {
      const response = await page.goto(path);
      expect(response?.status()).toBe(200);
      await expect(page).toHaveURL(new RegExp(`${path}$`));
      await expect(page.getByRole("heading", { level: 1, name: heading })).toBeVisible();
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      expect(overflow).toBeLessThanOrEqual(0);
    }
    await page.goto("/willkommen");
    await expect(page).toHaveURL(/\/willkommen$/);
  });
});

test.describe("access control", () => {
  for (const path of ["/faecher", "/settings", "/ueben", "/aufgaben", "/aufgaben?view=board&done=1", "/aufgaben?view=calendar&m=2026-10&d=2026-10-08", "/aufgaben/neu?d=2026-10-08", "/aufgaben/00000000-0000-0000-0000-000000000000", "/stundenplan", "/stundenplan?view=week&w=2026-10-05", "/stundenplan?view=month&m=2026-10&d=2026-10-08", "/m/00000000-0000-0000-0000-000000000000", "/m/00000000-0000-0000-0000-000000000000?tab=uebungen", "/m/00000000-0000-0000-0000-000000000000/ex/new", "/m/00000000-0000-0000-0000-000000000000/ex/drafts", "/m/00000000-0000-0000-0000-000000000000/ex/00000000-0000-0000-0000-000000000000", "/m/00000000-0000-0000-0000-000000000000/ex/00000000-0000-0000-0000-000000000000/edit", "/d/00000000-0000-0000-0000-000000000000", "/m/00000000-0000-0000-0000-000000000000/vocab/00000000-0000-0000-0000-000000000000", "/m/00000000-0000-0000-0000-000000000000/vocab/00000000-0000-0000-0000-000000000000/study?mode=write"]) {
    test(`${path} redirects logged-out visitors to /login`, async ({ page }) => {
      await page.goto(path);
      await expect(page).toHaveURL(/\/login$/);
    });
  }

  test("cron endpoint rejects missing and wrong secrets", async ({ request }) => {
    expect((await request.get("/api/cron/ical")).status()).toBe(401);
    expect((await request.get("/api/cron/ical", { headers: { authorization: "Bearer wrong" } })).status()).toBe(401);
  });

  test("import endpoint rejects missing and wrong secrets and is not redirected to /login", async ({ request }) => {
    const url = "/api/import/exercises";
    expect((await request.post(url, { data: "{}", maxRedirects: 0 })).status()).toBe(401);
    expect((await request.post(url, { data: "{}", headers: { authorization: "Bearer wrong" }, maxRedirects: 0 })).status()).toBe(401);
  });

  test("pages that read the session are never prerendered", () => {
    // A prerendered page would be served to everyone and skip the session check.
    for (const html of ["index", "settings"]) {
      expect(existsSync(`.next/server/app/${html}.html`), `${html}.html must not exist`).toBe(false);
    }
  });
});

test.describe("login page (mobile)", () => {
  test("renders a usable form without horizontal scroll", async ({ page }) => {
    await page.goto("/login");
    await expect(page.getByRole("heading", { name: "Pensum" })).toBeVisible();
    await expect(page.getByLabel("E-Mail")).toBeVisible();
    await expect(page.getByLabel("Passwort")).toBeVisible();
    await expect(page.getByRole("button", { name: "Anmelden" })).toBeVisible();

    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow).toBeLessThanOrEqual(0);

    // touch targets: at least 44px high
    const height = await page.getByRole("button", { name: "Anmelden" }).evaluate((el) => el.getBoundingClientRect().height);
    expect(height).toBeGreaterThanOrEqual(44);
    await page.screenshot({ path: "test-results/login-mobile.png" });
  });

  test("shows a generic error for wrong credentials", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("E-Mail").fill("nobody@example.org");
    await page.getByLabel("Passwort").fill("wrong-password");
    await page.getByRole("button", { name: "Anmelden" }).click();
    // The dummy Supabase URL is unreachable, so the sign-in fails; the user must see an error, not a crash.
    await expect(page.getByRole("status")).toBeVisible();
    await expect(page).toHaveURL(/\/login$/);
  });
});

test.describe("theme", () => {
  // page color of the two themes (surface-100); the stored choice beats the system setting, no choice follows it
  const LIGHT = "rgb(243, 246, 246)";
  const DARK = "rgb(15, 26, 31)";
  const cases: [string, "light" | "dark", string | null, string][] = [
    ["follows a light system", "light", null, LIGHT],
    ["follows a dark system", "dark", null, DARK],
    ["forced dark beats a light system", "light", "dark", DARK],
    ["forced light beats a dark system", "dark", "light", LIGHT],
  ];
  for (const [name, system, stored, expected] of cases) {
    test(name, async ({ page }) => {
      await page.emulateMedia({ colorScheme: system });
      if (stored) await page.addInitScript((value) => window.localStorage.setItem("pn-theme", value), stored);
      await page.goto("/login");
      await expect(page.getByRole("heading", { name: "Pensum" })).toBeVisible();
      const background = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
      expect(background).toBe(expected);
      expect(await page.evaluate(() => document.documentElement.getAttribute("data-theme"))).toBe(stored);
    });
  }
});

test.describe("PWA", () => {
  test("manifest is valid and its icons exist", async ({ request }) => {
    const response = await request.get("/manifest.webmanifest");
    expect(response.ok()).toBe(true);
    const manifest = await response.json();
    expect(manifest).toMatchObject({ display: "standalone", start_url: "/", lang: "de-CH" });
    const sizes = manifest.icons.map((i: { sizes: string; purpose: string }) => `${i.sizes}:${i.purpose}`);
    expect(sizes).toEqual(expect.arrayContaining(["192x192:any", "512x512:any", "512x512:maskable"]));
    for (const icon of manifest.icons) {
      const res = await request.get(icon.src);
      expect(res.status(), icon.src).toBe(200);
      expect(res.headers()["content-type"]).toContain("image/png");
    }
  });

  test("login page links the manifest and an apple touch icon", async ({ page }) => {
    await page.goto("/login");
    await expect(page.locator('link[rel="manifest"]')).toHaveAttribute("href", /manifest\.webmanifest/);
    await expect(page.locator('link[rel="apple-touch-icon"]')).toHaveCount(1);
    await expect(page.locator('meta[name="apple-mobile-web-app-capable"], meta[name="mobile-web-app-capable"]').first()).toHaveAttribute("content", "yes");
  });
});
