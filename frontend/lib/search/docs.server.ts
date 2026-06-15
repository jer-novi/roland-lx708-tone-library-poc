import { readFile } from "node:fs/promises";
import path from "node:path";
import GithubSlugger from "github-slugger";
import type { SearchDoc } from "./types";

/**
 * Server-only: leest de gerenderde markdown-docs en maakt zoekdocumenten van de
 * `##`/`###`-secties. De slugger spiegelt `rehype-slug`, dus de hrefs komen exact
 * uit op de heading-anchors van `/gids` en `/studio` (zelfde aanpak als
 * `gidsAnchor` in `lib/genreTips.ts`). Alleen importeren vanuit server-componenten.
 */
const PAGES = [
  { file: "gids.md", href: "/gids", label: "Opnamegids" },
  { file: "studio.md", href: "/studio", label: "Studio-routing" },
];

const HEADING = /^(#{2,3})\s+(.*)$/;

export async function docDocs(): Promise<SearchDoc[]> {
  const out: SearchDoc[] = [];
  for (const page of PAGES) {
    let md: string;
    try {
      md = await readFile(path.join(process.cwd(), "content", page.file), "utf8");
    } catch {
      continue; // ontbrekend/onleesbaar doc — sla over
    }
    const slugger = new GithubSlugger();
    for (const line of md.split("\n")) {
      const m = HEADING.exec(line.trim());
      if (!m) continue;
      const text = m[2].replace(/[*_`]/g, "").trim();
      if (!text) continue;
      const slug = slugger.slug(text);
      out.push({
        id: `doc-${page.href}-${slug}`,
        type: "doc",
        title: text,
        subtitle: page.label,
        keywords: [page.label],
        href: `${page.href}#${slug}`,
      });
    }
  }
  return out;
}
