'use strict';

// Arma el texto del indicador a partir de la respuesta de /health.
function textoEstado(data) {
  if (data && data.status === 'ok' && typeof data.version === 'string') {
    return { texto: `Servidor en línea · v${data.version}`, ok: true };
  }
  return { texto: 'Servidor no disponible', ok: false };
}

// Consulta /health; cualquier fallo (red, HTTP, JSON inválido) se muestra como no disponible.
async function consultarEstado(fetchFn = fetch) {
  try {
    const res = await fetchFn('health', { cache: 'no-store' });
    if (!res.ok) return textoEstado(null);
    return textoEstado(await res.json());
  } catch {
    return textoEstado(null);
  }
}

if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', async () => {
    const estado = document.getElementById('estado');
    const { texto, ok } = await consultarEstado();
    estado.textContent = texto;
    estado.classList.toggle('estado--error', !ok);
  });
}

// Permite importar las funciones desde las pruebas en Node.
if (typeof module !== 'undefined') {
  module.exports = { textoEstado, consultarEstado };
}
