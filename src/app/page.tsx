import Link from "next/link";
import { ArrowRight, Check, Eye, GitBranch, Library, RefreshCw, Rocket, Search, Sparkles, TrendingUp, Zap } from "lucide-react";
import { SkillLibraryBrowser } from "@/components/skill-library-browser";
import { buttonVariants } from "@/components/ui/button";

const lifecycle = [
  { icon: Eye, label: "Observe", sub: "Detect repeated workflows across tools" },
  { icon: Zap, label: "Capture", sub: "Turn patterns into reusable skills" },
  { icon: Rocket, label: "Deploy", sub: "Surface the right skill at the right time" },
  { icon: RefreshCw, label: "Evolve", sub: "Update skills as the company changes" },
];

const problems = [
  {
    number: "01",
    title: "Skill Creation",
    text: "Useful AI workflows stay trapped in private chats because documenting prompts, tools, and rules interrupts real work.",
  },
  {
    number: "02",
    title: "Skill Sharing",
    text: "When a good skill exists, there is no durable package, owner, version, or file browser for the rest of the company.",
  },
  {
    number: "03",
    title: "Skill Discovery",
    text: "Employees and agents rarely know which skill to use, when it applies, or whether it still works.",
  },
  {
    number: "04",
    title: "Skill Evolution",
    text: "Projects change, APIs break, and instructions age. Stale skills erode trust unless they are reviewed and updated.",
  },
];

const solutions = [
  "Public package library with rendered SKILL.md previews and source files.",
  "Typed installs for skills, plugins, MCPs, and agents through aria install.",
  "Versioned archives mirrored into storage with Postgres indexing metadata.",
  "Console workflows for team-only review, feedback, publishing, and analytics.",
];

