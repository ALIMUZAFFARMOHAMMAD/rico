import { providerFetch } from "./provider-fetch";

export async function generateStudioReply(system, content, maxTokens) {
  if (!process.env.ANTHROPIC_API_KEY) throw new Error("Studio generation is unavailable.");
  const response = await providerFetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    signal: AbortSignal.timeout(30000),
    headers: {
      "Content-Type": "application/json",
      "x-api-key": process.env.ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-haiku-4-5-20251001",
      max_tokens: maxTokens,
      system,
      messages: [{ role: "user", content: JSON.stringify(content) }],
    }),
  });
  if (!response.ok) throw new Error("Studio generation is unavailable.");
  const data = await response.json();
  if (data.stop_reason === "max_tokens") throw new Error("Studio generation returned an incomplete reply.");
  const text = (data.content || []).filter(part => part.type === "text").map(part => part.text).join("").trim();
  if (!text) throw new Error("Studio generation returned an empty reply.");
  return text;
}
