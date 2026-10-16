import { clerkMiddleware } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

// Every page and most APIs stay public here (pages redirect to /landing themselves; user-data
// APIs check ownership with lib/auth ownsUser). The routes below spend Anthropic/ElevenLabs
// credits, so a signed-out caller gets a 401 before any money is spent. All app pages already
// require sign-in, so no real user ever hits this as anonymous.
const PAID_API = /^\/api\/(tony|banter|club-feed|group|stt|translate|tts|voice|resume|tutor|notebook|avatar|portrait|checkin|remembers|digest|twin-voice|twin-studio)(\/|$)/;

// Local dev without a real CLERK_SECRET_KEY would otherwise 500 on every request
// (Clerk needs a valid secret to authenticate requests). Skip Clerk entirely in that case so pages still
// render — every request is then anonymous (ownsUser() is always false, protected
// API routes 403 gracefully instead of crashing). Production always has the real
// key set in Vercel, so this branch never runs there.
const clerkHandler = process.env.CLERK_SECRET_KEY
  ? clerkMiddleware(async (auth, req) => {
      if (PAID_API.test(req.nextUrl.pathname)) {
        const { userId } = await auth();
        if (!userId) return NextResponse.json({ error: "Sign in first" }, { status: 401 });
      }
      return NextResponse.next();
    })
  : req => PAID_API.test(req.nextUrl.pathname)
    ? NextResponse.json({ error: "Sign-in is not configured" }, { status: 503 })
    : NextResponse.next();

// This endpoint uses an owner-bound, revocable PC token, not a Clerk JWT.
export default function middleware(req, event) {
  if (req.nextUrl.pathname === "/api/meeting-worker" || (req.nextUrl.pathname === "/api/meeting-auto" && req.headers?.get("authorization")?.startsWith("Bearer "))) return NextResponse.next();
  return clerkHandler(req, event);
}

export const config = {
  matcher: ["/((?!_next|[^?]*\\.(?:html?|css|js|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)"],
};

