"use client";

import { useEffect, useState } from "react";
import { MovieRow } from "@/components/movie-row";
import type { TmdbMovieListItem } from "@/lib/tmdb";
import { Button } from "@/components/ui/button";

type Tab = "movie" | "actor" | "genre";

export default function SearchPage() {
  const [tab, setTab] = useState<Tab>("movie");
  const [query, setQuery] = useState("");
  const [items, setItems] = useState<TmdbMovieListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [metaTitle, setMetaTitle] = useState("Results");

  useEffect(() => {
    const timer = window.setTimeout(async () => {
      if (query.trim().length < 2) {
        setItems([]);
        return;
      }
      setLoading(true);
      try {
        const type = tab === "genre" ? "genre" : tab === "actor" ? "actor" : "movie";
        const res = await fetch(`/api/search?type=${type}&q=${encodeURIComponent(query.trim())}`);
        const data = await res.json();
        
        if (tab === "actor" && !data.actor) {
          setItems([]);
          setMetaTitle("No actor found");
          return;
        }

        setItems(data.results ?? []);
        
        if (tab === "actor") {
          setMetaTitle(`Movies with ${data.actor}`);
        } else if (tab === "genre") {
          setMetaTitle(`Genre: ${data.genre ?? query}`);
        } else {
          setMetaTitle(`Results for "${query}"`);
        }
      } finally {
        setLoading(false);
      }
    }, 350);
    return () => window.clearTimeout(timer);
  }, [query, tab]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <h1 className="text-3xl font-bold tracking-tight">Search</h1>
      <p className="mt-2 text-sm text-zinc-400">Smart discovery by movie title, actor, or genre.</p>

      <div className="mt-5 flex flex-wrap gap-2">
        <Button variant={tab === "movie" ? "default" : "outline"} onClick={() => setTab("movie")}>
          Movies
        </Button>
        <Button variant={tab === "actor" ? "default" : "outline"} onClick={() => setTab("actor")}>
          Actors
        </Button>
        <Button variant={tab === "genre" ? "default" : "outline"} onClick={() => setTab("genre")}>
          Genres
        </Button>
      </div>

      <div className="mt-4">
        <input
          className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm outline-none focus:border-violet-400"
          placeholder={`Search by ${tab}...`}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      {loading ? <p className="mt-3 text-sm text-zinc-400">Searching...</p> : null}
      {items.length > 0 ? <MovieRow title={metaTitle} movies={items} /> : null}
      {!loading && query.trim().length >= 2 && items.length === 0 ? (
        <p className="mt-6 text-sm text-zinc-400">No results found.</p>
      ) : null}
    </div>
  );
}
