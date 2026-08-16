import { getAuth } from "@clerk/nextjs/server";

export function ownsUser(req, userId) {
  if (!userId) return false;
  const { userId: sessionId } = getAuth(req);
  return !!sessionId && sessionId === userId;
}
