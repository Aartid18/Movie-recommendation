import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { ensureUser } from "@/lib/user";

const createSchema = z.object({
  movieTmdbId: z.number().int().positive(),
  body: z.string().trim().min(3).max(800),
});

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const id = Number(searchParams.get("movieTmdbId"));
  if (!Number.isFinite(id)) {
    return NextResponse.json({ error: "Invalid movie id" }, { status: 400 });
  }
  const reviews = await prisma.review.findMany({
    where: { movieTmdbId: id },
    select: {
      id: true,
      body: true,
      createdAt: true,
      user: { select: { displayName: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 20,
  });
  return NextResponse.json({
    reviews: reviews.map((r: { id: string; body: string; createdAt: Date; user: { displayName: string | null } }) => ({
      id: r.id,
      body: r.body,
      createdAt: r.createdAt,
      userName: r.user.displayName ?? "Anonymous",
    })),
  });
}

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const user = await ensureUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const json = await req.json().catch(() => null);
  const parsed = createSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const created = await prisma.review.create({
    data: {
      userId: user.id,
      movieTmdbId: parsed.data.movieTmdbId,
      body: parsed.data.body,
    },
  });
  return NextResponse.json({ ok: true, review: created });
}
