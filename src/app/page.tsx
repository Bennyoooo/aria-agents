import Link from "next/link";
import { ArrowRight, Eye, RefreshCw, Rocket, Sparkles, Zap } from "lucide-react";
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
    problem: "Only power users manually build AI workflows. Most employees won't pause to document prompts, decision rules, and tool usage.",
    consequence: "Knowledge stays trapped in individual habits and private chats.",
    color: "text-[#9dbbd4]",
    border: "border-[#9dbbd4]/20",
    bg: "bg-[#9dbbd4]/5",
  },
  {
    number: "02",
    title: "Skill Sharing",
    problem: "When useful skills are created, they stay with one person or one team. No shared system to find, reuse, or improve them.",
    consequence: "Teams solve the same problems independently, over and over.",
    color: "text-accent-light",
    border: "border-accent/20",
    bg: "bg-accent/5",
  },
  {
    number: "03",
    title: "Skill Discovery",
    problem: "Even when skills exist, employees and agents don't know which one to use or when. Context is missing.",
    consequence: "Good skills go unused. People default to starting from scratch.",
    color: "text-[#a7bd8d]",
    border: "border-[#a7bd8d]/20",
    bg: "bg-[#a7bd8d]/5",
  },
  {
    number: "04",
    title: "Skill Evolution",
    problem: "Projects change, tools upgrade, APIs break, policies shift. Skills created last quarter may not work today.",
    consequence: "Stale skills erode trust. People stop relying on shared knowledge.",
    color: "text-orange-400",
    border: "border-orange-500/20",
    bg: "bg-orange-500/5",
  },
];

