import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const css = readFileSync("src/app/tokens.css", "utf8");

/** Text between the braces of the first rule that starts with `selector`, whitespace-normalised. */
function ruleBody(selector: string): string {
  const start = css.indexOf(selector);
  if (start < 0) throw new Error(`rule not found: ${selector}`);
  const open = css.indexOf("{", start);
  const close = css.indexOf("}", open);
  return css.slice(open + 1, close).replace(/\s+/g, " ").trim();
}

describe("tokens.css", () => {
  it("defines the dark values identically for 'system is dark' and 'dark forced'", () => {
    const system = ruleBody(':root:not([data-theme="light"])');
    const forced = ruleBody(':root[data-theme="dark"]');
    expect(system.length).toBeGreaterThan(500);
    expect(forced).toBe(system);
  });

  it("gives every light color token a dark counterpart", () => {
    const names = (body: string) => [...body.matchAll(/(--[a-z0-9-]+):/g)].map((m) => m[1]);
    const light = names(ruleBody(":root {")).filter((n) => !n.startsWith("--pn-"));
    const dark = new Set(names(ruleBody(':root[data-theme="dark"]')));
    const missing = light.filter((n) => !dark.has(n));
    expect(missing).toEqual([]);
  });
});
