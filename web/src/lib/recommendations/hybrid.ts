import prisma from "@/lib/prisma";
import { collaborativeRecommendations } from "@/lib/recommendations/collaborative";
import { candidatePoolForUser, contentScoresForUser } from "@/lib/recommendations/content-based";
import type { TmdbMovieListItem } from "@/lib/tmdb";
import {
  discoverByGenres,
  genreNameToIdMap,
  getGenreList,
  getMovieDetail,
  getTrendingMovies,
} from "@/lib/tmdb";

export type HybridRec = TmdbMovieListItem & {
  score: number;
  reason: string;
};

async function interactionCount(userId: string): Promise<number> {
  const [a, b, c] = await Promise.all([
    prisma.rating.count({ where: { userId } }),
    prisma.watchEvent.count({ where: { userId } }),
    prisma.savedMovie.count({ where: { userId, kind: "LIKE" } }),
  ]);
  return a + b + c;
}

export async function getHybridRecommendations(userId: string, limit = 18): Promise<HybridRec[]> {
  try {
    const res = await fetch("http://127.0.0.1:5000/api/recommend/hybrid", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, limit }),
      cache: "no-store",
    });

    if (res.ok) {
      const data = await res.json();
      const apiRecs = data.recommendations || [];
      
      const fullRecs: HybridRec[] = [];
      for (const rec of apiRecs) {
        const detail = await getMovieDetail(rec.id);
        if (detail) {
          fullRecs.push({
            id: detail.id,
            title: detail.title,
            overview: detail.overview,
            poster_path: detail.poster_path,
            backdrop_path: detail.backdrop_path,
            release_date: detail.release_date,
            vote_average: detail.vote_average,
            popularity: detail.popularity,
            genre_ids: detail.genres?.map((g) => g.id),
            score: rec.score,
            reason: rec.reason,
          });
        }
      }
      
      if (fullRecs.length > 0) {
        return fullRecs;
      }
    }
  } catch (error) {
    console.error("Failed to fetch from Flask recommendation engine:", error);
  }

  // TypeScript fallback when Python service is unavailable.
  const count = await interactionCount(userId);
  const collaborativeWeight = count < 8 ? 0.25 : count < 20 ? 0.55 : 0.72;
  const contentWeight = 1 - collaborativeWeight;
  const candidates = await candidatePoolForUser(userId);
  const content = await contentScoresForUser(userId, candidates);
  const collab = await collaborativeRecommendations(userId, new Set<number>(), limit * 3);
  const collabMap = new Map<number, { score: number; reason: string }>();
  for (const c of collab) collabMap.set(c.movieTmdbId, { score: c.score, reason: c.reason });

  const scored: HybridRec[] = candidates.map((movie) => {
    const c = content.get(movie.id);
    const k = collabMap.get(movie.id);
    const score = (k?.score ?? 0) * collaborativeWeight + (c?.score ?? 0) * contentWeight;
    const reason = count < 5 ? (c?.reason ?? "Based on onboarding preferences.") : (k?.reason ?? c?.reason ?? "Hybrid match.");
    return { ...movie, score, reason };
  });

  return scored.sort((a, b) => b.score - a.score).slice(0, limit);
}

export async function getTrendingForUserGenres(userId: string, take = 12): Promise<TmdbMovieListItem[]> {
  const prefs = await prisma.userPreference.findUnique({ where: { userId } });
  const genres = await getGenreList();
  const map = genreNameToIdMap(genres);
  const ids: number[] = [];
  if (prefs) {
    for (const g of prefs.genres) {
      const id = map[g.toLowerCase()];
      if (id) ids.push(id);
    }
  }
  if (!ids.length) return (await getTrendingMovies()).slice(0, take);
  const { results } = await discoverByGenres(ids.slice(0, 2), 1);
  return results.slice(0, take);
}