const solutions = [
  {
    number: "01",
    title: "Automatic Skill Creation",
    tagline: "Observe. Extract. Draft.",
    description: "Aria connects to Slack, email, docs, tickets, internal tools, and databases. It watches how work already happens, detects repeated patterns, and drafts skills for human approval without anyone pausing their work to document anything.",
    details: [
      "Monitors conversations, documents, and agent sessions passively",
      "Extracts the structure: steps, decisions, tools, handoffs",
      "Drafts a skill definition and asks the right person to approve it",
    ],
    color: "text-[#9dbbd4]",
  },
  {
    number: "02",
    title: "Skills Library",
    tagline: "Share. Own. Improve.",
    description: "Approved skills are published to a company-wide library. Teams can browse, adopt, fork, and improve skills, turning individual know-how into shared company capabilities with clear ownership and version history.",
    details: [
      "Centralized, searchable collection of approved skills",
      "Ownership, versioning, and usage analytics per skill",
      "Teams contribute skills; everyone benefits from collective intelligence",
    ],
    color: "text-accent-light",
  },
  {
    number: "03",
    title: "Contextual Discovery & Invocation",
    tagline: "Right skill. Right time.",
    description: "Aria recommends or runs the right skill based on context from Slack, email, docs, or an internal app. Employees and agents do not need to search for skills. The system surfaces them when they are relevant.",
    details: [
      "Watches the work context: what tool, what task, what stage",
      "Suggests matching skills inline in Slack, email, or agent sessions",
      "Can auto-execute with permission, or offer one-click invocation",
    ],
    color: "text-[#a7bd8d]",
  },
  {
    number: "04",
    title: "Continuous Evolution",
    tagline: "Learn. Update. Retire.",
    description: "Skills are not static. Aria uses source changes, usage data, and collaborative feedback to update, improve, or retire skills over time. When users flag the same gap, Aria proposes a revision to the skill owner.",
    details: [
      "Tracks usage, edits, and feedback across every invocation",
      "Auto-proposes updates when patterns of correction emerge",
      "Skill owners review and approve changes; humans stay in the loop",
    ],
    color: "text-orange-400",
  },
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
            Skills and runbooks are created while you work — no code, no friction.
            <br />
            They&apos;re shared across teams, auto-discovered by agents, and self-evolving with every session.
          </p>

          <div className="animate-fade-in-up animate-delay-300 mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link href="/library" className={buttonVariants({ size: "lg", className: "animate-pulse-glow rounded-full px-8 py-5" })}>
              Browse Skill Library
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
            <Link href="/interest" className={buttonVariants({ variant: "outline", size: "lg", className: "rounded-full px-8 py-5" })}>
              Request Early Access
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

      <section id="features" className="scroll-mt-20 border-b border-border/20 py-24 md:py-32">
        <div className="mx-auto max-w-6xl px-6">
          <div className="mb-16 text-center">
            <p className="mb-3 text-sm font-medium uppercase tracking-[0.18em] text-accent-light">The Problem</p>
            <h2 className="text-3xl font-medium md:text-5xl">
              Most companies <span className="gradient-text">cannot build this internally</span>
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-lg text-muted-foreground">
              Four capabilities are broken. Each one alone limits AI adoption. Together, they prevent companies from compounding what they learn.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {problems.map((problem) => (
              <div key={problem.number} className={`card-hover rounded-xl border ${problem.border} bg-surface/30 p-6`}>
                <div className="flex items-start gap-4">
                  <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${problem.bg} font-mono text-sm font-medium ${problem.color}`}>
                    {problem.number}
                  </div>
                  <div className="flex-1">
                    <h3 className="mb-2 text-lg font-medium">{problem.title}</h3>
                    <p className="text-sm leading-relaxed text-muted-foreground">{problem.problem}</p>
                    <div className={`mt-3 rounded-md ${problem.bg} px-3 py-2`}>
                      <p className={`text-xs ${problem.color}`}>-&gt; {problem.consequence}</p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="how-it-works" className="scroll-mt-20 border-b border-border/20 py-24 md:py-32">
        <div className="mx-auto max-w-6xl px-6">
          <div className="mb-16 text-center">
            <p className="mb-3 text-sm font-medium uppercase tracking-[0.18em] text-accent-light">How Aria Works</p>
            <h2 className="text-3xl font-medium md:text-5xl">
              Aria solves <span className="gradient-text">all four</span>
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-lg text-muted-foreground">
              One system that handles the full lifecycle, from detecting a repeated workflow to keeping it updated years later.
            </p>
          </div>

          <div className="space-y-6">
            {solutions.map((solution, index) => (
              <div
                key={solution.number}
                className="card-hover overflow-hidden rounded-xl border border-border/30 bg-surface/20"
                style={{ animationDelay: `${0.1 + index * 0.1}s` }}
              >
                <div className="p-6 md:p-8">
                  <div className="flex flex-col gap-6 md:flex-row md:items-start">
                    <div className="flex shrink-0 items-center gap-3 md:w-48">
                      <span className={`font-mono text-3xl font-medium ${solution.color} opacity-30`}>{solution.number}</span>
                      <div>
                        <p className={`text-sm font-medium ${solution.color}`}>{solution.tagline}</p>
                      </div>
                    </div>
                    <div className="flex-1">
                      <h3 className="mb-2 text-xl font-medium">{solution.title}</h3>
                      <p className="mb-4 text-sm leading-relaxed text-muted-foreground">{solution.description}</p>
                      <div className="grid gap-2 sm:grid-cols-3">
                        {solution.details.map((detail) => (
                          <div key={detail} className="flex items-start gap-2 rounded-lg border border-border/20 bg-surface/30 px-3 py-2.5">
                            <svg className={`mt-0.5 h-4 w-4 shrink-0 ${solution.color}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                            <p className="text-xs leading-relaxed text-muted-foreground">{detail}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-b border-border/20 py-24 md:py-32">
        <div className="mx-auto max-w-6xl px-6">
          <div className="grid gap-6 md:grid-cols-2">
            <div className="card-hover relative overflow-hidden rounded-2xl border border-border/30 bg-surface/30 p-8">
              <div className="absolute top-0 right-0 h-40 w-40 rounded-full bg-accent/5 blur-[80px]" />
              <div className="relative">
                <div className="mb-5 flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-accent/20 bg-accent/10">
                    <svg className="h-6 w-6 text-accent-light" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-medium">Compounding Intelligence</h3>
                </div>
                <p className="mb-6 text-sm leading-relaxed text-muted-foreground">
                  Every approved skill becomes a reusable company capability. Each invocation, correction, and update improves the operating memory. Future employees and agents automate more work with less repeated effort.
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
                  <p className="mt-1 text-center font-mono text-[10px] text-accent-light">Reusable skills in the system</p>
                </div>
              </div>
            </div>

            <div className="card-hover relative overflow-hidden rounded-2xl border border-border/30 bg-surface/30 p-8">
              <div className="absolute top-0 right-0 h-40 w-40 rounded-full bg-[#a7bd8d]/5 blur-[80px]" />
              <div className="relative">
                <div className="mb-5 flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-[#a7bd8d]/20 bg-[#a7bd8d]/10">
                    <Sparkles className="h-6 w-6 text-[#a7bd8d]" />
                  </div>
                  <h3 className="text-xl font-medium">Company-Specific AI</h3>
                </div>
                <p className="mb-6 text-sm leading-relaxed text-muted-foreground">
                  Aria turns skill sessions, corrections, approvals, and outcomes into training data. Over time, this fine-tunes an operational model that understands how your specific company works.
                </p>
                <div className="space-y-3 rounded-xl border border-border/20 bg-background/50 p-4">
                  {[
                    { label: "Skill invocations", value: "2,847", trend: "+34% this month", color: "text-[#a7bd8d]" },
                    { label: "Human corrections", value: "186", trend: "Feeding back to model", color: "text-[#9dbbd4]" },
                    { label: "Auto-updated skills", value: "23", trend: "No manual effort needed", color: "text-accent-light" },
                  ].map((row) => (
                    <div key={row.label} className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">{row.label}</span>
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-medium">{row.value}</span>
                        <span className={`text-[10px] ${row.color}`}>{row.trend}</span>
                      </div>
                    </div>
                  ))}
                  <div className="border-t border-border/20 pt-2">
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-border/20">
                        <div className="h-full w-[72%] rounded-full bg-gradient-to-r from-[#a7bd8d]/60 to-[#a7bd8d]/80" />
                      </div>
                      <span className="font-mono text-[10px] text-[#a7bd8d]">72% operational coverage</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-16 rounded-xl border border-border/20 bg-surface/20 p-8 text-center">
            <p className="mb-3 text-sm font-medium uppercase tracking-[0.18em] text-accent-light">The Bottom Line</p>
            <h3 className="mb-4 text-2xl font-medium md:text-3xl">
              Every company deserves an <span className="gradient-text">operating memory that learns</span>
            </h3>
            <p className="mx-auto max-w-2xl text-sm leading-relaxed text-muted-foreground">
              When someone discovers a better way to handle a task, that knowledge gets captured, reviewed, and made available to everyone. Aria brings this system to every company, automated and designed to work across any stack.
            </p>
          </div>
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

      <footer className="border-t border-border/20 py-8">
        <div className="mx-auto max-w-6xl px-6 text-center text-xs text-muted-foreground">
          © 2026 Aria Labs. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
