import { authMiddleware } from "@clerk/nextjs";
import { NextResponse } from "next/server";

// ponytail: publicRoutes:()=>true gates NOTHING — just enables getAuth() on API routes.
// Tighten to a real allowlist once the IDOR guard is verified on a real login.
//
// Local dev without a real CLERK_SECRET_KEY would otherwise 500 on every request
// (authMiddleware throws on init). Skip Clerk entirely in that case so pages still
// render — every request is then anonymous (ownsUser() is always false, protected
// API routes 403 gracefully instead of crashing). Production always has the real
// key set in Vercel, so this branch never runs there.
export default process.env.CLERK_SECRET_KEY
  ? authMiddleware({ publicRoutes: () => true })
  : () => NextResponse.next();

export const config = {
  matcher: ["/((?!_next|[^?]*\\.(?:html?|css|js|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)"],
};
