import { Library, Search } from "lucide-react";
import { SkillLibraryBrowser } from "@/components/skill-library-browser";

export default function LibraryPage() {
  return (
    <div className="full-bleed-page">
      <section className="border-b border-border/20 bg-surface/10 py-12 md:py-16 grid-bg-animated">
        <div className="mx-auto max-w-7xl px-6">
          <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
            <div>
              <p className="mb-3 flex items-center gap-2 text-sm font-medium uppercase tracking-[0.18em] text-accent-light">
                <Library className="h-4 w-4" />
                Skills Library
              </p>
              <h1 className="text-4xl font-medium md:text-6xl">Browse public skills</h1>
              <p className="mt-4 max-w-2xl text-muted-foreground">
                Filter by source, package type, and category. Open any skill to inspect its files, rendered SKILL.md, metadata, and install command.
              </p>
            </div>
            <div className="flex items-center gap-2 rounded-full border border-border/30 bg-surface/40 px-4 py-2 text-sm text-muted-foreground">
              <Search className="h-4 w-4 text-accent-light" />
              Inspect before install
            </div>
          </div>
        </div>
      </section>

      <section className="py-8 md:py-10">
        <div className="mx-auto max-w-7xl px-6">
          <SkillLibraryBrowser mode="public" />
        </div>
      </section>
    </div>
  );
}
