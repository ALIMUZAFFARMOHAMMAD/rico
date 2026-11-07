// Directions are kept separate from captions, conversation history and device TTS.
const DIRECTIONS = new Set(["warmly", "excited", "curious", "thoughtful", "reassuring", "softly", "confident"]);
const normalize = text => text.replace(/\s+/g, " ").trim();
export function splitVoiceReply(value) {
  const raw = typeof value === "string" ? value : "";
  let count = 0;
  const speechText = normalize(raw.replace(/\[([^\]\r\n]{1,80})\]/g, (_, tag) => {
    const direction = tag.toLowerCase().trim();
    return DIRECTIONS.has(direction) && count++ < 3 ? `[${direction}]` : "";
  }));
  return { text: normalize(speechText.replace(/\[[^\]]*\]/g, "")), speechText };
}

export function expressiveDelivery(text, speechText, expression) {
  const lively = expression !== "natural";
  const directed = typeof speechText === "string" && speechText.length <= 1000 ? splitVoiceReply(speechText) : null;
  // A caller may add vocal directions, never substitute different spoken words.
  const valid = directed && directed.text === normalize(text) && /\[[^\]]+\]/.test(directed.speechText);
  return {
    text: valid ? directed.speechText : `[warmly] ${text}`,
    voice_settings: { stability: lively ? 0 : 0.5, similarity_boost: 0.75 },
  };
}
