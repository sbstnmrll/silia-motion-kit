// Dev utility: node scripts/bbox.mjs <png> [alphaThreshold]
// Prints the alpha bounding box of a PNG in pixels: {left, top, width, height, right, bottom}
import sharp from "sharp";
const [, , file, thr = "8"] = process.argv;
const t = Number(thr);
const { data, info } = await sharp(file).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
let minX = info.width, minY = info.height, maxX = -1, maxY = -1;
for (let y = 0; y < info.height; y++) {
  for (let x = 0; x < info.width; x++) {
    const a = data[(y * info.width + x) * 4 + 3];
    if (a > t) {
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
  }
}
if (maxX < 0) console.log(JSON.stringify({ empty: true, width: info.width, height: info.height }));
else console.log(JSON.stringify({ left: minX, top: minY, width: maxX - minX + 1, height: maxY - minY + 1, right: maxX + 1, bottom: maxY + 1, img: [info.width, info.height] }));
