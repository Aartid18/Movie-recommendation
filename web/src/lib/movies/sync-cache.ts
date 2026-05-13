import prisma from "@/lib/prisma";
import type { MovieDetailPayload } from "@/lib/tmdb";

export async function upsertCachedMovieFromTmdb(
  detail: MovieDetailPayload,
  cast?: { id: number; name: string; profile_path: string | null; character: string }[],
) {
  await prisma.cachedMovie.upsert({
    where: { tmdbId: detail.id },
    create: {
      tmdbId: detail.id,
      title: detail.title,
      overview: detail.overview,
      posterPath: detail.poster_path,
      backdropPath: detail.backdrop_path,
      releaseDate: detail.release_date ?? null,
      voteAverage: detail.vote_average ?? null,
      popularity: detail.popularity ?? null,
      genresJson: detail.genres ?? [],
      keywordsJson: detail.keywords ?? [],
      castJson: cast?.slice(0, 12) ?? [],
      videoKey: detail.trailerKey,
      tagline: detail.tagline ?? null,
      runtime: detail.runtime ?? null,
    },
    update: {
      title: detail.title,
      overview: detail.overview,
      posterPath: detail.poster_path,
      backdropPath: detail.backdrop_path,
      releaseDate: detail.release_date ?? null,
      voteAverage: detail.vote_average ?? null,
      popularity: detail.popularity ?? null,
      genresJson: detail.genres ?? [],
      keywordsJson: detail.keywords ?? [],
      castJson: cast?.slice(0, 12) ?? [],
      videoKey: detail.trailerKey,
      tagline: detail.tagline ?? null,
      runtime: detail.runtime ?? null,
    },
  });
}
