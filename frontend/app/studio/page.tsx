import { promises as fs } from "fs";
import path from "path";
import type { Metadata } from "next";
import { MarkdownDoc } from "@/components/MarkdownDoc";

export const metadata: Metadata = {
  title: "Studio Routing Ideeënboard — Roland LX708 Tone Library",
  description:
    "Vijf routing-setups rond de LX708, Rubix22, Maschine MK2 en Ableton Live — van producer-workflow tot hybride live-jam.",
};

export default async function StudioPage() {
  const markdown = await fs.readFile(
    path.join(process.cwd(), "content", "studio.md"),
    "utf-8"
  );
  return (
    <div className="mx-auto w-full max-w-3xl flex-1 px-4 py-10 sm:px-6">
      <MarkdownDoc markdown={markdown} />
    </div>
  );
}
