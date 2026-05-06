import type { Metadata } from "next";
import { Fraunces, Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { NavBar } from "@/components/nav-bar";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-logo",
  display: "swap",
  weight: ["300", "600", "700"],
  style: ["normal", "italic"],
});

export const metadata: Metadata = {
  title: "Aria Labs - The AI skill layer for teams",
  description: "Browse, install, and evolve shared AI skills, plugins, agents, and MCP packages.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${fraunces.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <NavBar />
        <main className="app-main flex-1">
          {children}
        </main>
        <Toaster />
      </body>
    </html>
  );
}
