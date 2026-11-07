// Accept bounded JPEG data only; never render user-supplied SVG or remote URLs.
export function portraitBytes(image, maxBytes = 256 * 1024) {
  if (typeof image !== "string" || image.length > Math.ceil(maxBytes / 3) * 4 + 32) return null;
  const match = image.match(/^data:image\/jpeg;base64,([A-Za-z0-9+/]+={0,2})$/);
  if (!match) return null;
  const bytes = Buffer.from(match[1], "base64");
  if (bytes.length < 16 || bytes.length > maxBytes || bytes[0] !== 0xff || bytes[1] !== 0xd8 || bytes[2] !== 0xff || bytes[bytes.length - 2] !== 0xff || bytes[bytes.length - 1] !== 0xd9) return null;
  return bytes;
}

export const PORTRAIT_STYLES = {
  natural: "Soft daylight, a simple neutral background, relaxed everyday clothing and a natural candid expression.",
  studio: "Professional studio photography, a warm grey backdrop, soft flattering studio lighting and smart casual clothing.",
  outdoors: "An outdoor portrait in soft golden-hour light, a softly blurred green background and relaxed everyday clothing.",
};
