import Image from "next/image";
import { notFound } from "next/navigation";
import { MovieRow } from "@/components/movie-row";
import { MovieActions } from "@/components/movie-actions";
import { recommendationReason } from "@/lib/recommendations/explain";
import { ensureUser } from "@/lib/user";
import { getMovieCredits, getMovieDetail, getSimilarMovies, posterUrl } from "@/lib/tmdb";
import { Button } from "@/components/ui/button";
import { WatchlistButton } from "@/components/watchlist-button";

export default async function MoviePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const movieId = parseInt(id);
  const user = await ensureUser();
  const [detail, credits, similar] = await Promise.all([
    getMovieDetail(movieId),
    getMovieCredits(movieId),
    getSimilarMovies(movieId),
  ]);
  if (!detail) return notFound();
  const reason = user ? await recommendationReason(user.id, movieId) : "Sign in to get personalized recommendation reasons.";

  return (
    <div className="min-h-screen bg-background text-zinc-100">
      {/* Backdrop Header */}
      <div className="relative h-[60vh] w-full max-h-[600px] overflow-hidden">
        {detail.backdrop_path ? (
          <Image
            src={posterUrl(detail.backdrop_path, "original")}
            alt={detail.title}
            fill
            className="object-cover opacity-50"
            priority
          />
        ) : (
          <div className="absolute inset-0 bg-zinc-900" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-background via-background/80 to-transparent" />
        
        <div className="absolute bottom-0 left-0 w-full p-8 md:p-16 flex flex-col md:flex-row gap-8 items-end">
          <div className="shrink-0 hidden md:block relative h-72 w-48 rounded-xl overflow-hidden shadow-2xl border border-white/10">
             <Image
              src={posterUrl(detail.poster_path, "w780")}
              alt={detail.title}
              fill
              className="object-cover"
            />
          </div>
          <div className="max-w-3xl mb-4">
            <h1 className="text-4xl md:text-6xl font-bold mb-2 tracking-tight">{detail.title}</h1>
            <div className="flex items-center gap-4 text-sm text-amber-400 mb-4 font-medium">
               <span>★ {detail.vote_average?.toFixed(1)} / 10</span>
               <span className="text-zinc-400">&bull;</span>
               <span className="text-zinc-300">{detail.release_date?.substring(0, 4)}</span>
               {detail.genres && detail.genres.length > 0 && (
                 <>
                   <span className="text-zinc-400">&bull;</span>
                   <span className="text-zinc-300">{detail.genres.map(g => g.name).join(", ")}</span>
                 </>
               )}
            </div>
            <p className="text-lg text-zinc-300 leading-relaxed mb-6 line-clamp-4 md:line-clamp-none">{detail.overview}</p>
            <div className="flex gap-4">
               <Button className="bg-white text-black hover:bg-zinc-200" asChild>
                 <a href="#trailer">Play Trailer</a>
               </Button>
               <WatchlistButton 
                 movieTmdbId={detail.id}
                 variant="outline" 
                 className="bg-white/5 border-white/20 text-white hover:bg-white/10" 
               />
            </div>
          </div>
        </div>
      </div>

      <div className="p-8 md:p-16 max-w-7xl mx-auto">
        <div className="glass p-6 rounded-2xl border-l-4 border-l-accent">
           <h2 className="text-xl font-bold mb-2 flex items-center gap-2">
             <span className="bg-accent text-white text-xs px-2 py-1 rounded">AI Insight</span>
             Why you might like this
           </h2>
           <p className="text-zinc-400">{reason}</p>
        </div>

        {detail.trailerKey ? (
          <div className="mt-8" id="trailer">
            <h2 className="mb-3 text-xl font-semibold">Trailer</h2>
            <div className="aspect-video overflow-hidden rounded-xl border border-white/10">
              <iframe
                className="h-full w-full"
                src={`https://www.youtube.com/embed/${detail.trailerKey}`}
                title={`${detail.title} trailer`}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          </div>
        ) : null}

        {credits.cast?.length ? (
          <div className="mt-8">
            <h2 className="mb-3 text-xl font-semibold">Cast</h2>
            <div className="flex flex-wrap gap-2">
              {credits.cast.slice(0, 14).map((c) => (
                <span key={c.id} className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-zinc-300">
                  {c.name}
                </span>
              ))}
            </div>
          </div>
        ) : null}

        <div className="mt-8">
          <MovieActions movieTmdbId={detail.id} />
        </div>
      </div>
      <MovieRow title="Similar titles" movies={similar.results.slice(0, 14)} />
    </div>
  );
}
