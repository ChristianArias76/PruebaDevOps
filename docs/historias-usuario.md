# Historias de usuario — Pipeline DevOps

Cada historia incluye criterios de aceptación (CA-xx.n) y criterios de seguridad
(CS-xx.n) redactados como Dado / Cuando / Entonces. Entre paréntesis se indica la
regla de `cmh-dev-seguridad` que cubre cada criterio de seguridad (R1–R14).

---

## HU-01 · Integración continua en cada cambio

**Como** desarrollador **quiero** que cada push y cada PR ejecuten el pipeline **para** detectar errores antes de integrar a `main`.

**Criterios de aceptación**
- **CA-01.1** Dado un push o un PR hacia `main`, cuando se publica, entonces se ejecuta el workflow de CI.
- **CA-01.2** El workflow instala dependencias con `npm ci` sobre la versión de Node definida en `engines`.
- **CA-01.3** El resultado del pipeline aparece en el PR.

**Criterios de seguridad**
- **CS-01.1** *(R1)* Dado un PR con el CI en rojo, cuando alguien intenta fusionarlo, entonces GitHub lo bloquea por la protección de rama, sin depender de que el revisor lo note.
- **CS-01.2** *(R2)* Dado un push directo a `main`, cuando se ejecuta, entonces se rechaza; solo entra por PR con al menos una aprobación.
- **CS-01.3** *(R2)* Dado cualquier job, cuando corre, entonces su `GITHUB_TOKEN` tiene solo `contents: read`; cualquier permiso adicional se declara de forma explícita en ese job.
- **CS-01.4** *(R8)* Dado un PR que viene de un fork, cuando se ejecuta el CI, entonces no recibe ningún secreto del repo.

---

## HU-02 · Análisis estático (lint)

**Como** desarrollador **quiero** que JS, HTML y CSS pasen por linters **para** mantener la calidad y detectar errores comunes.

**Criterios de aceptación**
- **CA-02.1** `npm run lint` revisa `public/` y `server.js`.
- **CA-02.2** El CI falla si hay errores de lint; las advertencias no bloquean.
- **CA-02.3** Las reglas están versionadas en el repo.

**Criterios de seguridad**
- **CS-02.1** *(R10)* Dado un código que usa `eval`, `new Function` o `setTimeout` con un string, cuando corre el lint, entonces falla.
- **CS-02.2** *(R10)* Dado un código que asigna `innerHTML` u `outerHTML` con datos dinámicos, cuando corre el lint, entonces falla y exige `textContent`.
- **CS-02.3** *(R10)* Dado un `<script>` o un `style=""` inline en el HTML, cuando corre la validación, entonces falla, porque la CSP los bloquearía.
- **CS-02.4** *(R8)* Dado el artefacto final, cuando se inspecciona, entonces no contiene ningún linter ni `devDependencies`.

---

## HU-03 · Pruebas automatizadas

**Como** equipo **quiero** pruebas unitarias y de integración del servidor **para** asegurar que cada cambio no rompe lo existente.

**Criterios de aceptación**
- **CA-03.1** `npm test` ejecuta las pruebas con `node:test`, sin dependencias externas.
- **CA-03.2** Se prueba: 200 en `/`, 404 en una ruta inexistente y el MIME correcto de CSS y JS.
- **CA-03.3** La cobertura de `server.js` es del 80 % o más; si una prueba falla, el pipeline se detiene.

**Criterios de seguridad**
- **CS-03.1** *(R1)* Dadas rutas como `/..%2fpackage.json`, `/%2e%2e/server.js` y `/..\\server.js`, cuando se solicitan, entonces responden 403 o 404, nunca 200.
- **CS-03.2** *(R1)* Dado un POST, PUT o DELETE, cuando se envía, entonces responde 405.
- **CS-03.3** *(R10)* Dada cualquier respuesta, cuando se inspeccionan sus cabeceras, entonces incluye `Content-Security-Policy`, `X-Content-Type-Options: nosniff` y `Referrer-Policy`.
- **CS-03.4** *(R11)* Dado un error interno provocado en la prueba, cuando se responde, entonces el cuerpo es genérico, sin stack trace ni rutas del disco.

---

## HU-04 · Escaneo de dependencias y secretos

**Como** responsable de seguridad **quiero** detectar dependencias vulnerables y secretos filtrados **para** no publicar código comprometido.

**Criterios de aceptación**
- **CA-04.1** El CI ejecuta `npm audit --audit-level=high`.
- **CA-04.2** Dependabot está activo para npm y para GitHub Actions.
- **CA-04.3** Un escáner de secretos revisa cada push.

