"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { posterUrl } from "@/lib/tmdb";
import type { TmdbMovieListItem } from "@/lib/tmdb";
import { cn } from "@/lib/utils";

type Props = {
  movie: TmdbMovieListItem & { reason?: string };
  className?: string;
  showReason?: boolean;
};

export function MovieCard({ movie, className, showReason }: Props) {
  return (
    <motion.div whileHover={{ y: -6, scale: 1.02 }} transition={{ type: "spring", stiffness: 320, damping: 22 }}>
      <Link href={`/movie/${movie.id}`} className={cn("group block w-[180px] shrink-0", className)}>
        <div className="relative aspect-[2/3] overflow-hidden rounded-xl border border-white/10 bg-zinc-900 shadow-xl shadow-black/40">
          <Image
            src={posterUrl(movie.poster_path, "w342")}
            alt={movie.title}
            fill
            className="object-cover transition duration-500 group-hover:scale-105"
            sizes="180px"
          />
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent opacity-90" />
          <div className="absolute bottom-0 left-0 right-0 p-3">
            <p className="line-clamp-2 text-sm font-semibold leading-tight text-white drop-shadow">{movie.title}</p>
            {movie.vote_average ? (
              <p className="mt-1 text-xs text-amber-300">★ {movie.vote_average.toFixed(1)}</p>
            ) : null}
          </div>
        </div>
        {showReason && movie.reason ? (
          <p className="mt-2 line-clamp-3 text-xs text-zinc-400">{movie.reason}</p>
        ) : null}
      </Link>
    </motion.div>
  );
}
