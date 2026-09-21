# `>zip` — Convertir código en un `.zip`

Plugin: `plugins/herramientas/herras-zipcode.js`
Comandos: `zip` · `zipcode` · `codezip` · `zipc` · `azip` · `tozip` · `zip-code`
(prefijo del bot: `>`, así que se escribe `>zip`)

## Para qué sirve

Respondes a un mensaje que tenga código o texto largo y el bot te devuelve un
archivo **`.zip`** listo para descargar. Ya no hay que copiar y pegar bloques
enormes de código en el chat.

## Uso

| Qué haces | Qué obtienes |
|---|---|
| Citas el mensaje con el código y escribes `>zip` | `codigo.zip` con el archivo dentro |
| `>zip` + el código en el mismo mensaje | igual, sin necesidad de citar |
| Citas el código y escribes `>zip mi_script` | `mi_script.zip` |
| Citas el código y escribes `>zip bot.py \| cualquier cosa` | `bot.zip` → dentro `bot.py` |
| Citas un **documento** (pdf, docx, apk…) y escribes `>zip` | `nombre.zip` con el archivo original |
| Citas una **imagen / video / audio / sticker** y escribes `>zip` | `media.zip` con la media dentro |

## Qué hace por su cuenta

- **Detecta el lenguaje** del bloque ` ```python `, ` ```js `, ` ```php `, etc. y
  guarda el archivo con la extensión correcta (`.py`, `.js`, `.php`…).
- Si el mensaje no trae bloque de código, guarda el texto como `.txt`.
- Quita las comillas triples ` ``` ` del contenido.
- Si escribes un nombre con extensión (`bot.py`, `app.js`), respeta esa extensión.
- Te dice en la leyenda el nombre del archivo, cuántas líneas tiene y el peso.
- Reacciona con 🗜️ mientras trabaja, ✅ al terminar, ❌ si falla.

## Límites

- Si lo citado tiene menos de **40 caracteres**, no hace el zip y te lo avisa
  (un `.zip` de 3 líneas no tiene sentido). Para forzarlo, pega más código o
  usa un documento.
- Si la media del mensaje citado ya expiró en los servidores de WhatsApp, avisa
  `no puedo descargar el mensaje citado` en vez de romperse.

## Ejemplo real

Mensaje citado:

````
```python
def saludar(nombre):
    return f"Hola {nombre}"

for i in range(3):
    print(saludar(i))
```
````

Escribes: `>zip`

El bot responde:

```
🗜️ Listo

📝 codigo.py · 6 líneas · 118 B
📦 289 B comprimido
```

…y adjunta `codigo.zip` que al descomprimirlo contiene `codigo.py`.

## Requisitos

- Dependencia agregada: `adm-zip` (ya está en `package.json`).
  Si reinstalas el bot: `npm install adm-zip`
- El plugin se carga solo (hot-reload). No hay que tocar `src/index.js`.

## Tests

```bash
npm test
```

Corre `tests/herras-zipcode.test.mjs` (16 pruebas): detección de lenguaje,
nombres personalizados, documentos, imágenes, textos cortos, media expirada y
metadatos del plugin.
