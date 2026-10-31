import { createClient } from "@supabase/supabase-js";
import { createHash, randomUUID } from "crypto";
import { portraitBytes } from "./portrait-image";
import { sb, getRow, upsertRow, deleteRow } from "./db";

const BUCKET = "rico-social-photos";
const PREFIX = "rico-storage:v1:";
let client;
let bucketReadyUntil = 0;
const signedUrls = new Map();
const hash = text => createHash("sha256").update(text).digest("hex");
export const mediaStorageEnabled = () => process.env.SOCIAL_OBJECT_STORAGE_ENABLED === "true";
export function mediaPath(value) {
  if (typeof value !== "string" || !value.startsWith(PREFIX)) return null;
  const path = value.slice(PREFIX.length);
  return /^[a-f0-9]{64}\/[a-f0-9]{64}-[a-f0-9]{64}\.jpg$/.test(path) ? path : null;
}
function storage() {
  if (!client) client = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { fetch: (url, options = {}) => fetch(url, { ...options, signal: options.signal ? AbortSignal.any([options.signal, AbortSignal.timeout(15000)]) : AbortSignal.timeout(15000) }) },
  });
  return client.storage;
}
async function ensurePrivateBucket() {
  if (Date.now() < bucketReadyUntil) return;
  let result = await storage().getBucket(BUCKET);
  if (result.error && String(result.error.status) === "404") {
    await storage().createBucket(BUCKET, { public: false, allowedMimeTypes: ["image/jpeg"], fileSizeLimit: 262144 });
    result = await storage().getBucket(BUCKET);
  }
  if (result.error || !result.data || result.data.public !== false) throw new Error("Private photo storage is unavailable.");
  bucketReadyUntil = Date.now() + 300000;
}
export async function storeSocialImage(owner, postId, image, beforeUpload) {
  const bytes = portraitBytes(image);
  if (!bytes) throw new Error("Invalid photo");
  await ensurePrivateBucket();
  const path = `${hash(owner)}/${hash(postId)}-${hash(bytes)}.jpg`;
  if (beforeUpload) await beforeUpload(PREFIX + path);
  const { error } = await storage().from(BUCKET).upload(path, bytes, { contentType: "image/jpeg", upsert: false, cacheControl: "60" });
  if (error && !["409"].includes(String(error.statusCode || error.status))) throw new Error("Photo upload failed. Your draft is kept.");
  return PREFIX + path;
}
export async function signedSocialImage(reference) {
  const path = mediaPath(reference);
  if (!path) return null;
  const cached = signedUrls.get(path);
  if (cached && cached.expires > Date.now()) return cached.url;
  const { data, error } = await storage().from(BUCKET).createSignedUrl(path, 60);
  if (error || !data?.signedUrl) throw new Error("Photo is temporarily unavailable.");
  const url = new URL(data.signedUrl);
  if (url.origin !== new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).origin) throw new Error("Invalid photo origin");
  for (const [key, item] of signedUrls) if (item.expires <= Date.now()) signedUrls.delete(key);
  if (signedUrls.size >= 500) signedUrls.delete(signedUrls.keys().next().value);
  signedUrls.set(path, { url: url.href, expires: Date.now() + 45000 });
  return url.href;
}
export async function queueMediaCleanup(reference, postKey) {
  if (!mediaPath(reference)) return;
  const key = `system::media-cleanup::${randomUUID()}`;
  await upsertRow(key, { traits: { kind: "social-media-cleanup", reference, postKey, queuedAt: new Date().toISOString() } });
  return key;
}
export async function finishMediaCleanup(key) {
  if (!key) return;
  const row = await getRow(key);
  if (!row) return;
  const path = mediaPath(row.traits?.reference);
  if (!path) throw new Error("Invalid cleanup task");
  const post = await getRow(row.traits.postKey);
  if (post?.traits?.image !== row.traits.reference) {
    const { error } = await storage().from(BUCKET).remove([path]);
    if (error) throw new Error("Photo cleanup will retry");
  }
  await deleteRow(key);
}
export async function cleanupSocialMedia() {
  // Grace period avoids removing uploads whose database commit is still in flight.
  const before = new Date(Date.now() - 3600000).toISOString();
  const rows = await sb(`/conversations?traits->>kind=eq.social-media-cleanup&traits->>queuedAt=lt.${encodeURIComponent(before)}&select=user_id,traits&limit=20`);
  let removed = 0;
  for (const row of rows || []) {
    await finishMediaCleanup(row.user_id); removed++;
  }
  return removed;
}
export async function removeUserMedia(userId) {
  // Existing legacy accounts need no bucket. Do not create one while deleting.
  const bucket = await storage().getBucket(BUCKET);
  if (String(bucket.error?.status) === "404") return;
  if (bucket.error) throw new Error("Could not check your photos. Please retry.");
  const folder = hash(userId);
  for (let batch = 0; batch < 20; batch++) {
    const { data, error } = await storage().from(BUCKET).list(folder, { limit: 1000, offset: 0 });
    if (error) throw new Error("Could not list your photos. Please retry.");
    if (!data?.length) return;
    const paths = data.map(file => `${folder}/${file.name}`);
    if (paths.some(path => !mediaPath(PREFIX + path))) throw new Error("Unexpected photo storage entry");
    const result = await storage().from(BUCKET).remove(paths);
    if (result.error) throw new Error("Could not remove your photos. Please retry.");
  }
  throw new Error("Photo cleanup is still in progress. Please retry account deletion.");
}
