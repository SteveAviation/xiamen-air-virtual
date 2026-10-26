/* Render the Xiamen Air Virtual badge + wordmark assets from a single
   vector source. Run with: node scripts/make-brand-assets.mjs */
import fs from "node:fs";
import sharp from "sharp";

const emblem = fs.readFileSync("public/brand/xav-emblem.svg", "utf8");

/* Strip the outer <svg> wrapper so the paths can be inlined into lockups.
   The <defs> block is kept: the badge clip-path lives there. */
const inner = emblem
  .replace(/^[\s\S]*?<svg[^>]*>/, "")
  .replace(/<\/svg>\s*$/, "");

function lockup({ width, height, word, accent }) {
  const d = height * 0.92;
  const scale = d / 512;
  const x = height * 0.04;
  const y = (height - d) / 2;
  const tx = x + d + height * 0.13;
  const mainSize = height * 0.315;
  const subSize = height * 0.135;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">
  <g transform="translate(${x},${y}) scale(${scale})">${inner}</g>
  <text x="${tx}" y="${height * 0.53}" font-family="Lato, Helvetica, Arial, sans-serif" font-weight="700"
        font-size="${mainSize}" letter-spacing="${mainSize * 0.02}" fill="${word}">XIAMEN AIR</text>
  <text x="${tx + mainSize * 0.03}" y="${height * 0.745}" font-family="Lato, Helvetica, Arial, sans-serif" font-weight="700"
        font-size="${subSize}" letter-spacing="${subSize * 0.42}" fill="${accent}">VIRTUAL</text>
</svg>`;
}

const light = lockup({ width: 1080, height: 287, word: "#0B1560", accent: "#1290D6" });
const dark = lockup({ width: 1985, height: 528, word: "#FFFFFF", accent: "#8FCBF0" });

fs.writeFileSync("public/brand/xav-logo-light.svg", light);
fs.writeFileSync("public/brand/xav-logo-dark.svg", dark);

await sharp(Buffer.from(light)).png().toFile("public/brand/xav-logo-light.png");
await sharp(Buffer.from(dark)).png().toFile("public/brand/xav-logo-dark.png");
await sharp(Buffer.from(emblem)).resize(512, 512).png().toFile("public/brand/xav-emblem.png");
await sharp(Buffer.from(emblem)).resize(256, 256).png().toFile("public/brand/egret-avatar.png");
await sharp(Buffer.from(emblem)).resize(256, 256).png().toFile("src/app/icon.png");

console.log("brand assets written");
