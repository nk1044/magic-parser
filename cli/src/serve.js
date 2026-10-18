import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { loadDocument, renderDocument } from './render.js';

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
  '.ico': 'image/x-icon',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.pdf': 'application/pdf',
  '.woff2': 'font/woff2',
};

const RELOAD_CLIENT = `<script>
(function () {
  var es = new EventSource('/__mdp/events');
  es.onmessage = function (e) {
    if (e.data !== 'reload') return;
    sessionStorage.setItem('mdp-scroll', String(scrollY));
    location.reload();
  };
  var y = sessionStorage.getItem('mdp-scroll');
  if (y) { sessionStorage.removeItem('mdp-scroll'); addEventListener('load', function () { scrollTo(0, +y); }); }
})();
</script>`;

/**
 * Serve a rendered Markdown file with live reload. Files next to the Markdown
 * (images, etc.) are served from the same directory.
 */
export function serve(inputPath, { port = 4321, host = 'localhost', configPath, discover, cli, onReady, log }) {
  const absInput = path.resolve(inputPath);
  const root = path.dirname(absInput);
  const clients = new Set();

  let watched = [];
  function render() {
    const doc = loadDocument(absInput, { configPath, discover, cli });
    const out = renderDocument(doc, { imageMode: 'link', outDir: root, extraHead: RELOAD_CLIENT });
    for (const w of out.warnings) log(`warning: ${w}`);
    rewatch([absInput, doc.configFile, doc.config.css && path.resolve(root, doc.config.css)].filter(Boolean));
    return out.html;
  }

  function rewatch(files) {
    const key = files.join('|');
    if (watched.key === key) return;
    watched.forEach((w) => w.close());
    let timer;
    // Watch directories rather than files: editors that save atomically
    // (write temp + rename) would otherwise detach a per-file watcher.
    const targets = new Set(files);
    const dirs = [...new Set(files.map((f) => path.dirname(f)))].filter((d) => fs.existsSync(d));
    watched = dirs.map((dir) =>
      fs.watch(dir, (_event, name) => {
        const f = name && path.join(dir, name.toString());
        if (!f || !targets.has(f)) return;
        clearTimeout(timer);
        timer = setTimeout(() => {
          log(`changed: ${path.relative(process.cwd(), f)}`);
          for (const res of clients) res.write('data: reload\n\n');
        }, 60);
      }),
    );
    watched.key = key;
  }

  const server = http.createServer((req, res) => {
    const url = new URL(req.url, 'http://x');
    if (url.pathname === '/__mdp/events') {
      res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' });
      res.write(': connected\n\n');
      clients.add(res);
      req.on('close', () => clients.delete(res));
      return;
    }
    if (url.pathname === '/' || url.pathname === '/index.html') {
      let html;
      try {
        html = render();
      } catch (err) {
        html = `<!doctype html><meta charset="utf-8"><title>Error</title>${RELOAD_CLIENT}
<pre style="font:14px/1.5 monospace;padding:24px;color:#b3261e;white-space:pre-wrap">${String(err.message).replace(/</g, '&lt;')}</pre>`;
        log(`error: ${err.message}`);
      }
      res.writeHead(200, { 'Content-Type': MIME['.html'], 'Cache-Control': 'no-store' });
      res.end(html);
      return;
    }
    // Static files from the document's directory, without escaping it.
    let rel;
    try {
      rel = decodeURIComponent(url.pathname);
    } catch {
      res.writeHead(400).end();
      return;
    }
    const file = path.resolve(root, '.' + rel);
    if (!file.startsWith(root + path.sep) || !fs.existsSync(file) || !fs.statSync(file).isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/plain' }).end('Not found');
      return;
    }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(file).toLowerCase()] ?? 'application/octet-stream' });
    fs.createReadStream(file).pipe(res);
  });

  let attempts = 0;
  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE' && attempts < 20) {
      attempts++;
      server.listen(++port, host);
    } else throw err;
  });
  server.on('listening', () => {
    try {
      render(); // validate and start watching before the first request
    } catch (err) {
      log(`error: ${err.message}`);
    }
    onReady(`http://${host}:${port}/`);
  });
  server.listen(port, host);
  return server;
}
