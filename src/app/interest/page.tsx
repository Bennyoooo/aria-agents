import type { Metadata } from "next";
import { InterestForm } from "@/components/interest-form";

export const metadata: Metadata = {
  title: "Aria Labs - Get Early Access",
  description: "Submit your interest and get early access to Aria Labs.",
};

export default function InterestPage() {
  return (
    <div className="full-bleed-page">
      <InterestForm />
    </div>
  );
}
