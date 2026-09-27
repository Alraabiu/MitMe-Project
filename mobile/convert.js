const { Resvg } = require('@resvg/resvg-js');
const fs = require('fs');

const jobs = [
  { src: 'assets/icon.svg',               dst: 'assets/icon.png',              width: 1024 },
  { src: 'assets/icon.svg',               dst: 'assets/adaptive-icon.png',     width: 1024 },
  { src: 'assets/icon.svg',               dst: 'assets/favicon.png',           width: 196  },
  { src: 'assets/splash.svg',             dst: 'assets/splash.png',            width: 1284 },
  { src: 'assets/notification-icon.svg',  dst: 'assets/notification-icon.png', width: 96   },
];

for (const j of jobs) {
  try {
    const svg = fs.readFileSync(j.src, 'utf8');
    const resvg = new Resvg(svg, {
      fitTo: { mode: 'width', value: j.width },
      background: 'transparent',
    });
    const png = resvg.render().asPng();
    fs.writeFileSync(j.dst, png);
    console.log('OK  ' + j.dst + '  (' + png.length + ' bytes)');
  } catch (e) {
    console.error('FAIL ' + j.src + ' -> ' + j.dst + ': ' + e.message);
  }
}
