"use client";

import Link from "next/link";
import { useState } from "react";

type InterestFormData = {
  name: string;
  email: string;
  company: string;
  role: string;
  teamSize: string;
  platforms: string;
  message: string;
};

const initialFormData: InterestFormData = {
  name: "",
  email: "",
  company: "",
  role: "",
  teamSize: "",
  platforms: "",
  message: "",
};

export function InterestForm() {
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState<InterestFormData>(initialFormData);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    const response = await fetch("/api/interest", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(formData),
    });

    setSubmitting(false);

    if (!response.ok) {
      const body = await response.json().catch(() => ({ error: "Something went wrong. Please try again." }));
      setError(body.error || "Something went wrong. Please try again.");
      return;
    }

    setSubmitted(true);
  };

  const handleChange = (
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    setFormData((previous) => ({ ...previous, [event.target.name]: event.target.value }));
  };

  if (submitted) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center px-6">
        <div className="animate-fade-in-up max-w-md text-center">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl border border-[#a7bd8d]/30 bg-[#a7bd8d]/20">
            <span className="text-2xl text-[#a7bd8d]">✓</span>
          </div>
          <h1 className="text-2xl font-bold">You&apos;re on the list</h1>
          <p className="mt-3 leading-relaxed text-muted-foreground">
            Thanks, {formData.name.split(" ")[0] || "there"}. We&apos;ll reach out to{" "}
            <span className="font-mono text-accent-light">{formData.email}</span> with early access details.
          </p>
          <div className="mt-6 rounded-lg border border-border/20 bg-surface/30 p-4 text-left">
            <p className="mb-2 text-[10px] font-mono uppercase tracking-wider text-muted-foreground">What happens next</p>
            <div className="space-y-2">
              {[
                "We review your submission",
                "We send onboarding details by email",
                "We help set up your first skills library",
              ].map((step, index) => (
                <div key={step} className="flex items-center gap-2 text-xs font-mono text-muted-foreground">
                  <span className="text-accent-light">{index + 1}.</span>
                  {step}
                </div>
              ))}
            </div>
          </div>
          <Link
            href="/"
            className="mt-6 inline-block rounded-full border border-border/30 bg-surface/30 px-6 py-2.5 text-sm font-mono text-muted-foreground transition-all hover:border-accent/30 hover:text-foreground"
          >
            Back to home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="relative overflow-hidden py-16 md:py-24 grid-bg-animated">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/3 h-96 w-96 rounded-full bg-accent/5 blur-[120px]" />
        <div className="absolute bottom-1/4 right-1/4 h-64 w-64 rounded-full bg-[#9dbbd4]/5 blur-[100px]" />
      </div>

      <div className="relative mx-auto max-w-5xl px-6">
        <div className="grid gap-12 md:grid-cols-5">
          <div className="md:col-span-2">
            <div className="sticky top-24">
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-accent/20 bg-accent/5 px-4 py-1.5 text-xs font-mono text-accent-light">
                <span className="h-1.5 w-1.5 rounded-full bg-[#a7bd8d]" />
                Early Access
              </div>
              <h1 className="text-3xl font-bold md:text-4xl">
                Get early access to <span className="gradient-text">Aria Labs</span>
              </h1>
              <p className="mt-4 leading-relaxed text-muted-foreground">
                Join the teams building self-evolving organizational intelligence. We&apos;re onboarding in batches.
              </p>

              <div className="mt-8 space-y-4">
                {[
                  { label: "Shared skill library", desc: "Publish reusable AI workflows for your team" },
                  { label: "Versioned package installs", desc: "Inspect files and instructions before installing" },
                  { label: "Console onboarding", desc: "Review, improve, and measure skill usage" },
                ].map((item) => (
                  <div key={item.label} className="flex items-start gap-3">
                    <span className="mt-0.5 font-mono text-xs text-[#a7bd8d]">[+]</span>
                    <div>
                      <p className="text-sm font-medium">{item.label}</p>
                      <p className="text-xs text-muted-foreground">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="md:col-span-3">
            <form
              onSubmit={handleSubmit}
              className="animate-fade-in-up space-y-6 rounded-2xl border border-border/30 bg-surface/30 p-8 md:p-10"
            >
              <div className="grid gap-6 sm:grid-cols-2">
                <TextField label="Full name *" name="name" required value={formData.name} onChange={handleChange} placeholder="Carlos Reyes" />
                <TextField label="Work email *" name="email" type="email" required value={formData.email} onChange={handleChange} placeholder="carlos@company.com" />
              </div>

              <div className="grid gap-6 sm:grid-cols-2">
                <TextField label="Company *" name="company" required value={formData.company} onChange={handleChange} placeholder="Redline Logistics" />
                <TextField label="Role" name="role" value={formData.role} onChange={handleChange} placeholder="VP Operations, COO, Engineering Lead" />
              </div>

              <div className="grid gap-6 sm:grid-cols-2">
                <div>
                  <label className="mb-2 block text-xs font-mono text-muted-foreground">Team size</label>
                  <select
                    name="teamSize"
                    value={formData.teamSize}
                    onChange={handleChange}
                    className="w-full rounded-lg border border-border/30 bg-background/50 px-4 py-3 text-sm font-mono text-foreground transition-all focus:border-accent/50 focus:outline-none focus:ring-1 focus:ring-accent/30"
                  >
                    <option value="" className="bg-background">Select...</option>
                    <option value="1-10" className="bg-background">1-10</option>
                    <option value="11-50" className="bg-background">11-50</option>
                    <option value="51-200" className="bg-background">51-200</option>
                    <option value="201-1000" className="bg-background">201-1,000</option>
                    <option value="1000+" className="bg-background">1,000+</option>
                  </select>
                </div>
                <TextField label="Key platforms" name="platforms" value={formData.platforms} onChange={handleChange} placeholder="Slack, Gmail, Jira, Salesforce" />
              </div>

              <div>
                <label className="mb-2 block text-xs font-mono text-muted-foreground">
                  What problem are you hoping Aria solves?
                </label>
                <textarea
                  name="message"
                  value={formData.message}
                  onChange={handleChange}
                  rows={3}
                  placeholder="Our repeated AI workflows are scattered across chats and docs..."
                  className="w-full resize-none rounded-lg border border-border/30 bg-background/50 px-4 py-3 text-sm font-mono text-foreground placeholder:text-muted-foreground/50 transition-all focus:border-accent/50 focus:outline-none focus:ring-1 focus:ring-accent/30"
                />
              </div>

              {error && (
                <div className="rounded-lg border border-red-500/30 bg-red-500/5 p-3 text-xs font-mono text-red-400">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="animate-pulse-glow w-full rounded-full bg-accent px-8 py-3.5 text-base font-semibold font-mono text-white transition-all hover:bg-accent-light hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:scale-100"
              >
                {submitting ? "Submitting..." : "Submit Interest"}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

function TextField({
  label,
  name,
  value,
  onChange,
  placeholder,
  type = "text",
  required = false,
}: {
  label: string;
  name: keyof InterestFormData;
  value: string;
  onChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder: string;
  type?: string;
  required?: boolean;
}) {
  return (
    <div>
      <label className="mb-2 block text-xs font-mono text-muted-foreground">{label}</label>
      <input
        type={type}
        name={name}
        required={required}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className="w-full rounded-lg border border-border/30 bg-background/50 px-4 py-3 text-sm font-mono text-foreground placeholder:text-muted-foreground/50 transition-all focus:border-accent/50 focus:outline-none focus:ring-1 focus:ring-accent/30"
      />
    </div>
  );
}
