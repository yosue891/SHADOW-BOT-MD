# 🎬 APIS-ANIME — De dónde salen los GIFs de los comandos anime

**Última verificación:** 2026-09-20
**Archivo que las usa:** `lib/anime-media.js`

Cada comando de anime pide un **GIF aleatorio** a estas APIs (todas gratuitas y **sin API key**),
con respaldo automático: si una falla, el comando prueba la siguiente y, si todas fallan,
responde solo con texto (nunca se queda mudo ni manda media rota).

---

## ⭐ API dedicada al comando `kill`

| API | Endpoint | Qué devuelve |
|---|---|---|
| **gifukai** | `https://api.gifukai.com/kill` | **Solo escenas de muerte de personajes de anime** + el nombre del anime (ej. *Akame ga Kill!*, *Sword Art Online*) |

Es la única API encontrada cuyo endpoint `kill` está dedicado 100% a esa temática.
Si falla, hay respaldo de acción violenta/punch.

---

## Cobertura por acción

| Acción | gifukai | otakugifs | nekos.best | purrbot | nekos.life |
|---|:---:|:---:|:---:|:---:|:---:|
| `kill` | ✅ temático | — | — | — | — |
| `cuddle` | ✅ | ✅ | ✅ | ✅ | ✅ |
| `bite` | ✅ | ✅ | ✅ | ✅ | — |
| `peek` | ✅ (peek) | ✅ (peek) | ✅ (lurk) | — | — |
| `lappillow` | ✅ | ✅ (nuzzle) | ✅ | — | — |
| `stare` | ✅ | ✅ | ✅ | — | — |
| `pat` | ✅ | ✅ | ✅ | ✅ | ✅ |
| `yawn` | ✅ | ✅ | ✅ | — | — |
| `smoke` | ❌ | ❌ | ❌ | ❌ | ❌ |

> **`smoke` (fumar):** ninguna API de reacciones lo tiene. El comando responde solo con texto.

---

## Endpoints usados

| API | Formato de URL | Notas |
|---|---|---|
| **gifukai** | `https://api.gifukai.com/<accion>` | 68 acciones (`kill`, `peek`, `lappillow`, `stare`, `pat`, `bite`, `pun`…) + filtros por género (`?pairing=ff`, `mm`, `fm`, `mf`). Devuelve `anime` de origen. |
| **otakugifs** | `https://api.otakugifs.xyz/gif?reaction=<x>` | ~70 reacciones (`bite`, `cuddle`, `yawn`, `nuzzle`, `stare`, `peek`…). Sin `kill`. |
| **nekos.best** | `https://nekos.best/api/v2/<x>` | 63 reacciones + nombre del anime. **Exige User-Agent propio**: rechaza los que empiezan con `Mozilla/5.0 (compatible;`. |
| **purrbot** | `https://purrbot.site/api/img/sfw/<x>/gif` | `cuddle`, `bite`, `pat`, `kiss`, `hug`. |
| **nekos.life** | `https://nekos.life/api/v2/img/<x>` | `cuddle`, `pat`, `slap`, `hug`, `kiss`, `tickle`, `feed`, `smug`. |

---

## APIs que ya NO sirven (probadas y descartadas)

| API | Por qué no se usa |
|---|---|
| **Tenor** | `"Tenor API is discontinued"` (código 7) |
| **Giphy** | La key pública de prueba está **BANNED** |
| **waifu.pics** | Su subdominio `api.waifu.pics` no resuelve DNS (bloqueado al menos desde el entorno de pruebas) |
| **hmtai** | Dominio caído / sin respuesta (`hmtai-api.vercel.app` → DEPLOYMENT_NOT_FOUND) |
| **catboys** | Sin respuesta |
| **nekobot.xyz** | 403 (Cloudflare) |
| **otakugifs `kill` / `stab`** | No existen esas reacciones (400) |

---

## Opción extra: video real de anime (sakugabooru)

`sakugabooru.com` sirve **clips MP4 reales de anime** por tag:

```
https://sakugabooru.com/post.json?tags=fighting&limit=5    → mp4 de 5–20 MB
https://sakugabooru.com/post.json?tags=blood&limit=5       → mp4 de 4,7–11 MB
```

- ✅ Son videos de verdad (no loops de 1 segundo).
- ❌ Pesa mucho para WhatsApp (5–20 MB por mensaje) y **no tiene tag de "muerte"**
  (`death`, `kill`, `sword` están vacíos; solo `fighting` y `blood` tienen contenido).
- Se puede activar si quieres clips largos, pero no está puesto por defecto.

---

## Cómo probar una API a mano

```bash
# kill temático
curl "https://api.gifukai.com/kill"

# respaldo
curl "https://api.otakugifs.xyz/gif?reaction=bite"

# nekos.best (¡con User-Agent propio!)
curl -H "User-Agent: ShadowBot/1.0 (+https://github.com/yosue891/SHADOW-BOT-MD)" "https://nekos.best/api/v2/pat"
```

## Cómo agregar una acción nueva

En `lib/anime-media.js`, añade una línea al objeto `CADENAS`:

```js
miAccion: [['gifukai', 'miAccion'], ['otakugifs', 'miAccion'], ['nekosbest', 'miAccion']]
```

Y en el comando:

```js
import { enviarReaccionAnime } from '../../lib/anime-media.js'
// ...
await enviarReaccionAnime(conn, m, { reaccion: 'miAccion', caption: str, mentions: [who] })
```
