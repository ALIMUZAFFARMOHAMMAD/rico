// Shared, allowlisted presentation data. Artwork is rendered locally as SVG;
// daily posts never call an image-generation service.
export const SOCIAL_MOODS = {
  calm: { label: "Calm", emoji: "🌊", art: "coast" },
  happy: { label: "Happy", emoji: "☀️", art: "sunrise" },
  inspired: { label: "Inspired", emoji: "✨", art: "space" },
  cozy: { label: "Cozy", emoji: "☕", art: "coffee" },
  focused: { label: "Focused", emoji: "🎯", art: "books" },
  grateful: { label: "Grateful", emoji: "🌿", art: "garden" },
};
export const SOCIAL_ART = ["coast", "sunrise", "space", "coffee", "books", "garden"];
export const STORY_LIFETIME_MS = 24 * 60 * 60 * 1000;
export const isActiveStory = (post, now = Date.now()) => Number.isFinite(Date.parse(post?.storyExpiresAt)) && Date.parse(post.storyExpiresAt) > now;
export const isVisiblePost = (post, now = Date.now()) => post?.format !== "story" || isActiveStory(post, now);
export function dailyPresentation(authorId, date) {
  const moods = Object.keys(SOCIAL_MOODS);
  const seed = [...`${authorId}:${date}`].reduce((value, c) => value + c.charCodeAt(0), 0);
  const mood = moods[seed % moods.length];
  return { mood, art: SOCIAL_MOODS[mood].art };
}
