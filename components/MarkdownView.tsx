"use client";

import Link from "next/link";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { wikilinksToMarkdown } from "@/lib/wikilinks";

/**
 * Renders wiki markdown. [[wikilinks]] are pre-rewritten to `<basePath>/<slug>`
 * links (basePath carries the wiki scope, e.g. `/w/<id>/wiki`); the custom anchor
 * renderer styles links to non-existent pages as dashed stubs.
 */
export default function MarkdownView({
  content,
  existingSlugs,
  basePath,
}: {
  content: string;
  existingSlugs: string[];
  basePath: string;
}) {
  const known = new Set(existingSlugs);
  const md = wikilinksToMarkdown(content, basePath);
  const prefix = `${basePath}/`;

  return (
    <div className="prose-wiki">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          a({ href, children }) {
            const target = href ?? "";
            if (target.startsWith(prefix)) {
              const slug = target.slice(prefix.length);
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
