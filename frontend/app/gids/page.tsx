import { promises as fs } from "fs";
import path from "path";
import type { Metadata } from "next";
import { MarkdownDoc } from "@/components/MarkdownDoc";

export const metadata: Metadata = {
  title: "Opname- & Compositiegids — Roland LX708 Tone Library",
  description:
    "Praktische opname-referentie voor de Roland LX708: knoppen, Dual/Split, overdubben, WAV naar USB en genre-tips.",
};

export default async function GidsPage() {
  const markdown = await fs.readFile(
    path.join(process.cwd(), "content", "gids.md"),
    "utf-8"
  );
  return (
    <div className="mx-auto w-full max-w-3xl flex-1 px-4 py-10 sm:px-6">
      <MarkdownDoc markdown={markdown} />
    </div>
  );
}
