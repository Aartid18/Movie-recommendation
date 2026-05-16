
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

async function tmdbFetch<T>(path: string, params?: Record<string, string>): Promise<T | null> {
  const k = keyOrNull();
  if (!k || k === "your_tmdb_key") {
    return null;
  }
  const url = new URL(`${TMDB}${path}`);
  url.searchParams.set("api_key", k);
  if (params) {
    for (const [pk, v] of Object.entries(params)) url.searchParams.set(pk, v);
  }
  try {
    const res = await fetch(url.toString(), { next: { revalidate: 300 } });
    if (!res.ok) return null;
    return res.json() as Promise<T>;
  } catch (error) {
    console.error(`TMDB fetch failed for ${path}:`, error);
    return null;
  }
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
  const data = await tmdbFetch<{ results: TmdbMovieListItem[] }>("/trending/movie/day");
  return data?.results?.slice(0, 20) ?? [];
}

export async function getTopRatedMovies(): Promise<TmdbMovieListItem[]> {
  const data = await tmdbFetch<{ results: TmdbMovieListItem[] }>("/movie/top_rated", { page: "1" });
  return data?.results?.slice(0, 20) ?? [];
}

export async function getMovieDetail(id: number): Promise<MovieDetailPayload | null> {
  const [movie, kwData, videos] = await Promise.all([
    tmdbFetch<TmdbMovieDetail>(`/movie/${id}`),
    tmdbFetch<{ keywords: { id: number; name: string }[] }>(`/movie/${id}/keywords`),
    tmdbFetch<{ results: { key: string; type: string; site: string }[] }>(`/movie/${id}/videos`),
  ]);
  if (!movie) return null;
  const trailerKey =
    videos?.results?.find((v) => v.type === "Trailer" && v.site === "YouTube")?.key ?? null;
  return {
    ...movie,
    keywords: kwData?.keywords ?? [],
    trailerKey,
  };
}

export async function getMovieCredits(id: number) {
  const data = await tmdbFetch<{
    cast: { id: number; name: string; profile_path: string | null; character: string }[];
  }>(`/movie/${id}/credits`);
  return { cast: data?.cast ?? [] };
}

export async function searchMovies(query: string) {
  const data = await tmdbFetch<{ results: TmdbMovieListItem[] }>("/search/movie", {
    query: query.trim(),
    include_adult: "false",
    page: "1",
  });
  return { results: data?.results ?? [] };
}

export async function searchPeople(query: string) {
  const data = await tmdbFetch<{ results: { id: number; name: string; profile_path: string | null }[] }>("/search/person", {
    query: query.trim(),
    include_adult: "false",
    page: "1",
  });
  return { results: data?.results ?? [] };
}

export async function discoverByGenres(genreIds: number[], page = 1) {
  const params: Record<string, string> = {
    page: String(page),
    sort_by: "popularity.desc",
    with_genres: genreIds.join(","),
  };
  const data = await tmdbFetch<{ results: TmdbMovieListItem[] }>("/discover/movie", params);
  return { results: data?.results ?? [] };
}

export async function discoverByPerson(personId: number) {
  const data = await tmdbFetch<{ cast: TmdbMovieListItem[] }>(`/person/${personId}/movie_credits`);
  if (!data?.cast) return { results: [] };
  
  // Deduplicate and sort by popularity
  const seen = new Set<number>();
  const uniqueCast = data.cast.filter(movie => {
    if (seen.has(movie.id)) return false;
    seen.add(movie.id);
    return true;
  });

  const sorted = uniqueCast.sort((a, b) => (b.popularity || 0) - (a.popularity || 0));
  return { results: sorted };
}

export async function getGenreList(): Promise<TmdbGenre[]> {
  const data = await tmdbFetch<{ genres: TmdbGenre[] }>("/genre/movie/list");
  return data?.genres ?? [];
}

export async function getSimilarMovies(id: number) {
  const data = await tmdbFetch<{ results: TmdbMovieListItem[] }>(`/movie/${id}/similar`, { page: "1" });
  return { results: data?.results ?? [] };
}

export function genreNameToIdMap(genres: TmdbGenre[]): Record<string, number> {
  const m: Record<string, number> = {};
  for (const g of genres) {
    m[g.name.toLowerCase()] = g.id;
  }
  return m;
}
