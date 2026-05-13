import { MovieRow } from "@/components/movie-row";
import { getHybridRecommendations, getTrendingForUserGenres } from "@/lib/recommendations/hybrid";
import { getMovieDetail, getTrendingMovies } from "@/lib/tmdb";
import prisma from "@/lib/prisma";
import { ensureUser } from "@/lib/user";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const user = await ensureUser();
  if (!user) return null;

  const [recs, trending, genreTrending, continueRows, watchlistRows] = await Promise.all([
    getHybridRecommendations(user.id, 16),
    getTrendingMovies(),
    getTrendingForUserGenres(user.id, 14),
    prisma.watchEvent.findMany({
      where: { userId: user.id },
      orderBy: { updatedAt: "desc" },
      take: 8,
    }),
    prisma.savedMovie.findMany({
      where: { userId: user.id, kind: "WATCHLIST" },
      orderBy: { createdAt: "desc" },
      take: 12,
    }),
  ]);

  const continueMovies = (
    await Promise.all(continueRows.map((w: { movieTmdbId: number }) => getMovieDetail(w.movieTmdbId)))
  ).filter(Boolean) as NonNullable<Awaited<ReturnType<typeof getMovieDetail>>>[];

  const continueList = continueMovies.map((d) => ({
    id: d.id,
    title: d.title,
    overview: d.overview,
    poster_path: d.poster_path,
    backdrop_path: d.backdrop_path,
    release_date: d.release_date,
    vote_average: d.vote_average,
    popularity: d.popularity,
    genre_ids: d.genres?.map((g) => g.id),
  }));
  const watchlistDetails = (
    await Promise.all(watchlistRows.map((w: { movieTmdbId: number }) => getMovieDetail(w.movieTmdbId)))
  ).filter(Boolean) as NonNullable<Awaited<ReturnType<typeof getMovieDetail>>>[];
  const watchlist = watchlistDetails.map((d) => ({
    id: d.id,
    title: d.title,
    overview: d.overview,
    poster_path: d.poster_path,
    backdrop_path: d.backdrop_path,
    release_date: d.release_date,
    vote_average: d.vote_average,
    popularity: d.popularity,
    genre_ids: d.genres?.map((g) => g.id),
  }));

  const firstRec = recs[0];
  let similarTo: Awaited<ReturnType<typeof import("@/lib/tmdb").getSimilarMovies>>["results"] = [];
  if (firstRec) {
    const sim = await import("@/lib/tmdb").then((m) => m.getSimilarMovies(firstRec.id));
    similarTo = sim.results.slice(0, 14);
  }

  return (
    <div className="pb-16 pt-4">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <h1 className="text-3xl font-bold tracking-tight">Your home</h1>
        <p className="mt-2 max-w-2xl text-sm text-zinc-400">
          Hybrid recommendations blend onboarding taste, content similarity, and collaborative signals as you watch and
          rate more.
        </p>
      </div>
      <MovieRow title="Recommended for you" subtitle="Hybrid collaborative + content scores" movies={recs} showReason />
      <MovieRow title="Continue watching" movies={continueList} />
      <MovieRow title="Your watchlist" movies={watchlist} />
      <MovieRow title="Trending now" movies={trending} />
      <MovieRow title="Trending in your genres" movies={genreTrending} />
      <MovieRow title={`Similar to ${firstRec?.title ?? "your top pick"}`} movies={similarTo} />
    </div>
  );
}
