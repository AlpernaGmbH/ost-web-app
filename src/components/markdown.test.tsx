import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, test } from "vitest";
import { Markdown } from "./markdown";

const require = createRequire(import.meta.url);

describe("Markdown formulas", () => {
  test("the KaTeX stylesheet matches the KaTeX version that renders the markup", () => {
    // rehype-katex renders with its own `katex`; a second, newer copy at the top level (whose CSS the layout imports)
    // renames classes (`inner` -> `katex-inner`) and silently breaks `\ne`, `\not` and line breaking in inline formulas.
    const css = readFileSync(require.resolve("katex/dist/katex.min.css"), "utf8");
    const html = renderToStaticMarkup(<Markdown>{"Es gilt $a \\ne n$."}</Markdown>);
    const inner = /\.rlap>\.([\w-]+)/.exec(css)?.[1];
    expect(inner).toBeTruthy();
    expect(html).toContain(`class="${inner}"`);
  });

  test("renders figures from /figures", () => {
    const html = renderToStaticMarkup(<Markdown>{"![Parabel](/figures/wms-s1/u4-parabeln-1.svg)"}</Markdown>);
    expect(html).toContain('src="/figures/wms-s1/u4-parabeln-1.svg"');
    expect(html).toContain('alt="Parabel"');
  });

  test("renders inline and display math", () => {
    const html = renderToStaticMarkup(<Markdown>{"Inline $x^2$.\n\n$$\n\\dfrac{a}{b}\n$$\n"}</Markdown>);
    expect(html).toContain("katex-display");
    expect(html).toContain("katex");
  });
});
