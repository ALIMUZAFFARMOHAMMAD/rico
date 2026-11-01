// Keep model-only control messages and personality metadata out of the visible chat.
export function messageText(content) {
  if (typeof content !== "string" || /^\[(START|RETURNING USER:)/.test(content)) return "";
  return content.replace(/\{[^{}]*"O"\s*:\s*\d+[^{}]*\}/g, "").trim();
}

export function visibleMessages(messages = []) {
  return messages.filter(message => ["user", "assistant"].includes(message?.role)).map((message, index) => ({
    id: `saved-${index}`, role: message.role === "assistant" ? "agent" : "user", text: messageText(message.content),
  })).filter(message => message.text);
}

export function validConversation(body) {
  return Array.isArray(body.messages) && body.messages.length <= 2000 && body.messages.every(message =>
    message && ["user", "assistant"].includes(message.role) && typeof message.content === "string" && message.content.length <= 50000
  ) && Number.isInteger(body.msgCount) && body.msgCount >= 0 && body.msgCount <= 1000000 &&
    (body.riasec === undefined || typeof body.riasec === "string" && body.riasec.length <= 200) &&
    (body.traits === undefined || body.traits !== null && typeof body.traits === "object" && !Array.isArray(body.traits) &&
      Object.entries(body.traits).every(([key, value]) => ["O","C","E","A","N"].includes(key) && Number.isFinite(value) && value >= 0 && value <= 100));
}
