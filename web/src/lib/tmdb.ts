import { cacheGet, cacheSet } from "./cache";

const TMDB = "https://api.themoviedb.org/3";
const IMG = "https://image.tmdb.org/t/p";

export type TmdbGenre = { id: number; name: string };
export type TmdbMovieListItem = {
  id: number;
  title: string;
  overview: string;
  poster_path: string | null;
  backdrop_path: string | null;
  release_date?: string;
  vote_average?: number;
  popularity?: number;
  genre_ids?: number[];
};

export type TmdbMovieDetail = TmdbMovieListItem & {
  genres: TmdbGenre[];
  tagline?: string;
  runtime?: number;
};

export type MovieDetailPayload = TmdbMovieDetail & {
  keywords: { id: number; name: string }[];
  trailerKey: string | null;
};

function keyOrNull() {
  return process.env.TMDB_API_KEY ?? null;
}

async function tmdbFetch<T>(path: string, params?: Record<string, string>): Promise<T> {
  const k = keyOrNull();
  if (!k) throw new Error("TMDB_API_KEY is not set");
  const url = new URL(`${TMDB}${path}`);
  url.searchParams.set("api_key", k);
  if (params) {
    for (const [pk, v] of Object.entries(params)) url.searchParams.set(pk, v);
  }
  const res = await fetch(url.toString(), { next: { revalidate: 300 } });
  if (!res.ok) throw new Error(`TMDB ${path}: ${res.status}`);
  return res.json() as Promise<T>;
}

export function posterUrl(path: string | null | undefined, size: "w342" | "w780" | "original" = "w342") {
  if (!path) return "/placeholder-poster.svg";
  return `${IMG}/${size}${path}`;
}

export function backdropUrl(path: string | null | undefined) {
  if (!path) return null;
  return `${IMG}/w1280${path}`;
}

export async function getTrendingMovies(): Promise<TmdbMovieListItem[]> {
  if (!keyOrNull()) return [];
  const cacheKey = "tmdb:trending:day";
  const hit = await cacheGet<TmdbMovieListItem[]>(cacheKey);
  if (hit) return hit;
  const data = await tmdbFetch<{ results: TmdbMovieListItem[] }>("/trending/movie/day");
  const results = data.results.slice(0, 20);
  await cacheSet(cacheKey, results, 900);
  return results;
}

export async function getTopRatedMovies(): Promise<TmdbMovieListItem[]> {
  if (!keyOrNull()) return [];
  const cacheKey = "tmdb:top_rated";
  const hit = await cacheGet<TmdbMovieListItem[]>(cacheKey);
  if (hit) return hit;
  const data = await tmdbFetch<{ results: TmdbMovieListItem[] }>("/movie/top_rated", { page: "1" });
  const results = data.results.slice(0, 20);
  await cacheSet(cacheKey, results, 3600);
  return results;
}

export async function getMovieDetail(id: number): Promise<MovieDetailPayload | null> {
  if (!keyOrNull()) return null;
  const cacheKey = `tmdb:movie:${id}:v2`;
  const hit = await cacheGet<MovieDetailPayload>(cacheKey);
  if (hit) return hit;
  const [movie, kwData, videos] = await Promise.all([
    tmdbFetch<TmdbMovieDetail>(`/movie/${id}`),
    tmdbFetch<{ keywords: { id: number; name: string }[] }>(`/movie/${id}/keywords`),
    tmdbFetch<{ results: { key: string; type: string; site: string }[] }>(`/movie/${id}/videos`),
  ]);
  const trailerKey =
    videos.results.find((v) => v.type === "Trailer" && v.site === "YouTube")?.key ?? null;
  const payload: MovieDetailPayload = {
    ...movie,
    keywords: kwData.keywords ?? [],
    trailerKey,
  };
  await cacheSet(cacheKey, payload, 1800);
  return payload;
}

export async function getMovieCredits(id: number) {
  if (!keyOrNull()) return { cast: [] as { id: number; name: string; profile_path: string | null; character: string }[] };
  return tmdbFetch<{
    cast: { id: number; name: string; profile_path: string | null; character: string }[];
  }>(`/movie/${id}/credits`);
}

export async function searchMovies(query: string) {
  if (!keyOrNull() || !query.trim()) return { results: [] as TmdbMovieListItem[] };
  return tmdbFetch<{ results: TmdbMovieListItem[] }>("/search/movie", {
    query: query.trim(),
    include_adult: "false",
    page: "1",
  });
}

export async function searchPeople(query: string) {
  if (!keyOrNull() || !query.trim()) return { results: [] as { id: number; name: string; profile_path: string | null }[] };
  return tmdbFetch<{ results: { id: number; name: string; profile_path: string | null }[] }>("/search/person", {
    query: query.trim(),
    include_adult: "false",
    page: "1",
  });
}

export async function discoverByGenres(genreIds: number[], page = 1) {
  if (!keyOrNull() || !genreIds.length) return { results: [] as TmdbMovieListItem[] };
  const params: Record<string, string> = {
    page: String(page),
    sort_by: "popularity.desc",
    with_genres: genreIds.join(","),
  };
  return tmdbFetch<{ results: TmdbMovieListItem[] }>("/discover/movie", params);
}

export async function getGenreList(): Promise<TmdbGenre[]> {
  if (!keyOrNull()) return [];
  const cacheKey = "tmdb:genres";
  const hit = await cacheGet<TmdbGenre[]>(cacheKey);
  if (hit) return hit;
  const data = await tmdbFetch<{ genres: TmdbGenre[] }>("/genre/movie/list");
  await cacheSet(cacheKey, data.genres, 86400);
  return data.genres;
}

export async function getSimilarMovies(id: number) {
  if (!keyOrNull()) return { results: [] as TmdbMovieListItem[] };
  return tmdbFetch<{ results: TmdbMovieListItem[] }>(`/movie/${id}/similar`, { page: "1" });
}

export function genreNameToIdMap(genres: TmdbGenre[]): Record<string, number> {
  const m: Record<string, number> = {};
  for (const g of genres) {
    m[g.name.toLowerCase()] = g.id;
  }
  return m;
}
