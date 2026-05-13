import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { ensureUser } from "@/lib/user";

const schema = z.object({
  movieTmdbId: z.number(),
  action: z.enum(["RATE", "WATCH", "LIKE", "DISLIKE", "WATCHLIST", "REMOVE_WATCHLIST"]),
  value: z.number().min(0.5).max(5).optional(),
});

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const user = await ensureUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const json = await req.json().catch(() => null);
  const parsed = schema.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const { movieTmdbId, action, value } = parsed.data;

  switch (action) {
    case "RATE": {
      const v = value ?? 4;
      await prisma.rating.upsert({
        where: { userId_movieTmdbId: { userId: user.id, movieTmdbId } },
        create: { userId: user.id, movieTmdbId, value: v },
        update: { value: v },
      });
      break;
    }
    case "WATCH": {
      await prisma.watchEvent.upsert({
        where: { userId_movieTmdbId: { userId: user.id, movieTmdbId } },
        create: { userId: user.id, movieTmdbId, progress: 0 },
        update: { progress: 0, updatedAt: new Date() },
      });
      break;
    }
    case "LIKE":
      await prisma.savedMovie.deleteMany({ where: { userId: user.id, movieTmdbId, kind: "DISLIKE" } });
      await prisma.savedMovie.upsert({
        where: { userId_movieTmdbId_kind: { userId: user.id, movieTmdbId, kind: "LIKE" } },
        create: { userId: user.id, movieTmdbId, kind: "LIKE" },
        update: {},
      });
      break;
    case "DISLIKE":
      await prisma.savedMovie.deleteMany({ where: { userId: user.id, movieTmdbId, kind: "LIKE" } });
      await prisma.savedMovie.upsert({
        where: { userId_movieTmdbId_kind: { userId: user.id, movieTmdbId, kind: "DISLIKE" } },
        create: { userId: user.id, movieTmdbId, kind: "DISLIKE" },
        update: {},
      });
      break;
    case "WATCHLIST":
      await prisma.savedMovie.upsert({
        where: { userId_movieTmdbId_kind: { userId: user.id, movieTmdbId, kind: "WATCHLIST" } },
        create: { userId: user.id, movieTmdbId, kind: "WATCHLIST" },
        update: {},
      });
      break;
    case "REMOVE_WATCHLIST":
      await prisma.savedMovie.deleteMany({ where: { userId: user.id, movieTmdbId, kind: "WATCHLIST" } });
      break;
    default:
      break;
  }
  return NextResponse.json({ ok: true });
}
