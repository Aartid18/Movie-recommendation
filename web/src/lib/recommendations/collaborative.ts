import prisma from "@/lib/prisma";

type Sparse = Map<number, number>;

function cosineUserVectors(a: Sparse, b: Sparse): number {
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (const v of a.values()) na += v * v;
  for (const v of b.values()) nb += v * v;
  for (const [movieId, va] of a) {
    const vb = b.get(movieId);
    if (vb !== undefined) dot += va * vb;
  }
  const denom = Math.sqrt(na) * Math.sqrt(nb);
  return denom === 0 ? 0 : dot / denom;
}

async function userVector(userId: string): Promise<Sparse> {
  const vec = new Map<number, number>();
  const [ratings, likes, watches] = await Promise.all([
    prisma.rating.findMany({ where: { userId } }),
    prisma.savedMovie.findMany({ where: { userId, kind: "LIKE" } }),
    prisma.watchEvent.findMany({ where: { userId } }),
  ]);
  for (const r of ratings) vec.set(r.movieTmdbId, (vec.get(r.movieTmdbId) ?? 0) + r.value / 5);
  for (const l of likes) vec.set(l.movieTmdbId, (vec.get(l.movieTmdbId) ?? 0) + 1);
  for (const w of watches) vec.set(w.movieTmdbId, (vec.get(w.movieTmdbId) ?? 0) + 0.35);
  return vec;
}

export async function collaborativeRecommendations(
  userId: string,
  excludeIds: Set<number>,
  limit = 24,
): Promise<{ movieTmdbId: number; score: number; reason: string }[]> {
  const mine = await userVector(userId);
  if (mine.size === 0) return [];

  const myMovies = [...mine.keys()];
  const neighbors = await prisma.rating.findMany({
    where: {
      movieTmdbId: { in: myMovies },
      userId: { not: userId },
    },
    select: { userId: true },
    distinct: ["userId"],
    take: 80,
  });

  const neighborIds = [...new Set(neighbors.map((n) => n.userId))];
  if (!neighborIds.length) return [];

  const neighborRatings = await prisma.rating.findMany({
    where: { userId: { in: neighborIds } },
  });
  const neighborLikes = await prisma.savedMovie.findMany({
    where: { userId: { in: neighborIds }, kind: "LIKE" },
  });

  const neighborVectors = new Map<string, Sparse>();
  for (const r of neighborRatings) {
    if (!neighborVectors.has(r.userId)) neighborVectors.set(r.userId, new Map());
    const m = neighborVectors.get(r.userId)!;
    m.set(r.movieTmdbId, (m.get(r.movieTmdbId) ?? 0) + r.value / 5);
  }
  for (const l of neighborLikes) {
    if (!neighborVectors.has(l.userId)) neighborVectors.set(l.userId, new Map());
    neighborVectors.get(l.userId)!.set(l.movieTmdbId, (neighborVectors.get(l.userId)!.get(l.movieTmdbId) ?? 0) + 1);
  }

  const sims: { id: string; sim: number }[] = [];
  for (const [nid, vec] of neighborVectors) {
    const sim = cosineUserVectors(mine, vec);
    if (sim > 0.05) sims.push({ id: nid, sim });
  }
  sims.sort((a, b) => b.sim - a.sim);
  const topNeighbors = sims.slice(0, 12);

  const scores = new Map<number, number>();
  const fromUser = new Map<number, string>();
  for (const { id: nid, sim } of topNeighbors) {
    const vec = neighborVectors.get(nid);
    if (!vec) continue;
    for (const [movieId, val] of vec) {
      if (mine.has(movieId) || excludeIds.has(movieId)) continue;
      scores.set(movieId, (scores.get(movieId) ?? 0) + val * sim);
      if (!fromUser.has(movieId)) fromUser.set(movieId, nid);
    }
  }

  const ranked = [...scores.entries()].sort((a, b) => b[1] - a[1]).slice(0, limit);
  const topRatedMine = await prisma.rating.findMany({
    where: { userId, value: { gte: 4 } },
    take: 2,
    orderBy: { value: "desc" },
  });
  const anchorTitle =
    topRatedMine.length > 0
      ? (await prisma.cachedMovie.findUnique({ where: { tmdbId: topRatedMine[0].movieTmdbId } }))?.title ??
        "films you rated highly"
      : "taste profile";

  return ranked.map(([movieTmdbId, score]) => ({
    movieTmdbId,
    score,
    reason: `Users with similar taste to you also engaged with this title — aligned with ${anchorTitle}.`,
  }));
}
