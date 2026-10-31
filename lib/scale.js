import { sb } from "./db";
import { randomUUID } from "crypto";

// Enable only after migrations/20261031_scale.sql and its preflight pass.
export const scaleEnabled = () => process.env.SCALE_STORAGE_ENABLED === "true";
export const scaleRpc = (name, args) => sb(`/rpc/rico_${name}`, "POST", args);

export async function acquireLease(key, seconds = 180) {
  const token = randomUUID();
  return await scaleRpc("lease", { p_key: key, p_token: token, p_seconds: seconds }) ? token : null;
}

export async function releaseLease(key, token) {
  await scaleRpc("release_lease", { p_key: key, p_token: token });
}

export async function mutateClub(key, mutation, lease = null) {
  return scaleRpc("club_mutate", { p_key: key, p_mutation: mutation, p_lease: lease });
}
