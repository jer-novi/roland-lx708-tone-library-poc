import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeSlug from "rehype-slug";

/** Rendert een markdown-document (uit frontend/content/) met heading-anchors. */
export function MarkdownDoc({ markdown }: { markdown: string }) {
  return (
    <article className="markdown-doc">
      <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeSlug]}>
        {markdown}
      </ReactMarkdown>
    </article>
  );
}
