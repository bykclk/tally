import sharp from 'sharp';
import { readFile } from 'node:fs/promises';

const svg = await readFile(new URL('./icon.svg', import.meta.url));

await sharp(svg, { density: 384 })
  .resize(512, 512)
  .png()
  .toFile(new URL('./preview.png', import.meta.url).pathname);

console.log('wrote tools/preview.png (512x512)');
