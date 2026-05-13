"use client";

import Link from "next/link";
import { UserButton, useUser } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";

export function NavMain() {
  const { isSignedIn } = useUser();

  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-black/40 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
        <Link href="/dashboard" className="flex items-center gap-2 text-lg font-semibold tracking-tight">
          <span className="bg-gradient-to-r from-rose-400 to-violet-400 bg-clip-text text-transparent">CineMind</span>
        </Link>
        <nav className="hidden items-center gap-6 text-sm text-zinc-300 md:flex">
          <Link href="/dashboard" className="hover:text-white">
            Home
          </Link>
          <Link href="/search" className="hover:text-white">
            Search
          </Link>
        </nav>
        <div className="flex items-center gap-3">
          {!isSignedIn ? (
            <Link href="/sign-in">
              <Button variant="ghost" size="sm">
                Sign in
              </Button>
            </Link>
          ) : null}
          {isSignedIn ? (
            <UserButton appearance={{ elements: { avatarBox: "h-9 w-9" } }} />
          ) : null}
        </div>
      </div>
    </header>
  );
}
