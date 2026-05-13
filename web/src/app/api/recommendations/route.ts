import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getHybridRecommendations } from "@/lib/recommendations/hybrid";
import { ensureUser } from "@/lib/user";

export const dynamic = "force-dynamic";

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const user = await ensureUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const items = await getHybridRecommendations(user.id, 24);
  return NextResponse.json({ items });
}
