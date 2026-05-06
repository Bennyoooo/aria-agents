"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import { useEffect, useState } from "react";
import { buttonVariants } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import type { User } from "@supabase/supabase-js";

const navLinks = [
  { href: "/console", label: "Console" },
  { href: "/review", label: "Review" },
  { href: "/my-skills", label: "Mine" },
  { href: "/submit", label: "New" },
  { href: "/dashboard", label: "Insights" },
  { href: "/integrations", label: "Integrations" },
];

export function NavBar() {
  const pathname = usePathname();
  const [user, setUser] = useState<User | null>(null);
  const supabase = createClient();

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user));
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    window.location.href = "/login";
  };

  const initials = user?.user_metadata?.full_name
    ?.split(" ")
    .map((n: string) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2) ?? user?.email?.[0]?.toUpperCase() ?? "?";

  return (
    <nav className="glass sticky top-0 z-50 border-b border-border/30">
      <div className="container mx-auto px-4 max-w-7xl flex h-14 items-center justify-between">
        <div className="flex items-center gap-6">
          <Link href="/" className="group flex items-center gap-2.5">
            <Image src="/logo.svg" alt="Aria Labs" width={28} height={28} className="rounded-lg transition-transform group-hover:scale-105" />
            <span className="text-lg font-medium text-foreground" style={{ fontFamily: "var(--font-logo), Georgia, serif" }}>
              Aria <span className="font-normal text-muted-foreground">Labs</span><span className="text-accent-light">.</span>
            </span>
          </Link>
          {user && (
            <div className="hidden md:flex items-center gap-1">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`px-3 py-1.5 rounded-md text-sm transition-colors ${
                    pathname === link.href
                      ? "bg-accent/15 text-accent-light font-medium"
                      : "text-muted-foreground hover:text-foreground hover:bg-surface-light/70"
                  }`}
                >
                  {link.label}
                </Link>
              ))}
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/#library"
            className={`hidden px-3 py-1.5 rounded-md text-sm transition-colors md:inline-flex ${
              pathname === "/"
                ? "bg-accent/15 text-accent-light font-medium"
                : "text-muted-foreground hover:text-foreground hover:bg-surface-light/70"
            }`}
          >
            Skill Library
          </Link>
          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger className="relative h-8 w-8 rounded-full outline-none">
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="text-xs">{initials}</AvatarFallback>
                </Avatar>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <div className="px-2 py-1.5">
                  <p className="text-sm font-medium">{user.user_metadata?.full_name}</p>
                  <p className="text-xs text-muted-foreground">{user.email}</p>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={() => window.location.href = "/settings"}>
                  Settings
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSignOut}>
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Link href="/login" className={buttonVariants({ size: "sm" })}>
              Sign in
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}
