import { authMiddleware } from "@clerk/nextjs";

// ponytail: publicRoutes:()=>true gates NOTHING — just enables getAuth() on API routes.
// Tighten to a real allowlist once the IDOR guard is verified on a real login.
export default authMiddleware({ publicRoutes: () => true });

export const config = {
  matcher: ["/((?!_next|[^?]*\\.(?:html?|css|js|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)"],
};
