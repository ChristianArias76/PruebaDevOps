'use strict';

const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const { createServer } = require('../server');
const { version } = require('../package.json');

let server;
let baseUrl;

before(async () => {
  server = createServer();
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(() => new Promise((resolve) => server.close(resolve)));

// fetch normaliza "/../", así que las rutas de path traversal se envían tal cual con http.request.
function rawGet(rawPath) {
  return new Promise((resolve, reject) => {
    const { port } = server.address();
    http
      .request({ host: '127.0.0.1', port, path: rawPath, method: 'GET' }, (res) => {
        res.resume();
        res.on('end', () => resolve(res.statusCode));
      })
      .on('error', reject)
      .end();
  });
}

// --- Funcionalidad: /health (HU-09) ---

test('GET /health responde 200 con estado y versión', async () => {
  const res = await fetch(`${baseUrl}/health`);
  assert.equal(res.status, 200);
  assert.match(res.headers.get('content-type'), /^application\/json/);
  assert.deepEqual(await res.json(), { status: 'ok', version });
});

test('GET /health no se cachea', async () => {
  const res = await fetch(`${baseUrl}/health`);
  assert.equal(res.headers.get('cache-control'), 'no-store');
});

test('CS-09.1: /health no expone datos del entorno ni del sistema', async () => {
  const res = await fetch(`${baseUrl}/health`);
  const body = await res.json();
  assert.deepEqual(Object.keys(body).sort(), ['status', 'version']);
  const texto = JSON.stringify(body);
  assert.doesNotMatch(texto, /node|win32|linux|darwin|[A-Z]:\\|\/home\//i);
});

test('HEAD /health responde 200 sin cuerpo', async () => {
  const res = await fetch(`${baseUrl}/health`, { method: 'HEAD' });
  assert.equal(res.status, 200);
  assert.equal(await res.text(), '');
});

test('POST /health responde 405', async () => {
  const res = await fetch(`${baseUrl}/health`, { method: 'POST' });
  assert.equal(res.status, 405);
});

// --- Contenido estático (HU-03) ---

test('GET / sirve index.html', async () => {
  const res = await fetch(`${baseUrl}/`);
  assert.equal(res.status, 200);
  assert.match(res.headers.get('content-type'), /^text\/html/);
  assert.match(await res.text(), /<title>Prueba DevOps<\/title>/);
});

test('CSS y JS se sirven con su tipo MIME', async () => {
  const css = await fetch(`${baseUrl}/css/styles.css`);
  const js = await fetch(`${baseUrl}/js/app.js`);
  assert.match(css.headers.get('content-type'), /^text\/css/);
  assert.match(js.headers.get('content-type'), /^text\/javascript/);
});

test('ruta inexistente responde 404', async () => {
  const res = await fetch(`${baseUrl}/noexiste.html`);
  assert.equal(res.status, 404);
});

// --- Criterios de seguridad (HU-03) ---

test('CS-03.1: path traversal nunca responde 200', async () => {
  const rutas = ['/../package.json', '/..%2fpackage.json', '/%2e%2e/server.js', '/..%5cserver.js'];
  for (const ruta of rutas) {
    const status = await rawGet(ruta);
    assert.ok([403, 404].includes(status), `${ruta} respondió ${status}`);
  }
});

test('CS-03.2: POST, PUT y DELETE responden 405', async () => {
  for (const method of ['POST', 'PUT', 'DELETE']) {
    const res = await fetch(`${baseUrl}/`, { method });
    assert.equal(res.status, 405, method);
  }
});

test('CS-03.3: las respuestas incluyen cabeceras de seguridad', async () => {
  for (const ruta of ['/', '/health', '/noexiste']) {
    const res = await fetch(`${baseUrl}${ruta}`);
    assert.ok(res.headers.get('content-security-policy'), `${ruta} sin CSP`);
    assert.equal(res.headers.get('x-content-type-options'), 'nosniff');
    assert.equal(res.headers.get('referrer-policy'), 'no-referrer');
  }
});

test('CS-03.4: una URL mal codificada responde 400 genérico', async () => {
  const res = await fetch(`${baseUrl}/%E0%A4%A`);
  assert.equal(res.status, 400);
  assert.equal(await res.text(), 'Solicitud inválida');
});
