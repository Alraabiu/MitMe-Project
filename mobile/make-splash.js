const sharp = require('sharp');

const W = 1284;
const H = 2778;

async function buildSplash() {
  // 1. Purple → blue diagonal gradient background
  const bgSvg = `
    <svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stop-color="#4B24A8"/>
          <stop offset="1" stop-color="#4B67E0"/>
        </linearGradient>
      </defs>
      <rect width="${W}" height="${H}" fill="url(#bg)"/>
    </svg>
  `;
  const bg = await sharp(Buffer.from(bgSvg)).png().toBuffer();

  // 2. Load your logo, resize to ~70% of screen width
  const logoBuf = await sharp('assets/logo.png')
    .resize({ width: Math.round(W * 0.72), fit: 'inside' })
    .png()
    .toBuffer();

  const meta = await sharp(logoBuf).metadata();

  // 3. Composite: logo centered, slightly above middle
  const left = Math.round((W - meta.width) / 2);
  const top = Math.round((H - meta.height) / 2 - 100);

  await sharp(bg)
    .composite([{ input: logoBuf, left, top }])
    .png()
    .toFile('assets/splash.png');

  console.log('OK splash.png created at ' + W + 'x' + H);
}

buildSplash().catch((e) => {
  console.error('FAILED:', e.message);
  process.exit(1);
});
