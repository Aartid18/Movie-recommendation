import prisma from "@/lib/prisma";
import type { MovieDetailPayload, TmdbMovieListItem } from "@/lib/tmdb";
import {
  discoverByGenres,
  genreNameToIdMap,
  getGenreList,
  getMovieDetail,
  getTrendingMovies,
} from "@/lib/tmdb";

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((w) => w.length > 1);
}

function bag(tokens: string[]): Map<string, number> {
  const m = new Map<string, number>();
  for (const t of tokens) m.set(t, (m.get(t) ?? 0) + 1);
  return m;
}

function cosineSim(a: Map<string, number>, b: Map<string, number>): number {
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (const v of a.values()) na += v * v;
  for (const v of b.values()) nb += v * v;
  for (const k of new Set([...a.keys(), ...b.keys()])) {
    dot += (a.get(k) ?? 0) * (b.get(k) ?? 0);
  }
  const denom = Math.sqrt(na) * Math.sqrt(nb);
  return denom === 0 ? 0 : dot / denom;
}

function movieText(m: TmdbMovieListItem | MovieDetailPayload): string {
  const genres =
    "genres" in m && Array.isArray(m.genres)
      ? m.genres.map((g) => g.name).join(" ")
      : "";
  return `${m.title} ${m.overview ?? ""} ${genres}`.slice(0, 8000);
}

export async function contentScoresForUser(
  userId: string,
  candidates: TmdbMovieListItem[],
): Promise<Map<number, { score: number; reason: string }>> {
  const prefs = await prisma.userPreference.findUnique({ where: { userId } });
  const parts: string[] = [];
  if (prefs) {
    parts.push(prefs.genres.join(" "), prefs.moodSlugs.join(" "), prefs.languages.join(" "));
    parts.push(prefs.actorNames.join(" "));
    for (const id of prefs.seedTmdbIds.slice(0, 5)) {
      const d = await getMovieDetail(id);
      if (d) {
        parts.push(movieText(d), ...(d.keywords ?? []).map((k) => k.name));
      }
    }
  }
  const profileVec = bag(tokenize(parts.join(" ")));
  const out = new Map<number, { score: number; reason: string }>();
  for (const c of candidates) {
    const mv = bag(tokenize(movieText(c)));
    const score = cosineSim(profileVec, mv);
    const reasonParts: string[] = [];
    if (prefs?.genres.length) reasonParts.push(`your genres (${prefs.genres.slice(0, 2).join(", ")})`);
    if (prefs?.moodSlugs.length) reasonParts.push("moods you selected");
    out.set(c.id, {
      score,
      reason:
        reasonParts.length > 0
          ? `Content match for ${reasonParts.join(" and ")} — close tone and themes.`
          : "Content-based match to movies you saved during onboarding.",
    });
  }
  return out;
}

export async function candidatePoolForUser(userId: string): Promise<TmdbMovieListItem[]> {
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
  if (!ids.length) return getTrendingMovies();
  const { results } = await discoverByGenres(ids.slice(0, 3), 1);
  return results.slice(0, 60);
}
