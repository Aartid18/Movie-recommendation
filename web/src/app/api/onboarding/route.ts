import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { ensureUser } from "@/lib/user";

const bodySchema = z.object({
  genres: z.array(z.string()).min(1, "Pick at least one genre"),
  actorNames: z.array(z.string()).max(24).default([]),
  seedTmdbIds: z.array(z.number()).min(3, "Pick at least three movies"),
  moodSlugs: z.array(z.string()).min(1),
  languages: z.array(z.string()).min(1),
});

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const user = await ensureUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const json = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const { genres, actorNames, seedTmdbIds, moodSlugs, languages } = parsed.data;
  await prisma.userPreference.upsert({
    where: { userId: user.id },
    create: {
      userId: user.id,
      genres,
      actorNames,
      seedTmdbIds,
      moodSlugs,
      languages,
    },
    update: {
      genres,
      actorNames,
      seedTmdbIds,
      moodSlugs,
      languages,
    },
  });
  return NextResponse.json({ ok: true });
}
