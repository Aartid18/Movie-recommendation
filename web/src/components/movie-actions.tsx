"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

type Review = {
  id: string;
  body: string;
  userName: string;
  createdAt: string;
};

export function MovieActions({ movieTmdbId }: { movieTmdbId: number }) {
  const [reviewBody, setReviewBody] = useState("");
  const [reviews, setReviews] = useState<Review[]>([]);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const loadReviews = useCallback(async () => {
    const res = await fetch(`/api/reviews?movieTmdbId=${movieTmdbId}`, { cache: "no-store" });
    const data = await res.json();
    setReviews(Array.isArray(data.reviews) ? data.reviews : []);
  }, [movieTmdbId]);

  useEffect(() => {
    void loadReviews();
  }, [loadReviews]);

  const sendAction = async (action: string, value?: number) => {
    setPending(true);
    setMessage(null);
    try {
      const res = await fetch("/api/interactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ movieTmdbId, action, value }),
      });
      if (!res.ok) {
        setMessage("Could not save action.");
        return;
      }
      setMessage("Saved.");
    } finally {
      setPending(false);
    }
  };

  const submitReview = async () => {
    if (reviewBody.trim().length < 3) return;
    setPending(true);
    setMessage(null);
    try {
      const res = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ movieTmdbId, body: reviewBody.trim() }),
      });
      if (!res.ok) {
        setMessage("Could not submit review.");
        return;
      }
      setReviewBody("");
      await loadReviews();
      setMessage("Review posted.");
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2">
        <Button disabled={pending} onClick={() => sendAction("WATCH")}>
          Mark watched
        </Button>
        <Button disabled={pending} variant="outline" onClick={() => sendAction("WATCHLIST")}>
          Add watchlist
        </Button>
        <Button disabled={pending} variant="outline" onClick={() => sendAction("LIKE")}>
          Like
        </Button>
        <Button disabled={pending} variant="outline" onClick={() => sendAction("DISLIKE")}>
          Dislike
        </Button>
        <Button disabled={pending} variant="outline" onClick={() => sendAction("RATE", 5)}>
          Rate 5/5
        </Button>
      </div>
      {message ? <p className="text-xs text-zinc-400">{message}</p> : null}

      <div className="glass rounded-xl p-4">
        <h3 className="font-semibold">User reviews</h3>
        <textarea
          value={reviewBody}
          onChange={(e) => setReviewBody(e.target.value)}
          placeholder="Write your thoughts..."
          className="mt-3 min-h-24 w-full rounded-lg border border-white/10 bg-black/30 p-3 text-sm outline-none focus:border-violet-400"
        />
        <div className="mt-3">
          <Button disabled={pending || reviewBody.trim().length < 3} onClick={submitReview}>
            Post review
          </Button>
        </div>
        <div className="mt-4 space-y-3">
          {reviews.map((review) => (
            <div key={review.id} className="rounded-lg border border-white/10 bg-white/5 p-3">
              <p className="text-sm text-zinc-300">{review.body}</p>
              <p className="mt-1 text-xs text-zinc-500">{review.userName}</p>
            </div>
          ))}
          {!reviews.length ? <p className="text-sm text-zinc-500">No reviews yet.</p> : null}
        </div>
      </div>
    </div>
  );
}
