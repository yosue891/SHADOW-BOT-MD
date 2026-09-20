# ✅ SHADOW-BOT-MD — Instalación lista para vincular

**Fecha:** 2026-09-20 (America/Caracas)
**Ruta local:** `/home/user/SHADOW-BOT-MD`
**Repo:** https://github.com/yosue891/SHADOW-BOT-MD
**Estado:** instalado, verificado y subido (rama `main`). **Falta solo vincular tu WhatsApp.**

---

## 1) Lo que se hizo

| Paso | Resultado |
|---|---|
| Clonado del repo | ✅ `origin` limpio: `https://github.com/yosue891/SHADOW-BOT-MD.git` (sin token en la URL) |
| `npm install` | ✅ 896 paquetes + `postinstall fix-baileys.cjs` |
| `ffmpeg` | ✅ Incluido vía `@ffmpeg-installer/linux-x64` |
| Prueba de arranque real | ✅ Levantó, `262` plugins cargados y QR generado (sesión de prueba borrada) |
| **Comando `test` eliminado** | ✅ Borrado `plugins/_yttest.js` (era el único que definía `handler.command = ['test']`) |
| Test obsoleto | ✅ Borrado `tests/anubis-preview.test.mjs` (probaba justo ese plugin) |
| `npm test` | ✅ Sigue funcionando (`node --test tests/` → pasa en verde) |
| Push a GitHub | ✅ 3 commits subidos a `main` (`077925e..11f3742`) |

**Commits nuevos en tu repo:**

```
b4619b1 chore(plugins): eliminar comando de test (plugins/_yttest.js)
3625971 chore(test): eliminar test obsoleto del comando 'test' y hacer que 'npm test' no falle sin archivos
11f3742 chore(test): mantener carpeta tests/ para el runner
```

> `testytmp3full` (`plugins/_test.js`) **se mantuvo**, tal como pediste.

---

## 2) Cómo arrancar y vincular

### Opción A — Con terminal (Termux, VPS, PC)

```bash
cd SHADOW-BOT-MD
npm start
```
Aparece el menú:
- `1` = QR (escanea desde WhatsApp → Dispositivos vinculados)
- `2` = Código de 8 dígitos (te lo pide la terminal)

### Opción B — Sin terminal interactiva (headless / Docker / screen)

```bash
cd SHADOW-BOT-MD
BOT_NUMBER=58XXXXXXXXXX node src/index.js --code     # código de 8 dígitos
node src/index.js --qr                               # o QR directo
```
`BOT_NUMBER` debe ir **sin `+`, sin espacios y con código de país** (ej. `584121234567`).

### Opción C — 24/7 con PM2 (recomendado para VPS)

```bash
npm i -g pm2
BOT_NUMBER=58XXXXXXXXXX pm2 start ecosystem.config.cjs
pm2 save && pm2 startup     # arranca solo si el servidor se reinicia
pm2 logs shadow-bot         # ver logs
```

La sesión se guarda en `Sessions/Principal` (está en `.gitignore`: **nunca la subas al repo**).

---

## 3) Verificaciones hechas

- `node --check` → ✅ OK en `config.js`, todo `lib/`, `src/` y los 262 plugins.
- Import real de los plugins → ✅ `262/262` sin errores.
- Dependencias críticas → ✅ `22/22` (baileys, sharp, canvas, jimp, webp, ffmpeg, mongoose, jsdom, etc.).
- Arranque completo → ✅ "Plugins cargados: 262" + QR funcional.
- `npm test` → ✅ pasa.

**Nota:** `package.json` pide Node `>=22`, pero todo funcionó en **Node 20.20.2**. Para producción se recomienda Node 22 LTS.

---

## 4) Pendientes y seguridad

- ⚠️ **Revoca el token de GitHub** que compartiste en el chat (quedó expuesto en texto plano) en https://github.com/settings/tokens y crea uno nuevo. No hizo falta para clonar, porque el repo es público.
- GitHub reportó **3 vulnerabilidades de dependencias** (2 altas, 1 moderada) en tu repo: revisa https://github.com/yosue891/SHADOW-BOT-MD/security/dependabot
- El comando `test` ya no existe; al escribir `.test` el bot simplemente no responde a ese comando (no rompe nada más).
- Este entorno no mantiene el bot encendido 24/7: para uso real, córrelo en tu VPS/PC con PM2.

---

## 5) Actualización 2026-09-20 — Comandos organizados por carpetas

Los **262 plugins** se reorganizaron en **18 carpetas** dentro de `plugins/`
(owner, ia, menus, grupos, economia, gacha, anime, nsfw, descargas, herramientas,
stickers, fun, subbots, registro, info, ajustes, sistema, pruebas).

**Cambios técnicos necesarios para que el bot siga funcionando:**

1. `src/index.js` — el cargador ahora es **recursivo** (`scanPluginFiles`): la clave
   de cada plugin es su ruta relativa, ej. `"grupos/group-kick.js"`.
2. `src/index.js` — hot-reload recursivo (`watch(pluginFolder, { recursive: true })`
   con fallback a vigilar cada carpeta) y de-rescan automático si no llega el nombre
   del archivo.
3. `src/index.js` — imports actualizados: `plugins/sistema/_fakes.js` y
   `plugins/subbots/subs-conexion.js`.
4. `lib/plugins.js` — cargador legacy también recursivo.
5. 9 plugins — imports a `lib/` corregidos a `../../lib/...` (wc, _welcome, _level,
   prin-allmenu, prin-menulist, subs-conexion, subs-darcode, herras-tourl, herras-pack).
6. Comandos de owner adaptados a subcarpetas + validación anti path-traversal:
   `dueño-delplugin.js`, `dueño-saveplugin.js`, `dueño-getplungin.js`, `dueño-detectar.js`.

**Verificación:** 262/262 plugins cargados, 0 errores de import, 245 comandos + 17 hooks
(idéntico a antes), sintaxis OK en todo el proyecto, hot-reload probado (nuevo/actualizado/borrado),
`npm test` en verde.

📄 Mapa completo archivo → comandos: **`ORDEN-PLUGINS.md`**
