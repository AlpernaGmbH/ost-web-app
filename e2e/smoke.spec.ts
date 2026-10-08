import { existsSync } from "node:fs";
import { expect, test } from "@playwright/test";

// Smoke tests for everything that works without a Supabase backend (see playwright.config.ts).
// Logged-in flows need a real Supabase project and are covered by the manual checklist in the README.

test.describe("access control", () => {
  for (const path of ["/", "/settings", "/stundenplan", "/stundenplan?view=week&w=2026-10-05", "/stundenplan?view=month&m=2026-10&d=2026-10-08", "/m/00000000-0000-0000-0000-000000000000", "/m/00000000-0000-0000-0000-000000000000?tab=uebungen", "/m/00000000-0000-0000-0000-000000000000/ex/new", "/m/00000000-0000-0000-0000-000000000000/ex/00000000-0000-0000-0000-000000000000", "/m/00000000-0000-0000-0000-000000000000/ex/00000000-0000-0000-0000-000000000000/edit", "/d/00000000-0000-0000-0000-000000000000", "/m/00000000-0000-0000-0000-000000000000/vocab/00000000-0000-0000-0000-000000000000", "/m/00000000-0000-0000-0000-000000000000/vocab/00000000-0000-0000-0000-000000000000/study?mode=write"]) {
    test(`${path} redirects logged-out visitors to /login`, async ({ page }) => {
      await page.goto(path);
      await expect(page).toHaveURL(/\/login$/);
    });
  }

  test("cron endpoint rejects missing and wrong secrets", async ({ request }) => {
    expect((await request.get("/api/cron/ical")).status()).toBe(401);
    expect((await request.get("/api/cron/ical", { headers: { authorization: "Bearer wrong" } })).status()).toBe(401);
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
    await expect(page.getByRole("heading", { name: "Lern-App" })).toBeVisible();
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
