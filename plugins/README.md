<h3>Bienvenid@ al plungins de SHADOW-BOT-MD</h3>
<img align="right" alt="Coding" width="300" src="https://cdn.dribbble.com/users/1277312/screenshots/14733298/media/39b1045e593737587dd60e42c8422d1f.gif">

Todos los comandos del bot viven aquí, ordenados por categoría. El cargador
(`src/index.js`) es **recursivo**: recorre esta carpeta y todas sus subcarpetas.

| Carpeta | ¿Qué hay dentro? |
|---|---|
| `owner/` | Comandos exclusivos del dueño (root) |
| `ia/` | Todas las IA (chatgpt, gemini, copilot, simi, venice) |
| `menus/` | Todos los menús del bot |
| `grupos/` | Administración de grupos |
| `economia/` | Sistema de economía |
| `gacha/` | Gacha de waifus |
| `anime/` | Acciones y reacciones anime |
| `nsfw/` | Comandos +18 (toggle `nsfw`) |
| `descargas/` | YouTube, TikTok, IG, Spotify, Facebook... |
| `herramientas/` | Utilidades y búsquedas |
| `stickers/` | Stickers y packs |
| `fun/` | Diversión y juegos |
| `subbots/` | Sub-bots / jadibots |
| `registro/` | Registro de usuarios |
| `info/` | Información del bot y del sistema |
| `ajustes/` | Toggles de configuración |
| `sistema/` | Hooks internos del framework (no son comandos) |
| `pruebas/` | Comandos experimentales |

### Reglas para crear un plugin

```js
// plugins/fun/fun-ejemplo.js
const handler = async (m, { conn, text, usedPrefix, command }) => {
  m.reply('Hola 👋')
}
handler.command = ['ejemplo']
handler.tags = ['fun']
export default handler
```

- **Ruta de import a lib:** dentro de una carpeta usa `../../lib/...`
  (ej. `import { xpRange } from '../../lib/levelling.js'`).
- **Etiquetas:** `handler.tags` define en qué menú aparece; `handler.rowner = true`
  (solo dueño), `handler.group = true`, `handler.admin = true`.
- **Hot-reload:** al guardar el archivo el bot lo recarga solo, sin reiniciar.