**Criterios de seguridad**
- **CS-04.1** *(R12)* Dada una dependencia con una vulnerabilidad alta o crítica, cuando corre el CI, entonces el pipeline falla.
- **CS-04.2** *(R8)* Dado un commit que contiene un token o una clave, cuando se intenta hacer push, entonces push protection lo rechaza antes de que entre al repo.
- **CS-04.3** *(R8)* Dado un secreto detectado después de entrar, cuando se atiende, entonces se **rota la credencial**; borrarla del historial no basta y el procedimiento queda documentado.
- **CS-04.4** *(R4)* Dado el CI, cuando instala dependencias, entonces usa `npm ci` con el `package-lock.json` versionado; si el lock no coincide, falla.

---

## HU-05 · Build y artefacto versionado

**Como** equipo de operaciones **quiero** un artefacto inmutable por build **para** desplegar exactamente lo que se probó.

**Criterios de aceptación**
- **CA-05.1** `npm run build` genera `dist/` con `server.js`, `public/` y `package.json`.
- **CA-05.2** El artefacto se nombra con la versión y el SHA corto, y se conserva 30 días o más.
- **CA-05.3** Una etiqueta `vX.Y.Z` en `main` publica un GitHub Release.

**Criterios de seguridad**
- **CS-05.1** *(R4)* Dado un artefacto, cuando se publica, entonces lleva su checksum SHA-256, calculado en el CI y nunca proporcionado a mano.
- **CS-05.2** *(R4)* Dado un artefacto, cuando se publica, entonces lleva una atestación de procedencia firmada (`attest-build-provenance`).
- **CS-05.3** *(R8)* Dado el contenido del artefacto, cuando se inspecciona, entonces no incluye `.git`, `.env`, pruebas ni `devDependencies`.
- **CS-05.4** *(R3)* Dado un release publicado, cuando alguien intenta reemplazar su artefacto, entonces no se permite; un cambio exige una versión nueva.

---

## HU-06 · Contenerización

**Como** equipo de operaciones **quiero** una imagen Docker **para** ejecutar la app igual en cualquier entorno.

**Criterios de aceptación**
- **CA-06.1** Existe un `Dockerfile` multi-stage con la imagen base `node:XX-alpine`.
- **CA-06.2** La imagen respeta la variable `PORT` y se publica en GHCR con la versión y el SHA.
- **CA-06.3** Existe un `.dockerignore` que excluye `node_modules`, `.git` y `.env`.

**Criterios de seguridad**
- **CS-06.1** *(R2)* Dado el contenedor en ejecución, cuando se revisa su usuario, entonces no es root (`USER node`).
- **CS-06.2** *(R12)* Dada la imagen construida, cuando la escanea Trivy, entonces el pipeline falla si hay vulnerabilidades críticas.
- **CS-06.3** *(R4)* Dado el `Dockerfile`, cuando se revisa, entonces la imagen base está fijada por digest `@sha256:`, no por etiqueta.
- **CS-06.4** *(R2)* Dado el contenedor, cuando se inicia, entonces corre con `--read-only` y `--cap-drop=ALL`.

---

## HU-07 · Despliegue automático a QAS

**Como** tester **quiero** que cada merge a `main` se despliegue en QAS **para** validar en un entorno parecido a producción.

**Criterios de aceptación**
- **CA-07.1** Un merge a `main` con CI en verde despliega en QAS sin intervención manual.
- **CA-07.2** Se despliega el mismo artefacto de HU-05 o HU-06, sin recompilar.
- **CA-07.3** Se ejecuta un smoke test contra QAS y se informa la URL y la versión.

**Criterios de seguridad**
- **CS-07.1** *(R6)* Dado el job de despliegue, cuando va a ejecutarse, entonces verifica **en ese momento** que el destino sea QAS (nombre del entorno y URL); si no coincide, aborta.
- **CS-07.2** *(R8)* Dadas las credenciales de QAS, cuando se usan, entonces vienen del GitHub Environment `qas` o de OIDC, nunca del código.
- **CS-07.3** *(R6)* Dadas las credenciales de QAS, cuando se prueban contra producción, entonces no tienen acceso.
- **CS-07.4** *(R4)* Dado el artefacto a desplegar, cuando se recibe, entonces se verifica su checksum antes de instalarlo.

---

## HU-08 · Promoción a producción con aprobación

**Como** líder técnico **quiero** que el paso a producción requiera aprobación **para** controlar qué se publica y cuándo.

