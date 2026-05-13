import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { MovieRow } from "@/components/movie-row";
import { Button } from "@/components/ui/button";
import { getTopRatedMovies, getTrendingMovies } from "@/lib/tmdb";
import { getGenreList } from "@/lib/tmdb";
import Image from "next/image";

export const dynamic = "force-dynamic";

export default async function LandingPage() {
  const { userId } = await auth();
  const [trending, topRated, genres] = await Promise.all([
    getTrendingMovies(),
    getTopRatedMovies(),
    getGenreList(),
  ]);
  const hero = trending[0];

  return (
    <div className="min-h-screen text-zinc-100">
      <header className="absolute inset-x-0 top-0 z-20 flex items-center justify-between px-4 py-4 sm:px-8">
        <span className="text-lg font-semibold tracking-tight">
          <span className="bg-gradient-to-r from-rose-400 to-violet-400 bg-clip-text text-transparent">CineMind</span>
        </span>
        <div className="flex gap-2">
          {userId ? (
            <Link href="/dashboard">
              <Button size="sm">Dashboard</Button>
            </Link>
          ) : (
            <>
              <Link href="/sign-in">
                <Button variant="ghost" size="sm">
                  Sign in
                </Button>
              </Link>
              <Link href="/sign-up">
                <Button size="sm">Get started</Button>
              </Link>
            </>
          )}
        </div>
      </header>

      <section className="relative h-[78vh] min-h-[420px] overflow-hidden">
        {hero?.backdrop_path ? (
          <Image
            src={`https://image.tmdb.org/t/p/w1280${hero.backdrop_path}`}
            alt=""
            fill
            className="object-cover opacity-60"
            priority
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-violet-900/40 to-rose-900/30" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-[#050508] via-[#050508]/70 to-transparent" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(139,92,246,0.35),transparent_55%)]" />
        <div className="relative z-10 mx-auto flex h-full max-w-5xl flex-col justify-end px-4 pb-20 sm:px-6">
          <div className="hero-animate">
            <p className="mb-2 text-xs font-medium uppercase tracking-[0.25em] text-rose-300/90">Hybrid AI recommendations</p>
            <h1 className="max-w-3xl text-4xl font-bold leading-tight tracking-tight sm:text-6xl">
              Your next obsession, <span className="text-transparent bg-gradient-to-r from-rose-300 to-violet-300 bg-clip-text">engineered</span> for your taste.
            </h1>
            <p className="mt-4 max-w-xl text-sm text-zinc-300 sm:text-base">
              Collaborative filtering meets content intelligence — cold-start onboarding, mood-aware picks, and cinematic
              discovery powered by TMDB.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href={userId ? "/dashboard" : "/sign-up"}>
                <Button size="lg">{userId ? "Open dashboard" : "Start free"}</Button>
              </Link>
              <Link href="/sign-in">
                <Button variant="outline" size="lg" className="border-white/20 bg-black/30 text-white hover:bg-white/10">
                  I have an account
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      <MovieRow title="Trending now" subtitle="Updated daily from TMDB" movies={trending.slice(1)} />
      <MovieRow title="Top rated" movies={topRated} />

      <section className="border-t border-white/10 py-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <h2 className="mb-4 text-xl font-semibold">Browse genres</h2>
          <div className="flex flex-wrap gap-2">
            {genres.slice(0, 16).map((g) => (
              <span
                key={g.id}
                className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-zinc-300 backdrop-blur"
              >
                {g.name}
              </span>
            ))}
          </div>
        </div>
      </section>

      <footer className="border-t border-white/10 py-10 text-center text-xs text-zinc-500">
        Data provided by TMDB · Built with Next.js, Clerk, Prisma & hybrid ranking
      </footer>
    </div>
  );
}
