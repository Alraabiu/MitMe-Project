import express from 'express';

const r = express.Router();

/**
 * Public landing page for shared class links.
 * URL: https://mitme-project.onrender.com/join/:code
 *
 * If MitMe is installed and Android App Links are verified, the OS opens
 * the app directly (this page never renders). If not, this page shows
 * install instructions + the class code.
 */
r.get('/:code', (req, res) => {
  const code = String(req.params.code || '').toUpperCase();
  const deepLink = `mitme://join/${code}`;

  res.send(`<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover" />
  <title>Join MitMe Class ${code}</title>
  <meta name="theme-color" content="#4B24A8" />
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      background: linear-gradient(135deg, #4B24A8 0%, #4B67E0 100%);
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 24px;
      color: #fff;
    }
    .card {
      background: #fff;
      color: #171717;
      border-radius: 24px;
      padding: 32px 24px;
      max-width: 420px;
      width: 100%;
      text-align: center;
      box-shadow: 0 20px 60px rgba(0,0,0,0.3);
    }
    .logo {
      width: 72px; height: 72px;
      border-radius: 20px;
      background: linear-gradient(135deg, #4B24A8 0%, #4B67E0 100%);
      margin: 0 auto 16px;
      display: flex; align-items: center; justify-content: center;
      font-size: 34px; font-weight: 900; color: #fff;
    }
    h1 { font-size: 22px; font-weight: 900; margin-bottom: 8px; }
    p.sub { color: #777; font-size: 14px; margin-bottom: 20px; line-height: 1.5; }
    .code {
      display: inline-block;
      background: #F0EBFF;
      color: #4B24A8;
      border-radius: 12px;
      padding: 14px 22px;
      font-size: 26px;
      font-weight: 900;
      letter-spacing: 4px;
      margin: 8px 0 24px;
    }
    .btn {
      display: block;
      width: 100%;
      padding: 16px;
      border-radius: 14px;
      font-size: 16px;
      font-weight: 800;
      text-decoration: none;
      border: 0;
      cursor: pointer;
      margin-top: 10px;
    }
    .btn-primary {
      background: linear-gradient(135deg, #4B24A8 0%, #4B67E0 100%);
      color: #fff;
    }
    .btn-secondary {
      background: #F0EBFF;
      color: #4B24A8;
    }
    .hint {
      margin-top: 18px;
      font-size: 12px;
      color: #999;
      line-height: 1.5;
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="logo">M</div>
    <h1>You are invited to a MitMe class</h1>
    <p class="sub">Join by opening the app or entering this code manually.</p>
    <div class="code">${code}</div>
    <a href="${deepLink}" class="btn btn-primary">Open MitMe App</a>
    <a href="https://play.google.com/store/apps/details?id=com.mitme.app" class="btn btn-secondary">Install MitMe</a>
    <div class="hint">
      Already have MitMe? Tap "Open MitMe App".<br />
      First time? Install the app, then enter code <strong>${code}</strong>.
    </div>
  </div>
</body>
</html>`);
});

export default r;
