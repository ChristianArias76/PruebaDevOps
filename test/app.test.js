'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { textoEstado, consultarEstado } = require('../public/js/app');

const fakeResponse = (status, body) => ({
  ok: status >= 200 && status < 300,
  status,
  json: async () => (typeof body === 'function' ? body() : body),
});

// --- textoEstado ---

test('textoEstado: respuesta válida muestra en línea con la versión', () => {
  assert.deepEqual(textoEstado({ status: 'ok', version: '1.2.3' }), {
    texto: 'Servidor en línea · v1.2.3',
    ok: true,
  });
});

test('textoEstado: respuestas incompletas o inválidas muestran no disponible', () => {
  const invalidas = [null, undefined, {}, { status: 'ok' }, { status: 'down', version: '1.0.0' }, { status: 'ok', version: 1 }];
  for (const data of invalidas) {
    assert.deepEqual(textoEstado(data), { texto: 'Servidor no disponible', ok: false }, JSON.stringify(data));
  }
});

// --- consultarEstado ---

test('consultarEstado: llama a health sin caché y devuelve en línea', async () => {
  let llamada;
  const fetchFn = async (url, opciones) => {
    llamada = { url, opciones };
    return fakeResponse(200, { status: 'ok', version: '1.0.0' });
  };
  const r = await consultarEstado(fetchFn);
  assert.equal(llamada.url, 'health');
  assert.equal(llamada.opciones.cache, 'no-store');
  assert.deepEqual(r, { texto: 'Servidor en línea · v1.0.0', ok: true });
});

test('consultarEstado: un error HTTP se muestra como no disponible', async () => {
  const r = await consultarEstado(async () => fakeResponse(500, { status: 'ok', version: '1.0.0' }));
  assert.equal(r.ok, false);
});

test('consultarEstado: un fallo de red se muestra como no disponible', async () => {
  const r = await consultarEstado(async () => {
    throw new TypeError('fetch failed');
  });
  assert.equal(r.ok, false);
});

test('consultarEstado: un JSON inválido se muestra como no disponible', async () => {
  const r = await consultarEstado(async () =>
    fakeResponse(200, () => {
      throw new SyntaxError('Unexpected token');
    })
  );
  assert.equal(r.ok, false);
});

// --- Criterios de seguridad ---

test('CS-02.2: app.js no usa innerHTML, outerHTML ni eval', () => {
  const fuente = fs.readFileSync(path.join(__dirname, '..', 'public', 'js', 'app.js'), 'utf8');
  assert.doesNotMatch(fuente, /\b(innerHTML|outerHTML|insertAdjacentHTML|eval)\b|new Function/);
});

test('CS-02.3: index.html no tiene scripts ni estilos inline', () => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'public', 'index.html'), 'utf8');
  assert.doesNotMatch(html, /<script(?![^>]*\bsrc=)[^>]*>/i, 'script inline');
  assert.doesNotMatch(html, /\sstyle\s*=|<style/i, 'estilo inline');
  assert.doesNotMatch(html, /\son[a-z]+\s*=/i, 'manejador de eventos inline');
});
