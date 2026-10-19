import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { merge } from './config.js';
import { loadDocument, renderDocument, escapeHtml } from './render.js';

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

const errorPage = (message) => `<!doctype html><meta charset="utf-8"><title>Error</title>${RELOAD_CLIENT}
<pre style="font:14px/1.5 monospace;padding:24px;color:#b3261e;white-space:pre-wrap">${escapeHtml(message)}</pre>`;

/** Live-reload event stream shared by the file and folder servers. */
function reloadHub() {
  const clients = new Set();
  return {
    handle(req, res) {
      res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' });
      res.write(': connected\n\n');
      clients.add(res);
      req.on('close', () => clients.delete(res));
    },
    reload() {
      for (const res of clients) res.write('data: reload\n\n');
    },
  };
}

/** Resolve a URL path to a file inside `root` (a folder maps to its index.html), or null. */
function fileIn(root, pathname) {
  let rel;
  try {
    rel = decodeURIComponent(pathname);
  } catch {
    return null;
  }
  let file = path.resolve(root, '.' + rel);
  if (file !== root && !file.startsWith(root + path.sep)) return null;
  if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, 'index.html');
  return fs.existsSync(file) && fs.statSync(file).isFile() ? file : null;
}

function sendFile(res, file) {
  res.writeHead(200, { 'Content-Type': MIME[path.extname(file).toLowerCase()] ?? 'application/octet-stream', 'Cache-Control': 'no-store' });
  fs.createReadStream(file).pipe(res);
}

/** Listen on `port`, moving to the next free port if it is taken. */
function listen(server, { port, host, onListening }) {
  let attempts = 0;
  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE' && attempts < 20) {
      attempts++;
      server.listen(++port, host);
    } else throw err;
  });
  server.on('listening', () => onListening(`http://${host}:${port}/`));
  server.listen(port, host);
  return server;
}

/**
 * Serve a rendered Markdown file with live reload. Files next to the Markdown
 * (images, etc.) are served from the same directory.
 */
export function serve(inputPath, options) {
  return fs.statSync(path.resolve(inputPath)).isDirectory() ? serveSite(inputPath, options) : serveFile(inputPath, options);
}

function serveFile(inputPath, { port = 4321, host = 'localhost', configPath, discover, cli, onReady, log }) {
  const absInput = path.resolve(inputPath);
  const root = path.dirname(absInput);
  const hub = reloadHub();

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
          hub.reload();
        }, 60);
      }),
    );
    watched.key = key;
  }

  const server = http.createServer((req, res) => {
    const url = new URL(req.url, 'http://x');
    if (url.pathname === '/__mdp/events') return hub.handle(req, res);
    if (url.pathname === '/' || url.pathname === '/index.html') {
      let html;
      try {
        html = render();
      } catch (err) {
        html = errorPage(err.message);
        log(`error: ${err.message}`);
      }
      res.writeHead(200, { 'Content-Type': MIME['.html'], 'Cache-Control': 'no-store' });
      res.end(html);
      return;
    }
    // Static files from the document's directory, without escaping it.
    const file = fileIn(root, url.pathname);
    if (!file) {
      res.writeHead(404, { 'Content-Type': 'text/plain' }).end('Not found');
      return;
    }
    sendFile(res, file);
  });

  return listen(server, {
    port,
    host,
    onListening(url) {
      try {
        render(); // validate and start watching before the first request
      } catch (err) {
        log(`error: ${err.message}`);
      }
      onReady(url);
    },
  });
}

/** Watch a folder tree, using one recursive watcher where the platform supports it. */
function watchTree(root, onChange) {
  const skip = (rel) => rel.split(/[\\/]/).some((part) => part.startsWith('.') || part === 'node_modules');
  try {
    const w = fs.watch(root, { recursive: true }, (_e, name) => name && !skip(name.toString()) && onChange(name.toString()));
    return () => w.close();
  } catch {
    // Older Node on Linux has no recursive watching: watch every folder instead.
    const watchers = [];
    (function add(dir) {
      watchers.push(fs.watch(dir, (_e, name) => name && onChange(path.relative(root, path.join(dir, name.toString())))));
      for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
        if (e.isDirectory() && !skip(e.name)) add(path.join(dir, e.name));
      }
    })(root);
    return () => watchers.forEach((w) => w.close());
  }
}

/**
 * Serve a folder as a docs site with live reload. The site is built into a
 * temporary folder and rebuilt whenever anything in the source folder changes.
 * Other files in the source folder (PDFs, downloads, ...) are served as they are.
 */
async function serveSite(inputPath, { port = 4321, host = 'localhost', configPath, discover, cli, title, onReady, log }) {
  const { buildSite } = await import('./site.js');
  const root = path.resolve(inputPath);
  const outDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mdp-site-'));
  const hub = reloadHub();
  let error = null;

  function build() {
    try {
      fs.rmSync(outDir, { recursive: true, force: true });
      const site = buildSite(root, {
        outDir,
        configPath,
        discover,
        // Embed images: the built pages live in a temporary folder.
        cli: merge(cli, { output: { selfContained: true } }),
        title,
        extraHead: RELOAD_CLIENT,
      });
      for (const w of site.warnings) log(`warning: ${w}`);
      error = null;
      return site;
    } catch (err) {
      error = err.message;
      log(`error: ${err.message}`);
      return null;
    }
  }

  let timer;
  const stopWatching = watchTree(root, (rel) => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      log(`changed: ${rel}`);
      build();
      hub.reload();
    }, 100);
  });

  const cleanup = () => {
    stopWatching();
    fs.rmSync(outDir, { recursive: true, force: true });
  };
  process.once('exit', cleanup);
  for (const sig of ['SIGINT', 'SIGTERM']) process.once(sig, () => process.exit(130));

  const server = http.createServer((req, res) => {
    const url = new URL(req.url, 'http://x');
    if (url.pathname === '/__mdp/events') return hub.handle(req, res);
    if (error) {
      res.writeHead(500, { 'Content-Type': MIME['.html'], 'Cache-Control': 'no-store' });
      res.end(errorPage(error));
      return;
    }
    const file = fileIn(outDir, url.pathname) ?? fileIn(root, url.pathname);
    if (!file) {
      res.writeHead(404, { 'Content-Type': 'text/plain' }).end('Not found');
      return;
    }
    sendFile(res, file);
  });
  server.on('close', cleanup);

  const site = build();
  if (site) log(`built ${site.pages.length} page${site.pages.length === 1 ? '' : 's'}`);
  return listen(server, { port, host, onListening: onReady });
}