**Criterios de aceptación**
- **CA-08.1** El despliegue usa el GitHub Environment `produccion`, que tiene revisores obligatorios.
- **CA-08.2** Solo se promueve una versión que ya pasó por QAS (mismo SHA y mismo checksum).
- **CA-08.3** Se dispara desde una etiqueta `vX.Y.Z` o con `workflow_dispatch`, y al final corre un smoke test.

**Criterios de seguridad**
- **CS-08.1** *(R2)* Dado un despliegue, cuando su autor intenta aprobarlo, entonces no puede (separación de funciones).
- **CS-08.2** *(R1)* Dada una rama distinta de `main` o una etiqueta no protegida, cuando se intenta desplegar, entonces lo bloquean las *deployment branch rules*.
- **CS-08.3** *(R5)* Dados dos despliegues simultáneos a producción, cuando se disparan, entonces `concurrency` los serializa y nunca corren en paralelo.
- **CS-08.4** *(R10)* Dado el sitio en producción, cuando se accede, entonces solo responde por HTTPS con HSTS, y el proceso Node no queda expuesto directo.

---

## HU-09 · Health check, logs y monitoreo

**Como** operador **quiero** un endpoint de salud y logs estructurados **para** saber si la app está viva y diagnosticar fallos.

**Criterios de aceptación**
- **CA-09.1** `GET /health` responde 200 con `{"status":"ok","version":"x.y.z"}`.
- **CA-09.2** Los logs son JSON, una línea por evento, con timestamp, método, ruta, código y duración.
- **CA-09.3** Hay un `HEALTHCHECK` en el contenedor y una alerta tras tres fallos seguidos.

**Criterios de seguridad**
- **CS-09.1** *(R11)* Dada la respuesta de `/health`, cuando se inspecciona, entonces no expone variables de entorno, rutas, ni la versión de Node o del sistema operativo.
- **CS-09.2** *(R8)* Dada una petición con `Authorization`, cookies o query string, cuando se registra en el log, entonces esos valores no aparecen.
- **CS-09.3** *(R11)* Dado un error 5xx, cuando ocurre, entonces el log guarda el detalle y el cliente recibe un mensaje genérico.
- **CS-09.4** *(R13)* Dadas más de N peticiones por minuto desde una misma IP, cuando se reciben, entonces se responde 429.

---

## HU-10 · Rollback

**Como** operador **quiero** volver a la versión anterior en minutos **para** recuperar el servicio si un despliegue falla.

**Criterios de aceptación**
- **CA-10.1** Existe un workflow manual de rollback que por defecto vuelve a la versión anterior.
- **CA-10.2** Redepliega un artefacto ya existente, sin recompilar.
- **CA-10.3** Si el smoke test posterior a un despliegue falla, el rollback se dispara automáticamente y termina en 5 minutos o menos.

**Criterios de seguridad**
- **CS-10.1** *(R2)* Dado un rollback a producción, cuando se solicita, entonces exige los mismos aprobadores que un despliegue normal.
- **CS-10.2** *(R4)* Dada una versión destino, cuando su checksum o su atestación no son válidos, entonces el rollback se rechaza.
- **CS-10.3** *(R12)* Dada una versión destino marcada como vulnerable en HU-04 o HU-06, cuando se intenta volver a ella, entonces se rechaza salvo que haya una excepción documentada.
- **CS-10.4** *(R11)* Dado un rollback, cuando termina, entonces registra quién lo pidió, de qué versión a cuál y el motivo.

---

## Cobertura de reglas de seguridad

| Regla | Historias |
|---|---|
| R1 La UI no es candado | HU-01, HU-03, HU-08 |
| R2 Permisos explícitos | HU-01, HU-06, HU-08, HU-10 |
| R3 Inmutabilidad del estado final | HU-05 |
| R4 No confiar en el cliente / integridad | HU-04, HU-05, HU-06, HU-07, HU-10 |
| R5 Atomicidad / concurrencia | HU-08 |
| R6 Separación QAS/Producción | HU-07 |
| R8 Secretos | HU-01, HU-02, HU-04, HU-05, HU-07, HU-09 |
| R10 Cabeceras / CSP | HU-02, HU-03, HU-08 |
| R11 Manejo de errores | HU-03, HU-09, HU-10 |
| R12 Validar contra fuentes reales | HU-04, HU-06, HU-10 |
| R13 Límite de tasa | HU-09 |

No aplican en esta etapa: R7 (estado por request), R9 (CSRF) y R14 (migración de un
sistema legado). La app no tiene sesiones ni formularios que modifiquen datos, y no
proviene de un sistema anterior.
