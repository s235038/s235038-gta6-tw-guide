import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, resolve, sep } from 'node:path';

const dist = resolve('dist');
const base = '/s235038-gta6-tw-guide/';
const mime = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8',
};

// Serve the exact build with project-site routing and a Pages-style 404 response.
const notFound = await readFile(resolve(dist, '404.html'));

createServer(async (request, response) => {
  const url = new URL(request.url ?? '/', 'http://localhost');
  let pathname;
  try {
    pathname = decodeURIComponent(url.pathname);
  } catch {
    response.writeHead(400).end();
    return;
  }

  if (pathname === base.slice(0, -1)) {
    response.writeHead(308, { Location: `${base}${url.search}` }).end();
    return;
  }

  const file = resolve(dist, pathname.slice(base.length));
  if (!pathname.startsWith(base) || (file !== dist && !file.startsWith(dist + sep))) {
    response.writeHead(404, { 'Content-Type': mime['.html'] }).end(notFound);
    return;
  }

  try {
    const directory = (await stat(file)).isDirectory();
    const target = directory ? resolve(file, 'index.html') : file;
    const content = await readFile(target);
    if (directory && !pathname.endsWith('/')) {
      response.writeHead(308, { Location: `${url.pathname}/${url.search}` }).end();
      return;
    }
    response.writeHead(200, { 'Content-Type': mime[extname(target)] ?? 'application/octet-stream' });
    response.end(request.method === 'HEAD' ? undefined : content);
  } catch {
    response.writeHead(404, { 'Content-Type': mime['.html'] });
    response.end(request.method === 'HEAD' ? undefined : notFound);
  }
}).listen(4317, '127.0.0.1');
