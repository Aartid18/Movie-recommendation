"use client";

import { motion } from "framer-motion";
import { MovieCard } from "@/components/movie-card";
import type { TmdbMovieListItem } from "@/lib/tmdb";

type Props = {
  title: string;
  subtitle?: string;
  movies: (TmdbMovieListItem & { reason?: string })[];
  showReason?: boolean;
};

export function MovieRow({ title, subtitle, movies, showReason }: Props) {
  if (!movies.length) return null;
  return (
    <section className="py-8">
      <div className="mb-4 flex flex-col gap-1 px-4 sm:px-6">
        <h2 className="text-xl font-semibold tracking-tight sm:text-2xl">{title}</h2>
        {subtitle ? <p className="text-sm text-zinc-400">{subtitle}</p> : null}
      </div>
      <div className="scrollbar-hide flex gap-4 overflow-x-auto px-4 pb-2 sm:px-6">
        {movies.map((m, i) => (
          <motion.div
            key={m.id}
            initial={{ opacity: 0, x: 24 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-40px" }}
            transition={{ delay: i * 0.04, duration: 0.35 }}
          >
            <MovieCard movie={m} showReason={showReason} />
          </motion.div>
        ))}
      </div>
    </section>
  );
}
