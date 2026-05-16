import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { discoverByGenres, genreNameToIdMap, getGenreList, searchMovies, searchPeople, discoverByPerson } from "@/lib/tmdb";

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
      const first = data.results[0];
      if (!first) return NextResponse.json({ results: [], actor: null });
      const movies = await discoverByPerson(first.id);
      return NextResponse.json({ results: movies.results.slice(0, 16), actor: first.name });
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
