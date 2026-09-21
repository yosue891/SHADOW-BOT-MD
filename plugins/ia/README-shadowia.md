# 🤖 Shadowia — asistente personal de Yosue

Plugin: `plugins/ia/ia-shadowia.js`
Comandos: `shadowia` · `asistente` · `ayuda`
(prefijo del bot: `>`, así que se escribe `>shadowia`)

| | |
|---|---|
| **IA** | La **misma API que usa Simi**: `https://api-gohan-v1.onrender.com/ai/gemini` |
| **Personalidad** | Modo **neutro**: clara, educada, directa. Sin sarcasmo, sin insultos, sin bromas pesadas |
| **Acceso** | **Solo owners** (`handler.rowner = true` + doble chequeo interno) |
| **Plugins** | Puede ejecutar **cualquier comando del bot** en nombre del owner |

---

## 1. Administración del grupo

Se lo dices en lenguaje natural, dentro del grupo:

| Le dices | Qué hace |
|---|---|
| `promueve a @usuario` · `haz admin a @usuario` · `dale admin @usuario` | `groupParticipantsUpdate(..., 'promote')` |
| `degrada a @usuario` · `quítale el admin a @usuario` | `groupParticipantsUpdate(..., 'demote')` |
| `expulsa a @usuario` · `kickealo` · `sacala del grupo` | `groupParticipantsUpdate(..., 'remove')` |
| `agrega 584241234567` | `groupParticipantsUpdate(..., 'add')` |
| `cambia el nombre del grupo a Shadow Garden` | `groupUpdateSubject` |
| `cambia la descripción a Grupo oficial` | `groupUpdateDescription` |
| `cambia la foto del grupo` (respondiendo a una imagen) | `updateProfilePicture` |
| `abre el grupo` / `cierra el grupo` | `groupSettingUpdate` (`not_announcement` / `announcement`) |
| `activa los anuncios` / `desactiva los anuncios` | `groupSettingUpdate` |

El objetivo se resuelve en este orden: **mención → mensaje citado → número escrito**.

## 2. Salir del grupo

Cuando un owner le dice `sal`, `salte`, `vete`, `retírate`, `sal del grupo`…

1. Envía el mensaje de despedida: *«👋 Shadowia se retira. Fue un gusto estar aquí.»*
2. Espera 2,5 s para que el mensaje salga.
3. Ejecuta `conn.groupLeave(m.chat)`.

## 3. Usar cualquier plugin del bot

```
>shadowia usa play bad bunny
>shadowia ejecuta el comando menu
>shadowia corre sticker
```

El asistente busca el comando en `global.plugins` (los **266 plugins** cargados) y lo
ejecuta pasándole `isOwner: true`, `isROwner: true`, `isAdmin: true`, así que atraviesa
las restricciones de admin igual que si lo escribiera el owner a mano.

**Bloqueados por seguridad** (para no dejar el bot inutilizable desde el chat):
`delplugin`, `saveplugin`, `eval`, `exec`, `restart`, `fix`, `dsowner`.
Se edita en la constante `BLOQUEADOS` del plugin.

## 4. Conversar

Cualquier otra cosa va a la IA (misma API de Simi) con el prompt de modo neutro.
La API fría de Render puede tardar ~35 s; mientras tanto el bot marca «escribiendo…».
Timeout: 90 s.

---

## Seguridad

- **Las acciones destructivas no las decide la IA.** El texto → acción se resuelve con
  reglas deterministas (`parsearOrden`). La IA **solo** conversa. Así un mensaje ambiguo
  nunca termina expulsando a alguien.
- No se puede tocar al **propio bot**, al **creador del grupo** ni al **owner del bot**.
- Si el bot no es admin del grupo, avisa en vez de intentar la acción.
- Si no es owner, responde `⛔ Shadowia solo responde a los owners del bot.` y no hace nada.

## Tests

```bash
npm test
```

`tests/ia-shadowia.test.mjs` — 26 pruebas: las 14 intenciones del parser, extracción de
valores, resolución de objetivo, protecciones, permisos, cada acción de grupo, el orden
despedida→`groupLeave`, ejecución de plugins, comandos bloqueados y **una llamada real a
la API** que usa Simi.

Verificación adicional: `node tools/probar-shadowia-e2e.mjs` arranca el bot real,
confirma que el cargador registra `ia/ia-shadowia.js` y le inyecta órdenes.
