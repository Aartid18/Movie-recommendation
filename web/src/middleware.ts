import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import type { NextRequest } from "next/server";

const isPublicRoute = createRouteMatcher([
  "/",
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/movie(.*)",
  "/api/health",
  // Clerk internals (must not run auth.protect — avoids 500 / handshake issues)
  "/__clerk(.*)",
  "/clerk-sync-keyless",
]);

function authorizedPartiesForRequest(req: NextRequest): string[] {
  const parties = new Set<string>();
  const origin = req.nextUrl.origin;
  if (origin) parties.add(origin);

  const fromEnv = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "");
  if (fromEnv) parties.add(fromEnv);

  // Vercel sets VERCEL_URL (no protocol) for the current deployment
  const vercel = process.env.VERCEL_URL;
  if (vercel) parties.add(`https://${vercel}`);

  const branch = process.env.VERCEL_BRANCH_URL;
  if (branch) parties.add(`https://${branch}`);

  return [...parties].filter(Boolean);
}

export default clerkMiddleware(
  async (auth, req) => {
    if (!isPublicRoute(req)) {
      await auth.protect();
    }
  },
  (req) => ({
    // Fixes many Vercel 500 "middleware invocation" / handshake errors when the
    // deployment URL is not the same as localhost.
    authorizedParties: authorizedPartiesForRequest(req),
    signInUrl: "/sign-in",
    signUpUrl: "/sign-up",
  }),
);

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
    "/__clerk/(.*)",
  ],
};
