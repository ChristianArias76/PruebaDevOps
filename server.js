// Servidor estático mínimo, sin dependencias: sirve únicamente el contenido de /public.
const http = require('http');
const fs = require('fs');
const path = require('path');

const { version: VERSION } = require('./package.json');

const PORT = Number(process.env.PORT) || 3000;
const PUBLIC_DIR = path.join(__dirname, 'public');

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
};

const SECURITY_HEADERS = {
  'Content-Security-Policy': "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; object-src 'none'; base-uri 'self'; frame-ancestors 'none'",
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'no-referrer',
};

function send(res, status, body, type = 'text/plain; charset=utf-8', extraHeaders = {}) {
  res.writeHead(status, { 'Content-Type': type, ...SECURITY_HEADERS, ...extraHeaders });
  res.end(body);
}

// Health check (HU-09): solo estado y versión, sin datos del entorno ni del sistema.
function health(req, res) {
  const body = JSON.stringify({ status: 'ok', version: VERSION });
  send(res, 200, req.method === 'HEAD' ? undefined : body, 'application/json; charset=utf-8', {
    'Cache-Control': 'no-store',
  });
}

function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    return send(res, 405, 'Método no permitido');
  }

  let urlPath;
  try {
    urlPath = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
  } catch {
    return send(res, 400, 'Solicitud inválida');
  }
  if (urlPath === '/health') return health(req, res);
  if (urlPath === '/') urlPath = '/index.html';

  // Evita salir de /public (path traversal).
  const filePath = path.join(PUBLIC_DIR, path.normalize(urlPath));
  if (!filePath.startsWith(PUBLIC_DIR + path.sep)) {
    return send(res, 403, 'Prohibido');
  }

  fs.readFile(filePath, (err, data) => {
    if (err) {
      return err.code === 'ENOENT'
        ? send(res, 404, 'No encontrado')
        : send(res, 500, 'Error interno');
    }
    const type = MIME[path.extname(filePath).toLowerCase()] || 'application/octet-stream';
    send(res, 200, req.method === 'HEAD' ? undefined : data, type);
  });
}

function createServer() {
  return http.createServer(handler);
}

// Solo escucha cuando se ejecuta directo (npm start); las pruebas importan createServer.
if (require.main === module) {
  createServer().listen(PORT, () => {
    console.log(`Servidor escuchando en http://localhost:${PORT}`);
  });
}

module.exports = { createServer };
