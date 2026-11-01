const isHex = value => typeof value === "string" && /^#[0-9a-f]{6}$/i.test(value);

export function cleanLook(value) {
  if (!value || !isHex(value.skin) || !isHex(value.hair) || !isHex(value.hoodie) || typeof value.beard !== "boolean") return null;
  return {
    skin: value.skin, skinD: isHex(value.skinD) ? value.skinD : shade(value.skin),
    hair: value.hair, beard: value.beard,
    hoodie: value.hoodie, hoodieD: isHex(value.hoodieD) ? value.hoodieD : shade(value.hoodie),
  };
}

export function shade(hex) {
  return "#" + [1, 3, 5].map(index => Math.round(parseInt(hex.slice(index, index + 2), 16) * 0.8).toString(16).padStart(2, "0")).join("");
}
