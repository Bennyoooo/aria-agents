import Link from "next/link";
import { ArrowRight, Boxes, Download, Library, ShieldCheck } from "lucide-react";
import { SkillLibraryBrowser } from "@/components/skill-library-browser";
import { buttonVariants } from "@/components/ui/button";

export default function HomePage() {
  return (
    <div className="space-y-14">
      <section className="grid min-h-[520px] items-center gap-10 py-8 lg:grid-cols-[1fr_420px]">
        <div className="max-w-3xl space-y-6">
          <div className="inline-flex items-center gap-2 rounded-full border bg-card px-3 py-1 text-sm text-muted-foreground">
            <Library className="h-4 w-4" />
            Public skill library
          </div>
          <div className="space-y-4">
            <h1 className="max-w-4xl text-5xl font-semibold tracking-tight text-balance md:text-7xl">
              Aria
            </h1>
            <p className="max-w-2xl text-lg leading-8 text-muted-foreground md:text-xl">
              Browse installable skills, plugins, agents, and MCP packages. Each package keeps its source files, rendered instructions, install command, and versioned archive together.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <a href="#library" className={buttonVariants({ size: "lg" })}>
              Browse Skills
              <ArrowRight className="ml-2 h-4 w-4" />
            </a>
            <Link href="/console" className={buttonVariants({ variant: "outline", size: "lg" })}>
              Open Console
            </Link>
          </div>
        </div>

        <div className="rounded-lg border bg-card p-5 shadow-sm">
          <div className="space-y-5">
            <div className="flex items-center justify-between border-b pb-4">
              <div>
                <p className="text-sm font-medium">Package install</p>
                <p className="text-xs text-muted-foreground">Typed, versioned, and inspectable</p>
              </div>
              <Boxes className="h-5 w-5 text-muted-foreground" />
            </div>
            <code className="block rounded-md bg-muted p-4 text-sm">
              aria install skill anthropic/pptx@1.0.0
            </code>
            <div className="grid gap-3 text-sm">
              <div className="flex items-center gap-3">
                <ShieldCheck className="h-4 w-4 text-primary" />
                <span>Mirrored source files and package ZIPs</span>
              </div>
              <div className="flex items-center gap-3">
                <Download className="h-4 w-4 text-primary" />
                <span>Clean package names and immutable versions</span>
              </div>
              <div className="flex items-center gap-3">
                <Library className="h-4 w-4 text-primary" />
                <span>Rendered SKILL.md previews before install</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="library" className="space-y-5 scroll-mt-20">
        <div className="flex flex-col justify-between gap-3 md:flex-row md:items-end">
          <div>
            <h2 className="text-3xl font-semibold tracking-tight">Skill Library</h2>
            <p className="mt-2 max-w-2xl text-muted-foreground">
              Public packages are shown here. Team-only legacy tools and admin tabs live in the signed-in console.
            </p>
          </div>
        </div>
        <SkillLibraryBrowser mode="public" />
      </section>
    </div>
  );
}
