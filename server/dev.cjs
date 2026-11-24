/*
 * Local movie API for development. Vite proxies /api/* here, so the browser
 * talks to the same origin and never sees the OMDb key.
 *
 * Run it with `npm run dev` (starts Vite too) or `npm run dev:api`.
 * Put OMDB_API_KEY in .env.local.
 */

'use strict';

const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { handler } = require('./movies.cjs');

const ROOT = path.resolve(__dirname, '..');

function loadEnvFile(file) {
  if (!fs.existsSync(file)) return;
  const contents = fs.readFileSync(file, 'utf8');
  for (const rawLine of contents.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const equals = line.indexOf('=');
    if (equals <= 0) continue;
    const key = line.slice(0, equals).trim();
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(key)) continue;
    let value = line.slice(equals + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (process.env[key] === undefined) process.env[key] = value;
  }
}

loadEnvFile(path.join(ROOT, '.env.local'));
loadEnvFile(path.join(ROOT, '.env'));

const PORT = Number(process.env.MOVIE_API_PORT || 8787);

const server = http.createServer(async (request, response) => {
  const url = new URL(request.url || '/', `http://${request.headers.host}`);

  if (url.pathname !== '/api/movies') {
    response.writeHead(404, { 'content-type': 'application/json' });
    response.end(JSON.stringify({ error: 'Not found.' }));
    return;
  }

  try {
    const result = await handler({
      requestContext: { http: { method: request.method } },
      queryStringParameters: Object.fromEntries(url.searchParams),
      headers: request.headers,
    });
    response.writeHead(result.statusCode, result.headers);
    response.end(result.body);
  } catch (error) {
    console.error('Local movie API failed', error);
    response.writeHead(500, { 'content-type': 'application/json' });
    response.end(JSON.stringify({ error: 'Movie lookup failed unexpectedly.' }));
  }
});

server.listen(PORT, () => {
  const configured = Boolean((process.env.OMDB_API_KEY || '').trim());
  console.log(
    `Movie API listening on http://localhost:${PORT}/api/movies ` +
      (configured
        ? '(OMDb key configured)'
        : '(OMDB_API_KEY is missing; movie lookup will return 503)'),
  );
});

function shutdown() {
  server.close(() => process.exit(0));
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
