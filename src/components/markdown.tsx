import ReactMarkdown from "react-markdown";
import rehypeKatex from "rehype-katex";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";

/** Markdown with GitHub tables/task lists and KaTeX formulas ($inline$ and $$block$$). */
export function Markdown({ children }: { children: string }) {
  return (
    <div className="note-prose">
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[[rehypeKatex, { throwOnError: false, trust: false }]]}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}
