# PruebaDevOps

Proyecto base en HTML, CSS y JavaScript para pruebas de DevOps.

## Requisitos

- Node.js 18 o superior

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
