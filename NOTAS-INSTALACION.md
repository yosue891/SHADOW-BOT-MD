# Notas de instalación — estado actual

Fecha: 2026-10-07 · Rama: `main` · HEAD: `010b753`

## Estado actual

**baileys está vendorizado, sin cambiar de librería.** Es el mismo baileys que el repo ya usaba.

| | |
|---|---|
| Dependencia | `"@whiskeysockets/baileys": "file:vendor/baileys"` |
| Paquete en el vendor | **`baileys` `7.0.0-rc14`** — el fork `muleff/b`, sin renombrar |
| **No es** | `yo-soy-yo-baileys` (ese fue el intento anterior, revertido) |
| Fuente vendoreada | `github.com/muleff/b` @ `f1b4ac1` |
| Tamaño del vendor | 103 archivos, 8.7 MB |
| `tools/fix-baileys.cjs` + `postinstall` | presentes |

Historial en `main`:
```
010b753  chore(vendor): vendorizar baileys 7.0.0-rc14 (fork muleff/b) en vendor/baileys
2d59f94  chore: restaurar baileys de github:muleff/b (se quita el vendor)
29ee87a  Revert "chore(vendor): vender baileys en vendor/baileys y restaurar fix-baileys"
837e914  chore(vendor): vender baileys en vendor/baileys y restaurar fix-baileys   <- intento con yo-soy-yo
e7e0c5e  Delete tools directory   <- main original
```

Detalle de procedencia y checksums: **`vendor/baileys/PROVENANCE.md`**.

### Por qué vendorizar si no cambia la librería

El fork `muleff/b` tiene **auto-actualización de proto**. Al vendorizar, su HEAD ya había
avanzado de `f1b4ac1` a `d117256` ("auto update proto"). Con `github:muleff/b` cada
`npm install` podía traer un baileys distinto según el día. Vendoreado queda fijado y el
build es reproducible.

## Verificación realizada

### Que el vendor es idéntico a la fuente
Contra un clon limpio de `muleff/b`:
```
diff -rq lib                  -> sin diferencias
cmp    WAProto/index.js       -> idéntico
cmp    package.json           -> idéntico
cmp    LICENSE                -> idéntico
```
Excluido solo `WAProto/index.backup.js` (7.2 MB, backup muerto sin referencias).

### Install limpio (se borró `package-lock.json` antes)
| Prueba | Resultado |
|---|---|
| `npm install` | OK — 754 paquetes, exit 0 |
| Resolución | `node_modules/@whiskeysockets/baileys` → symlink a `../../vendor/baileys`; resuelve a `/home/user/SHADOW-BOT-MD/vendor/baileys/lib/index.js` |
| Nombre/versión instalados | **`baileys 7.0.0-rc14`** (no `yo-soy-yo-baileys`) |
| Contenido resuelto | `diff -rq` contra el fork → idéntico |
| Símbolos | `makeWASocket` function, `BufferJSON` object, `proto` object |
| `node src/index.js` | Arranca, conecta (`[ Baileys ] Versión Web: 2.3000.1043857760`) y **genera QR** |
| Plugins | **268/269** |
| Banner "YO SOY YO" en el log | **0** apariciones — confirma que no se cambió la librería |

## ⚠ Problema preexistente (no introducido por estos cambios)

`plugins/subbots/subs-listbots.js` no carga:
```
The requested module '@whiskeysockets/baileys' does not provide an export named 'getAdditionalNode'
```
El plugin importa `getAdditionalNode` (línea 3, usado en la 158). Verificado con `grep`:
**0 coincidencias** en `node_modules/@whiskeysockets/baileys/lib/`. Ese export solo existía en
`yo-soy-yo-baileys 0.7.14`. Ya fallaba con `github:muleff/b`, antes de vendorizar.

Opciones:
1. Dejarlo así (el comando de listar subbots no funciona).
2. Parchar el plugin para no depender de `getAdditionalNode`.
3. Volver a `yo-soy-yo-baileys` como vendor (lo que se revirtió).

## Incidente detectado y corregido: binarios de canvas

Al preparar este commit, `git status` reportó **26 archivos borrados** en
`lib/canvas-vendor/build/Release/` (binarios `.node` y `.so`, 23 MB). **No los borró ningún
comando mío**: la carpeta se llama `build`, y ese nombre está excluido del snapshot del
entorno de trabajo, así que se perdieron al restaurar la sesión.

Si se hubiera commiteado en ese estado, el push habría eliminado esos binarios del repo y
roto `lib/welcome-card.js` (tarjetas de bienvenida). Se restauraron con
`git restore -- lib/canvas-vendor/build` antes de commitear.

Verificado en el remoto tras el push:
- commit `010b753`: 104 archivos, **0** tocados en `canvas-vendor`, **0** removidos en total
- `contents/lib/canvas-vendor/build/Release/canvas.node` → HTTP 200

**Ojo al trabajar en este repo desde entornos que excluyan `build/` de sus snapshots.**

## Push a GitHub — HECHO

- `2d59f94..010b753  main -> main`
- Verificado vía API: `commits/main` → `010b753`, autor `yosue891 <yosueortega630@gmail.com>`;
  `package.json` remoto línea 32 → `"@whiskeysockets/baileys": "file:vendor/baileys"`;
  `vendor/baileys/package.json` remoto → `name: baileys`, `version: 7.0.0-rc14`.
- El token se pasó en la URL del comando y no quedó guardado: 0 coincidencias en `.git/config`
  ni en archivos del repo; `origin` sigue siendo la URL limpia.

> **Nota sobre una afirmación anterior errónea:** se reportó que el token devolvía `401 Bad credentials`.
> Eso fue falso: la variable de entorno usada para el test estaba vacía, así que se enviaba un header
> de autenticación vacío. Con el token real la API responde `200` y `login: yosue891` (`push: True`).

### Seguridad

El token fue pegado en texto plano en el chat. Es válido y funcionó, pero conviene **revocarlo
y generar uno nuevo** (Settings → Developer settings → Personal access tokens).

### Alerta de Dependabot (preexistente)

**12 vulnerabilidades** en la rama por defecto (8 altas, 4 moderadas). Vienen de dependencias
ya declaradas en `package.json`, no las introduce este cambio.
Detalle: https://github.com/yosue891/SHADOW-BOT-MD/security/dependabot

## Otros

- **Node 22:** `engines.node: ">=22.0.0"`; aquí se probó con Node **v20.20.2** y funcionó
  (npm avisa, no bloquea). En producción conviene Node 22.
- **Vinculación:** `Sessions/` está en `.gitignore`. Cada arranque sin sesión genera un QR nuevo.