export default function HomePage() {
  return (
    <div className="full-bleed-page">
      <section className="relative min-h-[720px] overflow-hidden border-b border-border/20 pt-32 pb-20 md:pt-44 md:pb-28 grid-bg-animated h-scan">
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {[15, 30, 55, 72, 88].map((left, index) => (
            <div
              key={left}
              className="data-line"
              style={{ left: `${left}%`, animationDelay: `${index * 1.6}s`, animationDuration: `${7 + index}s` }}
            />
          ))}
          {[{ x: 20, y: 30 }, { x: 75, y: 20 }, { x: 85, y: 60 }, { x: 12, y: 70 }, { x: 50, y: 85 }].map((point, index) => (
            <div
              key={`${point.x}-${point.y}`}
              className="node-pulse absolute h-1 w-1 rounded-full bg-accent-light"
              style={{ left: `${point.x}%`, top: `${point.y}%`, animationDelay: `${index * 0.7}s` }}
            />
          ))}
        </div>

        <div className="relative mx-auto max-w-6xl px-6 text-center">
          <div className="animate-fade-in-up mb-6 inline-flex items-center gap-2 rounded-full border border-accent/20 bg-accent/5 px-4 py-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-[#a7bd8d]" />
            <span className="text-sm text-accent-light">The AI skill layer for enterprise teams</span>
          </div>

          <h1 className="animate-fade-in-up animate-delay-100 text-5xl font-medium leading-[1.08] text-balance md:text-7xl">
            The operating memory for companies to become
            <br />
            <span className="gradient-text">AI-native</span>
          </h1>

          <p className="animate-fade-in-up animate-delay-200 mx-auto mt-8 max-w-3xl text-lg leading-8 text-muted-foreground md:text-xl">
            When someone finds a better way to do repeated work with AI, that know-how should not stay in their head or a private chat. Aria turns everyday workflows into shared, inspectable, installable skills.
          </p>

          <div className="animate-fade-in-up animate-delay-300 mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <a href="#library" className={buttonVariants({ size: "lg", className: "animate-pulse-glow rounded-full px-8 py-5" })}>
              Browse Skill Library
              <ArrowRight className="ml-2 h-4 w-4" />
            </a>
            <Link href="/console" className={buttonVariants({ variant: "outline", size: "lg", className: "rounded-full px-8 py-5" })}>
              Open Console
            </Link>
          </div>

          <div className="animate-fade-in-up animate-delay-400 mx-auto mt-20 max-w-3xl rounded-2xl border border-border/40 bg-surface/40 p-6 md:p-8">
            <div className="relative grid gap-4 text-center sm:grid-cols-2 lg:grid-cols-4">
              {lifecycle.map((item, index) => {
                const Icon = item.icon;
                return (
                  <div key={item.label} className="relative">
                    <div className="flex flex-col items-center gap-2">
                      <div className="flex h-14 w-14 items-center justify-center rounded-xl border border-border/40 bg-surface">
                        <Icon className="h-6 w-6 text-accent-light" />
                      </div>
                      <p className="text-sm font-medium text-foreground">{item.label}</p>
                      <p className="max-w-32 text-[11px] leading-snug text-muted-foreground">{item.sub}</p>
                    </div>
                    {index < lifecycle.length - 1 && (
                      <ArrowRight className="absolute top-7 -right-2 hidden h-3 w-3 text-accent-light/40 lg:block" />
                    )}
                  </div>
                );
              })}
            </div>
            <div className="mt-5 flex justify-center">
              <div className="flex items-center gap-2 rounded-full border border-accent/20 bg-accent/5 px-4 py-1.5 text-[11px] text-accent-light">
                <RefreshCw className="h-3.5 w-3.5" />
                Continuous loop: every cycle makes the system smarter
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="border-b border-border/20 py-24 md:py-32">
        <div className="mx-auto max-w-6xl px-6">
          <div className="mb-14 text-center">
            <p className="mb-3 text-sm font-medium uppercase tracking-[0.18em] text-accent-light">The Problem</p>
            <h2 className="text-3xl font-medium md:text-5xl">
              Most companies <span className="gradient-text">cannot compound AI know-how</span>
            </h2>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {problems.map((problem) => (
              <div key={problem.number} className="card-hover rounded-xl border border-border/30 bg-surface/30 p-6">
                <div className="flex items-start gap-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-accent/20 bg-accent/5 font-mono text-sm font-medium text-accent-light">
                    {problem.number}
                  </div>
                  <div>
                    <h3 className="mb-2 text-lg font-medium">{problem.title}</h3>
                    <p className="text-sm leading-6 text-muted-foreground">{problem.text}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="features" className="border-b border-border/20 py-24 md:py-32">
        <div className="mx-auto max-w-6xl px-6">
          <div className="mb-14 text-center">
            <p className="mb-3 text-sm font-medium uppercase tracking-[0.18em] text-accent-light">How Aria Works</p>
            <h2 className="text-3xl font-medium md:text-5xl">
              One system for the <span className="gradient-text">full skill lifecycle</span>
            </h2>
          </div>
          <div className="grid gap-6 lg:grid-cols-[1fr_420px]">
            <div className="rounded-2xl border border-border/30 bg-surface/30 p-6 md:p-8">
              <div className="grid gap-3">
                {solutions.map((solution) => (
                  <div key={solution} className="flex items-start gap-3 rounded-lg border border-border/20 bg-background/40 px-4 py-3">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-accent-light" />
                    <p className="text-sm leading-6 text-muted-foreground">{solution}</p>
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-2xl border border-border/30 bg-surface/30 p-6 md:p-8">
              <div className="mb-5 flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-accent/20 bg-accent/10">
                  <TrendingUp className="h-6 w-6 text-accent-light" />
                </div>
                <h3 className="text-xl font-medium">Compounding Intelligence</h3>
              </div>
              <p className="mb-6 text-sm leading-6 text-muted-foreground">
                Every approved package becomes a reusable company capability. Each install, review, correction, and update improves the operating memory.
              </p>
              <div className="rounded-xl border border-border/20 bg-background/50 p-4">
                <svg viewBox="0 0 300 80" className="h-24 w-full" preserveAspectRatio="none" aria-hidden="true">
                  <defs>
                    <linearGradient id="barGrad" x1="0" y1="1" x2="0" y2="0">
                      <stop offset="0%" stopColor="#c97055" />
                      <stop offset="100%" stopColor="#f0a77d" />
                    </linearGradient>
                  </defs>
                  {[8, 12, 14, 18, 20, 26, 30, 38, 44, 56, 68, 80].map((height, index) => (
                    <rect key={height + index} x={index * 25 + 2} y={80 - height} width="20" height={height} rx="2" fill="url(#barGrad)" />
                  ))}
                </svg>
                <div className="mt-2 flex justify-between text-[10px] font-mono text-muted-foreground">
                  <span>Month 1</span>
                  <span>Month 12</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="library" className="scroll-mt-20 border-b border-border/20 py-24 md:py-32">
        <div className="mx-auto max-w-7xl px-6">
          <div className="mb-8 flex flex-col justify-between gap-3 md:flex-row md:items-end">
            <div>
              <p className="mb-3 flex items-center gap-2 text-sm font-medium uppercase tracking-[0.18em] text-accent-light">
                <Library className="h-4 w-4" />
                Skill Library
              </p>
              <h2 className="text-3xl font-medium md:text-5xl">Browse public skills</h2>
              <p className="mt-3 max-w-2xl text-muted-foreground">
                Public packages are shown here. Team-only legacy tools, feedback, and admin tabs live in the signed-in console.
              </p>
            </div>
            <div className="flex items-center gap-2 rounded-full border border-border/30 bg-surface/40 px-4 py-2 text-sm text-muted-foreground">
              <Search className="h-4 w-4 text-accent-light" />
              Inspect before install
            </div>
          </div>
          <SkillLibraryBrowser mode="public" />
        </div>
      </section>

      <section className="py-24 md:py-32">
        <div className="mx-auto max-w-3xl px-6 text-center">
          <div className="mb-5 flex justify-center">
            <Sparkles className="h-8 w-8 text-accent-light" />
          </div>
          <h2 className="text-3xl font-medium md:text-5xl">
            Your company&apos;s best work
            <br />
            <span className="gradient-text">should not be repeated from scratch.</span>
          </h2>
          <p className="mx-auto mt-6 max-w-xl text-lg leading-8 text-muted-foreground">
            Aria makes sure the next person, or agent, starts from where the last one finished.
          </p>
        </div>
      </section>
    </div>
  );
}
