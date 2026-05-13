import prisma from "@/lib/prisma";
import { getMovieDetail } from "@/lib/tmdb";

function overlap(a: string[], b: string[]): string[] {
  const bSet = new Set(b.map((x) => x.toLowerCase()));
  return a.filter((x) => bSet.has(x.toLowerCase()));
}

export async function recommendationReason(userId: string, movieTmdbId: number): Promise<string> {
  const [prefs, detail, topRated] = await Promise.all([
    prisma.userPreference.findUnique({ where: { userId } }),
    getMovieDetail(movieTmdbId),
    prisma.rating.findMany({
      where: { userId, value: { gte: 4 } },
      orderBy: { value: "desc" },
      take: 3,
    }),
  ]);

  if (!detail) return "Recommended from your recent activity and taste profile.";

  const movieGenres = detail.genres?.map((g) => g.name) ?? [];
  const likedTitles = await Promise.all(
    topRated.map(async (r) => {
      const m = await prisma.cachedMovie.findUnique({ where: { tmdbId: r.movieTmdbId } });
      return m?.title ?? null;
    }),
  );

  const reasons: string[] = [];
  const genreMatches = prefs ? overlap(movieGenres, prefs.genres) : [];
  if (genreMatches.length) {
    reasons.push(`it matches your genre taste (${genreMatches.slice(0, 2).join(", ")})`);
  }
  if (prefs?.moodSlugs.length) {
    reasons.push(`the tone aligns with your selected moods`);
  }
  const titleAnchors = likedTitles.filter(Boolean).slice(0, 2) as string[];
  if (titleAnchors.length) {
    reasons.push(`you rated similar titles highly (${titleAnchors.join(" and ")})`);
  }

  if (!reasons.length) return "Recommended based on popularity and your profile signals.";
  return `Recommended because ${reasons.join(", ")}.`;
}
