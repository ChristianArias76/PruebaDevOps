# PruebaDevOps

Proyecto base en HTML, CSS y JavaScript para pruebas de DevOps.

## Requisitos

- Node.js 20 o superior

## Uso

```bash
npm start
```

Abre http://localhost:3000 (el puerto se cambia con la variable `PORT`).

`GET /health` responde `{"status":"ok","version":"x.y.z"}` para monitoreo.

## Pruebas

```bash
npm test
npm run test:coverage
```

## Integración continua

El workflow [`.github/workflows/ci.yml`](.github/workflows/ci.yml) ejecuta las pruebas
con cobertura en cada push y en cada pull request hacia `main`, sobre Node 20, 22 y 24.

## Estructura

```
public/
  index.html
  css/styles.css
  js/app.js
test/
  server.test.js pruebas con node:test
server.js      servidor estático sin dependencias
package.json
```
