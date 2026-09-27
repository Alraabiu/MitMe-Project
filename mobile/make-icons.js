const sharp = require('sharp');

async function resize() {
  // App icon — 1024x1024
  await sharp('assets/icon-raw.png')
    .resize(1024, 1024, { fit: 'cover' })
    .png()
    .toFile('assets/icon.png');

  // Adaptive icon (Android) — same 1024x1024
  await sharp('assets/icon-raw.png')
    .resize(1024, 1024, { fit: 'cover' })
    .png()
    .toFile('assets/adaptive-icon.png');

  // Favicon — 196x196
  await sharp('assets/icon-raw.png')
    .resize(196, 196, { fit: 'cover' })
    .png()
    .toFile('assets/favicon.png');

  // Notification icon — 96x96 (will be white-filtered by Android)
  await sharp('assets/icon-raw.png')
    .resize(96, 96, { fit: 'cover' })
    .png()
    .toFile('assets/notification-icon.png');

  console.log('OK all icons resized');
}

resize().catch((e) => {
  console.error('FAILED:', e.message);
  process.exit(1);
});
