"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

export function WatchlistButton({
  movieTmdbId,
  variant = "default",
  className,
}: {
  movieTmdbId: number;
  variant?: "default" | "outline" | "ghost" | "link";
  className?: string;
}) {
  const [pending, setPending] = useState(false);

  const sendAction = async () => {
    setPending(true);
    try {
      const res = await fetch("/api/interactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ movieTmdbId, action: "WATCHLIST" }),
      });
      if (!res.ok) {
        alert("Failed to add to watchlist.");
      } else {
        alert("Added to watchlist!");
      }
    } catch {
      alert("An error occurred.");
    } finally {
      setPending(false);
    }
  };

  return (
    <Button disabled={pending} variant={variant} className={className} onClick={sendAction}>
      {pending ? "Adding..." : "+ Add to Watchlist"}
    </Button>
  );
}
