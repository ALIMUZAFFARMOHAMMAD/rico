import { supabaseAdmin } from "../../lib/supabase";
import { getAuth } from "@clerk/nextjs/server";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const { userId } = getAuth(req);
  const { userId: uid, results } = req.body;
  const saveId = uid || userId;

  if (!saveId || !results) return res.status(400).json({ error: "Missing data" });

  try {
    await supabaseAdmin.from("career_results").insert({
      user_id: saveId,
      personality_type: results.personalityType,
      riasec: results.riasec,
      summary: results.summary,
      traits: results.traits,
      careers: results.careers,
      next_steps: results.nextSteps,
      tony_note: results.tonyNote,
    });
    return res.status(200).json({ success: true });
  } catch (e) {
    console.error("Results save error:", e.message);
    return res.status(500).json({ error: e.message });
  }
}
