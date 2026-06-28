"use client";

import Link from "next/link";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { wikilinksToMarkdown } from "@/lib/wikilinks";

/**
 * Renders wiki markdown. [[wikilinks]] are pre-rewritten to /wiki/<slug> links;
 * the custom anchor renderer styles links to non-existent pages as dashed stubs.
 */
export default function MarkdownView({
  content,
  existingSlugs,
}: {
  content: string;
  existingSlugs: string[];
}) {
  const known = new Set(existingSlugs);
  const md = wikilinksToMarkdown(content);

  return (
    <div className="prose-wiki">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          a({ href, children }) {
            const target = href ?? "";
            if (target.startsWith("/wiki/")) {
              const slug = target.slice("/wiki/".length);
              if (!known.has(slug)) {
                return (
                  <span className="wikilink-stub" title="This page doesn't exist yet">
                    {children}
                  </span>
                );
              }
              return <Link href={target}>{children}</Link>;
            }
            return (
              <a href={target} target="_blank" rel="noopener noreferrer">
                {children}
              </a>
            );
          },
        }}
      >
        {md}
      </ReactMarkdown>
    </div>
  );
}
