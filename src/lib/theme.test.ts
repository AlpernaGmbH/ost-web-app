// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { applyPref, parsePref, readPref, savePref, THEME_INIT_SCRIPT, THEME_KEY } from "./theme";

beforeEach(() => {
  window.localStorage.clear();
  document.documentElement.removeAttribute("data-theme");
  document.head.innerHTML = '<meta name="theme-color" media="(prefers-color-scheme: light)" content="#f3f6f6"><meta name="theme-color" media="(prefers-color-scheme: dark)" content="#0f1a1f">';
});
afterEach(() => {
  document.head.innerHTML = "";
});

describe("parsePref", () => {
  it("accepts light and dark, everything else means system", () => {
    expect(parsePref("light")).toBe("light");
    expect(parsePref("dark")).toBe("dark");
    expect(parsePref("system")).toBe("system");
    expect(parsePref("purple")).toBe("system");
    expect(parsePref(null)).toBe("system");
    expect(parsePref(undefined)).toBe("system");
  });
});

describe("savePref and readPref", () => {
  it("stores a forced theme and applies it to <html>", () => {
    savePref("dark");
    expect(window.localStorage.getItem(THEME_KEY)).toBe("dark");
    expect(document.documentElement.getAttribute("data-theme")).toBe("dark");
    expect(readPref()).toBe("dark");
  });

  it("system removes the stored value and the attribute again", () => {
    savePref("light");
    savePref("system");
    expect(window.localStorage.getItem(THEME_KEY)).toBeNull();
    expect(document.documentElement.hasAttribute("data-theme")).toBe(false);
    expect(readPref()).toBe("system");
  });
});

describe("applyPref and the browser bar color", () => {
  it("restores the original theme-color values when going back to system", () => {
    const metas = () => [...document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]')].map((m) => m.content);
    const before = metas();
    // jsdom has no stylesheet, so the page color is unknown: the metas must stay untouched instead of becoming empty
    applyPref("dark");
    expect(metas()).toEqual(before);
    applyPref("system");
    expect(metas()).toEqual(before);
  });
});

describe("THEME_INIT_SCRIPT", () => {
  const run = () => new Function(THEME_INIT_SCRIPT)();

  it("applies a stored forced theme before React runs", () => {
    window.localStorage.setItem(THEME_KEY, "dark");
    run();
    expect(document.documentElement.getAttribute("data-theme")).toBe("dark");
  });

  it("ignores missing or unknown values", () => {
    run();
    expect(document.documentElement.hasAttribute("data-theme")).toBe(false);
    window.localStorage.setItem(THEME_KEY, "sepia");
    run();
    expect(document.documentElement.hasAttribute("data-theme")).toBe(false);
  });
});
