const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

async function main() {
  console.log('1. Loading brand assets...');
  const iconAppBase64 = fs.readFileSync('public/branding/icone-app-1024.png').toString('base64');
  
  console.log('2. Fetching Google Fonts latin subsets...');
  const ua = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36';
  const fontCssRes = await fetch('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Space+Grotesk:wght@600;700&display=swap', {
    headers: { 'User-Agent': ua }
  });
  const rawCss = await fontCssRes.text();

  // Parse @font-face blocks
  const fontBlocks = rawCss.split('@font-face').slice(1);
  let inlinedFontCss = '';

  for (const block of fontBlocks) {
    if (!block.includes('unicode-range') || block.includes('U+0000-00FF')) { // Latin or generic
      const urlMatch = block.match(/url\((https:[^)]+\.woff2)\)/);
      const familyMatch = block.match(/font-family:\s*['"]?([^'";]+)['"]?/);
      const weightMatch = block.match(/font-weight:\s*(\d+)/);
      if (urlMatch && familyMatch && weightMatch) {
        const url = urlMatch[1];
        const family = familyMatch[1];
        const weight = weightMatch[1];
        try {
          const fontRes = await fetch(url);
          const buf = await fontRes.arrayBuffer();
          const base64 = Buffer.from(buf).toString('base64');
          inlinedFontCss += `
@font-face {
  font-family: '${family}';
  font-style: normal;
  font-weight: ${weight};
  font-display: block;
  src: url(data:font/woff2;base64,${base64}) format('woff2');
}
`;
          console.log(`   Inlined ${family} ${weight}`);
        } catch (err) {
          console.warn('   Failed to fetch font', url, err.message);
        }
      }
    }
  }

  console.log('3. Building HTML template...');
  const htmlContent = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>Hub Manager Tour - Social Share Image</title>
  <style>
    ${inlinedFontCss}

    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
    }

    body {
      width: 1200px;
      height: 630px;
      overflow: hidden;
      background-color: #0c0b11;
      font-family: 'Inter', -apple-system, sans-serif;
      color: #f2f1f4;
      position: relative;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      padding: 42px 52px;
    }

    /* Ambient Nocturne Atmospheric Glows */
    .bg-glow-top {
      position: absolute;
      top: -150px;
      left: 50%;
      transform: translateX(-50%);
      width: 960px;
      height: 460px;
      background: radial-gradient(ellipse at center, rgba(96, 50, 187, 0.48) 0%, rgba(168, 143, 255, 0.16) 45%, transparent 75%);
      pointer-events: none;
      z-index: 0;
    }

    .bg-glow-bottom {
      position: absolute;
      bottom: -180px;
      left: 50%;
      transform: translateX(-50%);
      width: 820px;
      height: 380px;
      background: radial-gradient(ellipse at center, rgba(96, 50, 187, 0.28) 0%, rgba(168, 143, 255, 0.08) 40%, transparent 70%);
      pointer-events: none;
      z-index: 0;
    }

    .bg-grid {
      position: absolute;
      inset: 0;
      background-image: radial-gradient(rgba(255, 255, 255, 0.09) 1px, transparent 1px);
      background-size: 30px 30px;
      opacity: 0.65;
      pointer-events: none;
      z-index: 0;
    }

    /* Outer Border & Corner Accents */
    .outer-border {
      position: absolute;
      inset: 16px;
      border: 1px solid rgba(168, 143, 255, 0.18);
      border-radius: 24px;
      pointer-events: none;
      z-index: 1;
      box-shadow: inset 0 0 40px rgba(0, 0, 0, 0.5);
    }

    .corner-mark-tl {
      position: absolute;
      top: 16px;
      left: 16px;
      width: 44px;
      height: 44px;
      border-top: 2.5px solid #a88fff;
      border-left: 2.5px solid #a88fff;
      border-top-left-radius: 24px;
      z-index: 2;
    }

    .corner-mark-br {
      position: absolute;
      bottom: 16px;
      right: 16px;
      width: 44px;
      height: 44px;
      border-bottom: 2.5px solid #a88fff;
      border-right: 2.5px solid #a88fff;
      border-bottom-right-radius: 24px;
      z-index: 2;
    }

    /* Top Bar */
    .top-bar {
      position: relative;
      z-index: 3;
      display: flex;
      justify-content: space-between;
      align-items: center;
      width: 100%;
    }

    .badge-pill {
      display: inline-flex;
      align-items: center;
      gap: 10px;
      background: rgba(22, 20, 30, 0.85);
      border: 1px solid rgba(168, 143, 255, 0.3);
      border-radius: 100px;
      padding: 8px 18px;
      box-shadow: 0 4px 18px rgba(0, 0, 0, 0.4);
      backdrop-filter: blur(12px);
    }

    .badge-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: #a88fff;
      box-shadow: 0 0 10px #a88fff, 0 0 4px #ffffff;
    }

    .badge-label {
      font-family: 'Space Grotesk', sans-serif;
      font-size: 12.5px;
      font-weight: 700;
      letter-spacing: 0.12em;
      text-transform: uppercase;
      color: #ded9ff;
    }

    .company-tag {
      font-family: 'Space Grotesk', sans-serif;
      font-size: 13px;
      font-weight: 600;
      letter-spacing: 0.08em;
      color: #7b788a;
      text-transform: uppercase;
    }

    /* Main Center Card (Safe Zone for WhatsApp & Social Feeds) */
    .main-card {
      position: relative;
      z-index: 3;
      background: linear-gradient(180deg, rgba(25, 22, 36, 0.82) 0%, rgba(15, 13, 21, 0.92) 100%);
      border: 1px solid rgba(168, 143, 255, 0.25);
      border-radius: 24px;
      padding: 38px 48px 34px;
      box-shadow: 
        0 30px 70px -15px rgba(0, 0, 0, 0.75),
        0 0 60px -15px rgba(96, 50, 187, 0.35),
        inset 0 1px 0 rgba(255, 255, 255, 0.14);
      backdrop-filter: blur(20px);
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
      margin: 8px 0;
    }

    /* Brand Header Lockup */
    .brand-lockup {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 22px;
      margin-bottom: 20px;
    }

    .brand-icon-box {
      width: 68px;
      height: 68px;
      border-radius: 18px;
      background: #6032bb;
      box-shadow: 
        0 10px 28px rgba(96, 50, 187, 0.6),
        inset 0 1px 1px rgba(255, 255, 255, 0.35),
        0 0 0 1px rgba(168, 143, 255, 0.3);
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    .brand-icon-box svg {
      width: 44px;
      height: 44px;
    }

    .brand-title-wrap {
      text-align: left;
    }

    .brand-title {
      font-family: 'Space Grotesk', sans-serif;
      font-size: 38px;
      font-weight: 700;
      letter-spacing: -0.02em;
      line-height: 1.05;
      color: #ffffff;
    }

    .brand-title .tour-accent {
      color: #a88fff;
      text-shadow: 0 0 24px rgba(168, 143, 255, 0.5);
    }

    .brand-subtitle-micro {
      font-family: 'Space Grotesk', sans-serif;
      font-size: 13px;
      font-weight: 600;
      color: #8c899a;
      letter-spacing: 0.06em;
      margin-top: 4px;
      text-transform: uppercase;
    }

    /* Main Headline */
    .headline {
      font-family: 'Space Grotesk', sans-serif;
      font-size: 38px;
      font-weight: 700;
      letter-spacing: -0.025em;
      line-height: 1.2;
      color: #ffffff;
      max-width: 880px;
      margin-bottom: 12px;
    }

    .subheadline {
      font-size: 17.5px;
      line-height: 1.55;
      color: #aba8ba;
      max-width: 780px;
      margin-bottom: 24px;
    }

    .subheadline strong {
      color: #ffffff;
      font-weight: 600;
    }

    /* Feature Pills */
    .features-row {
      display: flex;
      flex-wrap: wrap;
      justify-content: center;
      gap: 12px;
      width: 100%;
    }

    .feature-pill {
      display: inline-flex;
      align-items: center;
      gap: 9px;
      background: rgba(255, 255, 255, 0.045);
      border: 1px solid rgba(255, 255, 255, 0.09);
      border-radius: 100px;
      padding: 8px 18px;
      font-size: 14px;
      font-weight: 500;
      color: #e2e0ea;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.25);
    }

    .pill-icon {
      width: 16px;
      height: 16px;
      stroke: #a88fff;
      fill: none;
      stroke-width: 2.2;
      stroke-linecap: round;
      stroke-linejoin: round;
    }

    /* Footer Row */
    .footer-bar {
      position: relative;
      z-index: 3;
      display: flex;
      justify-content: space-between;
      align-items: center;
      width: 100%;
      padding: 0 4px;
    }

    .footer-tags {
      display: flex;
      align-items: center;
      gap: 10px;
      font-size: 13.5px;
      color: #797688;
    }

    .footer-tags strong {
      color: #b7b4c8;
      font-weight: 600;
    }

    .footer-domain {
      font-family: 'Space Grotesk', sans-serif;
      font-size: 14px;
      font-weight: 600;
      color: #a88fff;
      letter-spacing: 0.03em;
      text-shadow: 0 0 16px rgba(168, 143, 255, 0.35);
    }
  </style>
</head>
<body>
  <div class="bg-glow-top"></div>
  <div class="bg-glow-bottom"></div>
  <div class="bg-grid"></div>
  <div class="outer-border"></div>
  <div class="corner-mark-tl"></div>
  <div class="corner-mark-br"></div>

  <!-- Top Bar -->
  <div class="top-bar">
    <div class="badge-pill">
      <div class="badge-dot"></div>
      <span class="badge-label">Sistema de Gestão de Turnês</span>
    </div>
    <div class="company-tag">
      Tríade Tecnologia & Soluções
    </div>
  </div>

  <!-- Center Safe Zone Card -->
  <div class="main-card">
    <div class="brand-lockup">
      <div class="brand-icon-box">
        <!-- Official Soundwave Brandmark (Vector from Brand Manual) -->
        <svg viewBox="0 0 64 64" fill="none">
          <rect x="8" y="30" width="7" height="10" rx="3.5" fill="white" />
          <rect x="20" y="20" width="7" height="24" rx="3.5" fill="white" />
          <rect x="32" y="8" width="7" height="40" rx="3.5" fill="white" />
          <rect x="44" y="22" width="7" height="20" rx="3.5" fill="white" />
        </svg>
      </div>
      <div class="brand-title-wrap">
        <div class="brand-title">Hub Manager <span class="tour-accent">Tour</span></div>
        <div class="brand-subtitle-micro">Controle de Estrada & Produção</div>
      </div>
    </div>

    <h1 class="headline">
      Gestão de Turnês para Produtoras de Música
    </h1>

    <p class="subheadline">
      Controle em tempo real de <strong>logística de voos e hotéis</strong>, <strong>exigências documentais</strong> por show e comunicação direta com a equipe de estrada.
    </p>

    <div class="features-row">
      <div class="feature-pill">
        <svg class="pill-icon" viewBox="0 0 24 24"><path d="M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.2c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z"/></svg>
        <span>Logística & Voos</span>
      </div>
      <div class="feature-pill">
        <svg class="pill-icon" viewBox="0 0 24 24"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
        <span>Exigências por Show</span>
      </div>
      <div class="feature-pill">
        <svg class="pill-icon" viewBox="0 0 24 24"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
        <span>Equipe & Staff</span>
      </div>
      <div class="feature-pill">
        <svg class="pill-icon" viewBox="0 0 24 24"><rect x="5" y="2" width="14" height="20" rx="2" ry="2"/><line x1="12" y1="18" x2="12.01" y2="18"/></svg>
        <span>Área do Músico (Mobile)</span>
      </div>
    </div>
  </div>

  <!-- Footer Bar -->
  <div class="footer-bar">
    <div class="footer-tags">
      <span>Identidade Visual</span>
      <span style="color: #4b4857;">•</span>
      <strong>Nocturne</strong>
      <span style="color: #4b4857;">•</span>
      <span>Onda Sonora</span>
    </div>
    <div class="footer-domain">
      hubmanagertour.triadetecnologiaesolucoes.com.br
    </div>
  </div>
</body>
</html>`;

  fs.writeFileSync('temp_og_rendered.html', htmlContent);
  console.log('4. HTML written to temp_og_rendered.html');

  console.log('5. Rendering image with Playwright...');
  const fileUrl = 'file:///' + path.resolve('temp_og_rendered.html').replace(/\\/g, '/');
  execSync(`npx playwright screenshot --channel chrome --viewport-size "1200, 630" --wait-for-timeout 1000 "${fileUrl}" "public/og-image.png"`, {
    stdio: 'inherit'
  });

  console.log('6. og-image.png updated successfully in public/og-image.png!');
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
