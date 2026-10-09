import { authMiddleware } from "@clerk/nextjs";
import { NextResponse } from "next/server";

// Every page and most APIs stay public here (pages redirect to /landing themselves; user-data
// APIs check ownership with lib/auth ownsUser). The routes below spend Anthropic/ElevenLabs
// credits, so a signed-out caller gets a 401 before any money is spent. All app pages already
// require sign-in, so no real user ever hits this as anonymous.
const PAID_API = /^\/api\/(tony|banter|club-feed|group|stt|translate|tts|voice|resume|tutor|notebook|avatar|checkin|remembers|digest|twin-voice)(\/|$)/;

// Local dev without a real CLERK_SECRET_KEY would otherwise 500 on every request
// (authMiddleware throws on init). Skip Clerk entirely in that case so pages still
// render — every request is then anonymous (ownsUser() is always false, protected
// API routes 403 gracefully instead of crashing). Production always has the real
// key set in Vercel, so this branch never runs there.
export default process.env.CLERK_SECRET_KEY
  ? authMiddleware({ publicRoutes: (req) => !PAID_API.test(req.nextUrl.pathname) })
  : () => NextResponse.next();

export const config = {
  matcher: ["/((?!_next|[^?]*\\.(?:html?|css|js|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)"],
};
