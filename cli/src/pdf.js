import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { execFileSync } from 'node:child_process';
import { PDF_FOOTER_HEIGHT, resolvedColors } from './theme.js';

const CANDIDATES = {
  darwin: [
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/Applications/Chromium.app/Contents/MacOS/Chromium',
    '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
    '/Applications/Brave Browser.app/Contents/MacOS/Brave Browser',
    '/Applications/Arc.app/Contents/MacOS/Arc',
    '/Applications/Vivaldi.app/Contents/MacOS/Vivaldi',
  ],
  linux: ['google-chrome', 'google-chrome-stable', 'chromium', 'chromium-browser', 'microsoft-edge', 'brave-browser'],
  win32: [
    path.join(process.env.PROGRAMFILES ?? 'C:\\Program Files', 'Google\\Chrome\\Application\\chrome.exe'),
    path.join(process.env['PROGRAMFILES(X86)'] ?? 'C:\\Program Files (x86)', 'Google\\Chrome\\Application\\chrome.exe'),
    path.join(process.env['PROGRAMFILES(X86)'] ?? 'C:\\Program Files (x86)', 'Microsoft\\Edge\\Application\\msedge.exe'),
    path.join(process.env.LOCALAPPDATA ?? '', 'Google\\Chrome\\Application\\chrome.exe'),
  ],
};

export function findBrowser(explicit) {
  const fromEnv = process.env.MDP_BROWSER || process.env.CHROME_PATH || process.env.PUPPETEER_EXECUTABLE_PATH;
  for (const p of [explicit, fromEnv].filter(Boolean)) {
    if (fs.existsSync(p)) return p;
    throw new Error(`Browser not found at: ${p}`);
  }
  const platform = os.platform();
  for (const c of CANDIDATES[platform] ?? []) {
    if (path.isAbsolute(c)) {
      if (fs.existsSync(c)) return c;
    } else {
      try {
        return execFileSync('which', [c], { encoding: 'utf8' }).trim();
      } catch {
        /* not on PATH */
      }
    }
  }
  return null;
}

/** Render a full HTML string to a PDF file using a locally installed Chromium-based browser. */
export async function htmlToPdf(html, outFile, config, { hasMermaid = false } = {}) {
  const executablePath = findBrowser(config.pdf.browserPath);
  if (!executablePath) {
    throw new Error(
      'PDF output needs Chrome, Chromium, Edge or Brave. None was found automatically — ' +
        'set pdf.browserPath in your config, pass --browser <path>, or set MDP_BROWSER.',
    );
  }
  const { default: puppeteer } = await import('puppeteer-core');
  const browser = await puppeteer.launch({
    executablePath,
    headless: true,
    args: ['--no-sandbox', '--disable-gpu', '--font-render-hinting=none'],
  });
  try {
    const page = await browser.newPage();
    const scheme = config.page.mode === 'dark' ? 'dark' : 'light';
    await page.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: scheme }]);
    await page.setContent(html, { waitUntil: 'networkidle0', timeout: 60_000 });
    await page.evaluate(() => document.fonts.ready);
    if (hasMermaid) {
      await page.waitForFunction('window.__mdpMermaidDone === true', { timeout: 30_000 }).catch(() => {
        console.warn('warning: Mermaid diagrams did not finish rendering (offline?)');
      });
    }

    // Page margins live in the document CSS (see buildPdfCss) so the paper
    // pattern can bleed to the edge; only the page-number strip is a real margin.
    const margin = { top: 0, right: 0, left: 0, bottom: config.pdf.pageNumbers ? PDF_FOOTER_HEIGHT : 0 };
    const footer = `<div style="width:100%;font:9px system-ui,sans-serif;color:${resolvedColors(config).muted};text-align:center;">
<span class="pageNumber"></span> / <span class="totalPages"></span></div>`;
    await page.pdf({
      path: outFile,
      format: config.pdf.format,
      landscape: config.pdf.landscape,
      printBackground: true,
      margin,
      displayHeaderFooter: config.pdf.pageNumbers,
      headerTemplate: '<span></span>',
      footerTemplate: config.pdf.pageNumbers ? footer : '<span></span>',
      outline: true,
      tagged: true,
    });
  } finally {
    await browser.close();
  }
}
