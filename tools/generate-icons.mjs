// One-off icon generator. `sharp` is NOT a project dependency (it fails to
// build on EAS CI and isn't needed at runtime). To regenerate icons:
//   npm i -D sharp && node tools/generate-icons.mjs && npm uninstall sharp
import sharp from 'sharp';
import { readFile, mkdir } from 'node:fs/promises';

const fullIconSvg = await readFile(new URL('./icon.svg', import.meta.url));

// Android adaptive foreground: same tally, scaled into the inner safe area
// (~66% of canvas), transparent background.
const adaptiveForegroundSvg = `<svg width="1024" height="1024" viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg">
  <g transform="translate(192, 192) scale(0.625)">
    <rect x="247" y="290" width="80" height="540" rx="40" fill="white"/>
    <rect x="397" y="290" width="80" height="540" rx="40" fill="white"/>
    <rect x="547" y="290" width="80" height="540" rx="40" fill="white"/>
    <rect x="697" y="290" width="80" height="540" rx="40" fill="white"/>
    <rect x="197" y="290" width="180" height="70" rx="35" fill="white"/>
    <line x1="200" y1="770" x2="820" y2="340" stroke="white" stroke-width="70" stroke-linecap="round"/>
  </g>
</svg>`;

// Splash mark: transparent bg, single fill colour. Light variant is teal so
// it floats on cream; dark variant is white so it stays legible on the dark
// background expo-splash-screen swaps in for dark mode.
function splashIconSvg(fill) {
  return `<svg width="1024" height="1024" viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg">
  <rect x="247" y="290" width="80" height="540" rx="40" fill="${fill}"/>
  <rect x="397" y="290" width="80" height="540" rx="40" fill="${fill}"/>
  <rect x="547" y="290" width="80" height="540" rx="40" fill="${fill}"/>
  <rect x="697" y="290" width="80" height="540" rx="40" fill="${fill}"/>
  <rect x="197" y="290" width="180" height="70" rx="35" fill="${fill}"/>
  <line x1="200" y1="770" x2="820" y2="340" stroke="${fill}" stroke-width="70" stroke-linecap="round"/>
</svg>`;
}

const outDir = new URL('../assets/images/', import.meta.url);
await mkdir(outDir, { recursive: true });

const outputs = [
  { name: 'icon.png', size: 1024, svg: fullIconSvg },
  { name: 'splash-icon.png', size: 1024, svg: splashIconSvg('#0F766E') },
  { name: 'splash-icon-dark.png', size: 1024, svg: splashIconSvg('white') },
  { name: 'android-icon-foreground.png', size: 1024, svg: adaptiveForegroundSvg },
  { name: 'android-icon-monochrome.png', size: 1024, svg: adaptiveForegroundSvg },
  { name: 'favicon.png', size: 48, svg: fullIconSvg },
];

for (const { name, size, svg } of outputs) {
  const input = typeof svg === 'string' ? Buffer.from(svg) : svg;
  await sharp(input, { density: 384 })
    .resize(size, size)
    .png()
    .toFile(new URL(name, outDir).pathname);
  console.log(`wrote assets/images/${name} (${size}x${size})`);
}
