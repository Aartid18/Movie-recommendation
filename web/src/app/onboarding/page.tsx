"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

const GENRES = ["Action", "Thriller", "Comedy", "Horror", "Sci-Fi", "Romance", "Anime", "Adventure", "Crime", "Mystery"];
const MOODS = ["Mind-bending", "Emotional", "Dark", "Motivational", "Feel-good", "Family", "Suspense"];
const LANGUAGES = ["English", "Hindi", "Korean", "Japanese", "Tamil"];

type SearchMovie = {
  id: number;
  title: string;
  release_date?: string;
};

type SearchPerson = {
  id: number;
  name: string;
};

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
  const [selectedMoods, setSelectedMoods] = useState<string[]>([]);
  const [selectedLanguages, setSelectedLanguages] = useState<string[]>([]);
  const [selectedActors, setSelectedActors] = useState<string[]>([]);
  const [selectedMovies, setSelectedMovies] = useState<SearchMovie[]>([]);
  const [actorQuery, setActorQuery] = useState("");
  const [movieQuery, setMovieQuery] = useState("");
  const [actorResults, setActorResults] = useState<SearchPerson[]>([]);
  const [movieResults, setMovieResults] = useState<SearchMovie[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const toggleSelection = (
    item: string,
    list: string[],
    setList: React.Dispatch<React.SetStateAction<string[]>>,
  ) => {
    if (list.includes(item)) {
      setList(list.filter((i) => i !== item));
    } else {
      setList([...list, item]);
    }
  };

  useEffect(() => {
    const timeoutId = window.setTimeout(async () => {
      if (actorQuery.trim().length < 2) {
        setActorResults([]);
        return;
      }
      setLoading(true);
      try {
        const res = await fetch(`/api/search?type=person&q=${encodeURIComponent(actorQuery.trim())}`);
        const data = await res.json();
        setActorResults(Array.isArray(data.results) ? data.results : []);
      } finally {
        setLoading(false);
      }
    }, 350);
    return () => window.clearTimeout(timeoutId);
  }, [actorQuery]);

  useEffect(() => {
    const timeoutId = window.setTimeout(async () => {
      if (movieQuery.trim().length < 2) {
        setMovieResults([]);
        return;
      }
      setLoading(true);
      try {
        const res = await fetch(`/api/search?type=movie&q=${encodeURIComponent(movieQuery.trim())}`);
        const data = await res.json();
        setMovieResults(Array.isArray(data.results) ? data.results : []);
      } finally {
        setLoading(false);
      }
    }, 350);
    return () => window.clearTimeout(timeoutId);
  }, [movieQuery]);

  const canSubmit = useMemo(
    () =>
      selectedGenres.length > 0 &&
      selectedMoods.length > 0 &&
      selectedLanguages.length > 0 &&
      selectedMovies.length >= 3,
    [selectedGenres.length, selectedMoods.length, selectedLanguages.length, selectedMovies.length],
  );

  const addActor = (name: string) => {
    if (selectedActors.includes(name)) return;
    setSelectedActors((prev) => [...prev, name].slice(0, 12));
    setActorQuery("");
    setActorResults([]);
  };

  const addMovie = (movie: SearchMovie) => {
    if (selectedMovies.some((m) => m.id === movie.id)) return;
    setSelectedMovies((prev) => [...prev, movie].slice(0, 12));
    setMovieQuery("");
    setMovieResults([]);
  };

  const handleFinish = async () => {
    if (!canSubmit) {
      setError("Please complete all required preferences and choose at least 3 favorite movies.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          genres: selectedGenres,
          actorNames: selectedActors,
          seedTmdbIds: selectedMovies.map((m) => m.id),
          moodSlugs: selectedMoods,
          languages: selectedLanguages,
        }),
      });
      if (!res.ok) {
        setError("Could not save onboarding preferences. Please try again.");
        return;
      }
      router.push("/dashboard");
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex items-center justify-center p-4">
      <div className="max-w-2xl w-full glass rounded-2xl p-8 shadow-2xl">
        {step === 1 && (
          <div className="hero-animate">
            <h1 className="text-3xl font-bold mb-2">Welcome to CineMind</h1>
            <p className="text-zinc-400 mb-8">Let&apos;s engineer your taste profile. What genres do you enjoy?</p>
            <div className="flex flex-wrap gap-3 mb-8">
              {GENRES.map((g) => (
                <button
                  key={g}
                  onClick={() => toggleSelection(g, selectedGenres, setSelectedGenres)}
                  className={`px-4 py-2 rounded-full border transition-all ${
                    selectedGenres.includes(g)
                      ? "bg-accent border-accent text-white"
                      : "bg-white/5 border-white/10 hover:bg-white/10"
                  }`}
                >
                  {g}
                </button>
              ))}
            </div>
            <Button disabled={selectedGenres.length === 0} onClick={() => setStep(2)} className="w-full">
              Next: Moods
            </Button>
          </div>
        )}

        {step === 2 && (
          <div className="hero-animate">
            <h1 className="text-3xl font-bold mb-2">How do you want to feel?</h1>
            <p className="text-zinc-400 mb-8">Select the moods that resonate with you.</p>
            <div className="flex flex-wrap gap-3 mb-8">
              {MOODS.map((m) => (
                <button
                  key={m}
                  onClick={() => toggleSelection(m, selectedMoods, setSelectedMoods)}
                  className={`px-4 py-2 rounded-full border transition-all ${
                    selectedMoods.includes(m)
                      ? "bg-accent-2 border-accent-2 text-white"
                      : "bg-white/5 border-white/10 hover:bg-white/10"
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>
            <div className="flex gap-4">
              <Button variant="outline" onClick={() => setStep(1)} className="w-full bg-transparent border-white/20 text-white">
                Back
              </Button>
              <Button disabled={selectedMoods.length === 0} onClick={() => setStep(3)} className="w-full">
                Next: Languages
              </Button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="hero-animate">
            <h1 className="text-3xl font-bold mb-2">Preferred languages</h1>
            <p className="text-zinc-400 mb-8">Pick at least one language for better recommendations.</p>
            <div className="flex flex-wrap gap-3 mb-8">
              {LANGUAGES.map((lang) => (
                <button
                  key={lang}
                  onClick={() => toggleSelection(lang, selectedLanguages, setSelectedLanguages)}
                  className={`px-4 py-2 rounded-full border transition-all ${
                    selectedLanguages.includes(lang)
                      ? "bg-violet-500 border-violet-500 text-white"
                      : "bg-white/5 border-white/10 hover:bg-white/10"
                  }`}
                >
                  {lang}
                </button>
              ))}
            </div>
            <div className="flex gap-4">
              <Button variant="outline" onClick={() => setStep(2)} className="w-full bg-transparent border-white/20 text-white">
                Back
              </Button>
              <Button disabled={selectedLanguages.length === 0} onClick={() => setStep(4)} className="w-full">
                Next: Favorite actors
              </Button>
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="hero-animate">
            <h1 className="text-3xl font-bold mb-2">Favorite actors and actresses</h1>
            <p className="text-zinc-400 mb-4">Search and add performers you enjoy (optional, but recommended).</p>
            <input
              value={actorQuery}
              onChange={(e) => setActorQuery(e.target.value)}
              placeholder="Search actors..."
              className="w-full rounded-lg border border-white/10 bg-black/30 px-4 py-2 outline-none focus:border-violet-400"
            />
            {actorResults.length > 0 && (
              <div className="mt-3 max-h-48 overflow-auto rounded-lg border border-white/10 bg-black/40">
                {actorResults.map((actor) => (
                  <button
                    key={actor.id}
                    onClick={() => addActor(actor.name)}
                    className="block w-full border-b border-white/5 px-4 py-2 text-left text-sm hover:bg-white/10 last:border-b-0"
                  >
                    {actor.name}
                  </button>
                ))}
              </div>
            )}
            <div className="mt-4 flex flex-wrap gap-2 min-h-10">
              {selectedActors.map((name) => (
                <button
                  key={name}
                  onClick={() => setSelectedActors((prev) => prev.filter((x) => x !== name))}
                  className="rounded-full bg-white/10 px-3 py-1 text-xs text-zinc-200 hover:bg-white/20"
                >
                  {name} x
                </button>
              ))}
            </div>
            <div className="flex gap-4 mt-8">
              <Button variant="outline" onClick={() => setStep(3)} className="w-full bg-transparent border-white/20 text-white">
                Back
              </Button>
              <Button onClick={() => setStep(5)} className="w-full">
                Next: Favorite movies
              </Button>
            </div>
          </div>
        )}

        {step === 5 && (
          <div className="hero-animate">
            <h1 className="text-3xl font-bold mb-2">Seed your taste profile</h1>
            <p className="text-zinc-400 mb-4">Choose at least 3 favorite movies to solve cold-start recommendations.</p>
            <input
              value={movieQuery}
              onChange={(e) => setMovieQuery(e.target.value)}
              placeholder="Search movies..."
              className="w-full rounded-lg border border-white/10 bg-black/30 px-4 py-2 outline-none focus:border-violet-400"
            />
            {movieResults.length > 0 && (
              <div className="mt-3 max-h-56 overflow-auto rounded-lg border border-white/10 bg-black/40">
                {movieResults.map((movie) => (
                  <button
                    key={movie.id}
                    onClick={() => addMovie(movie)}
                    className="block w-full border-b border-white/5 px-4 py-2 text-left text-sm hover:bg-white/10 last:border-b-0"
                  >
                    {movie.title}
                    {movie.release_date ? (
                      <span className="ml-2 text-xs text-zinc-500">({movie.release_date.slice(0, 4)})</span>
                    ) : null}
                  </button>
                ))}
              </div>
            )}
            <div className="mt-4 flex flex-wrap gap-2 min-h-10">
              {selectedMovies.map((movie) => (
                <button
                  key={movie.id}
                  onClick={() => setSelectedMovies((prev) => prev.filter((x) => x.id !== movie.id))}
                  className="rounded-full bg-white/10 px-3 py-1 text-xs text-zinc-200 hover:bg-white/20"
                >
                  {movie.title} x
                </button>
              ))}
            </div>
            <p className="mt-3 text-xs text-zinc-400">
              Selected {selectedMovies.length}/3 minimum
              {loading ? " • Searching..." : ""}
            </p>
            {error ? <p className="mt-2 text-sm text-rose-300">{error}</p> : null}
            <div className="flex gap-4 mt-8">
              <Button variant="outline" onClick={() => setStep(4)} className="w-full bg-transparent border-white/20 text-white">
                Back
              </Button>
              <Button disabled={!canSubmit || submitting} onClick={handleFinish} className="w-full">
                {submitting ? "Personalizing..." : "Finish Onboarding"}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
