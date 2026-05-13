import { redirect } from "next/navigation";
import { NavMain } from "@/components/nav-main";
import prisma from "@/lib/prisma";
import { ensureUser } from "@/lib/user";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await ensureUser();
  if (!user) redirect("/sign-in");
  const pref = await prisma.userPreference.findUnique({ where: { userId: user.id } });
  if (!pref) redirect("/onboarding");
  return (
    <div className="min-h-screen text-zinc-100">
      <NavMain />
      <main>{children}</main>
    </div>
  );
}
