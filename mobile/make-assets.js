const sharp = require('sharp');

async function regenerate() {
  console.log('Regenerating from your existing assets...\n');

  // 1. Adaptive icon (Android) — 1024x1024 from icon.png
  await sharp('assets/icon.png')
    .resize(1024, 1024, { fit: 'cover' })
    .png()
    .toFile('assets/adaptive-icon.png');
  console.log('OK  adaptive-icon.png  (1024x1024)');

  // 2. Favicon — 196x196
  await sharp('assets/icon.png')
    .resize(196, 196, { fit: 'cover' })
    .png()
    .toFile('assets/favicon.png');
  console.log('OK  favicon.png  (196x196)');

  // 3. Notification icon — 96x96 (white silhouette)
  const silhouette = await sharp('assets/icon.png')
    .resize(96, 96, { fit: 'cover' })
    .greyscale()
    .threshold(128)
    .negate()
    .toBuffer();

  await sharp({
    create: {
      width: 96,
      height: 96,
      channels: 4,
      background: { r: 255, g: 255, b: 255, alpha: 1 },
    },
  })
    .composite([{ input: silhouette, blend: 'dest-in' }])
    .png()
    .toFile('assets/notification-icon.png');
  console.log('OK  notification-icon.png  (96x96)');

  // 4. Splash — 1284x2778, white bg + icon.png centered
  const W = 1284;
  const H = 2778;

  const bg = await sharp({
    create: {
      width: W,
      height: H,
      channels: 4,
      background: { r: 255, g: 255, b: 255, alpha: 1 },
    },
  })
    .png()
    .toBuffer();

  const logo = await sharp('assets/icon.png')
    .resize({ width: Math.round(W * 0.6), fit: 'inside' })
    .png()
    .toBuffer();

  const meta = await sharp(logo).metadata();
  const left = Math.round((W - meta.width) / 2);
  const top = Math.round((H - meta.height) / 2);

  await sharp(bg)
    .composite([{ input: logo, left, top }])
    .png()
    .toFile('assets/splash.png');
  console.log('OK  splash.png  (1284x2778)');

  console.log('\nAll done. Your icon.png was NOT modified.');
}

regenerate().catch((e) => {
  console.error('FAILED:', e.message);
  process.exit(1);
});
