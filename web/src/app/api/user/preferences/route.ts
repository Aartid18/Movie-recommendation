import { NextResponse } from "next/server";
import { ensureUser } from "@/lib/user";
import prisma from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const user = await ensureUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { genres, moods } = await req.json();

    const preference = await prisma.userPreference.upsert({
      where: { userId: user.id },
      update: {
        genres: genres || [],
        moodSlugs: moods || [],
      },
      create: {
        userId: user.id,
        genres: genres || [],
        moodSlugs: moods || [],
      },
    });

    return NextResponse.json({ success: true, preference });
  } catch (error) {
    console.error("Error saving preferences:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
