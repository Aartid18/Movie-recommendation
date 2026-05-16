import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { discoverByGenres, genreNameToIdMap, getGenreList, searchMovies, searchPeople, discoverByPerson } from "@/lib/tmdb";
import type { TmdbMovieListItem } from "@/lib/tmdb";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q") ?? "";
  const type = searchParams.get("type") ?? "movie";
  if (q.length < 2) return NextResponse.json({ results: [] });
  try {
    if (type === "actor") {
      const data = await searchPeople(q);
      const topActors = data.results.slice(0, 3);
      if (topActors.length === 0) return NextResponse.json({ results: [], actor: null });
      
      console.log(`[Search] Query: "${q}" -> Found ${topActors.length} matching actors:`, topActors.map(a => a.name).join(", "));
      
      const allMovies: TmdbMovieListItem[] = [];
      const seenMovieIds = new Set();
      
      // Fetch movies for top matching actors
      for (const actor of topActors) {
        const movies = await discoverByPerson(actor.id);
        for (const movie of movies.results) {
          if (!seenMovieIds.has(movie.id)) {
            seenMovieIds.add(movie.id);
            allMovies.push(movie);
          }
        }
      }
      
      // Sort combined movies by popularity
      allMovies.sort((a, b) => (b.popularity || 0) - (a.popularity || 0));
      
      const primaryActorName = topActors[0].name;
      const titleName = topActors.length > 1 ? `${primaryActorName} & others` : primaryActorName;
      
      console.log(`[Search] Returning ${allMovies.slice(0, 16).length} movies for cast match.`);
      return NextResponse.json({ results: allMovies.slice(0, 16), actor: titleName });
    }
    if (type === "person") {
      const data = await searchPeople(q);
      return NextResponse.json({ results: data.results.slice(0, 8) });
    }
    if (type === "genre") {
      const genres = await getGenreList();
      const map = genreNameToIdMap(genres);
      const match = genres.find((g) => g.name.toLowerCase().includes(q.toLowerCase()));
      if (!match) return NextResponse.json({ results: [] });
      const id = map[match.name.toLowerCase()];
      if (!id) return NextResponse.json({ results: [] });
      const data = await discoverByGenres([id], 1);
      return NextResponse.json({ results: data.results.slice(0, 16), genre: match.name });
    }
    const data = await searchMovies(q);
    return NextResponse.json({ results: data.results.slice(0, 12) });
  } catch {
    return NextResponse.json({ error: "Search failed" }, { status: 500 });
  }
}
