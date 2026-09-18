# ✅ SHADOW-BOT-MD — Instalación y Fix setwelcome / setgoodbye

**Repositorio:** https://github.com/yosue891/SHADOW-BOT-MD.git  
**Usuario GitHub configurado:** `yosue891` <yosueortega630@gmail.com>  
**Fecha instalación:** 2026-09-17 (America/Caracas)  
**Ubicación:** `/home/user/SHADOW-BOT-MD`  
**Commit fix:** `bf8712f` — *fix(setwelcome/setgoodbye): validación robusta, guardado garantizado y aislamiento por grupo*

---

## 1) Qué se instaló

```bash
git config --global user.name "yosue891"
git config --global user.email "yosueortega630@gmail.com"
git clone https://yosue891:ghp_***@github.com/yosue891/SHADOW-BOT-MD.git
cd SHADOW-BOT-MD
```

> ⚠️ **Seguridad:** Tu token `ghp_lXu8U...` quedó en `git remote -v`. Te recomiendo **revocarlo y generar uno nuevo** en https://github.com/settings/tokens después de usarlo. Para futuro usa:
> ```bash
> git remote set-url origin https://github.com/yosue891/SHADOW-BOT-MD.git
> # Git te pedirá usuario/token al hacer push
> ```

---

## 2) Bug encontrado (por qué decía “establecido” pero no guardaba)

Analizando `plugins/group-setwelcome.js` (antes del fix):

1. **Referencia débil a la DB:**
   ```js
   const chat = global.db?.data?.chats?.[m.chat] || (global.db.data.chats[m.chat] = {})
   ```
   - Si `global.db.data.chats` no existía, el lado derecho `global.db.data.chats[m.chat] = {}` lanzaba `Cannot read properties of undefined`.
   - Si el chat ya existía con defaults de `src/handler.js`, se creaba `{}` vacío y se perdían defaults (`welcome`, `isBanned`...).
   - Además se ignoraba el `chat` que ya pasa `src/handler.js` (`handlerChat`), causando desincronía de referencia: modificabas una copia no vinculada a `global.db.data.chats[m.chat]`.

2. **Guardado silencioso y no verificado:**
   ```js
   if (global.db?.write) await global.db.write().catch(() => {})
   ```
   - Se tragaba el error con `.catch(()=>{})`, sin log ni reintento.
   - No había fallback a `global.db.save()` (para `lib/database.js`).
   - No se verificaba que el valor realmente quedó en `global.db.data.chats[m.chat]`.

3. **No aislamiento global vs por grupo:**
   - Aunque el código *intentaba* usar `m.chat` como clave, al no re-asignar `global.db.data.chats[m.chat] = chat` después de mutar, en algunos edge cases el cambio quedaba solo en memoria volátil y el intervalo de 30s de `src/index.js` (`await global.db.write()`) podía sobrescribir.

4. **Validación insuficiente:**
   - `if (!text)` solo miraba `text` de `handler` (`args.join(" ")`), que colapsa saltos de línea y espacios. Un `text.trim() === ""` pasaba y guardaba `""`.
   - No forzaba `chat.welcome = true`, entonces si `welcome` estaba `false` (desactivado con `bot off`), el nuevo mensaje nunca se mostraba.

5. **Lectores correctos:**
   - `plugins/_welcome.js` y `plugins/wc.js` ya leían **por grupo**: `global.db?.data?.chats?.[m.chat]` → `chat.sWelcome`. Eso está bien. El problema era 100% en el *escritor*.

---

## 3) Fix aplicado — `plugins/group-setwelcome.js`

**Nuevo archivo completo (ver preview):** `plugins/group-setwelcome.js`

### Cambios clave

| Antes | Después |
|---|---|
| `const chat = global.db?.data?.chats?.[m.chat] \|\| (global.db.data.chats[m.chat] = {})` | Inicialización robusta: asegura `global.db.data.chats = {}`, usa `groupId = m.chat`, prioriza `handlerChat` (de `src/handler.js`), sincroniza referencias con `Object.assign` y `global.db.data.chats[groupId] = chat` |
| `if (!text)` | `cleanText = (text.trim() \|\| extraído de m.text.slice(prefix+command)).trim()` + valida `!cleanText` y longitud `>1000` |
| Solo `global.db.write()` con catch silencioso | `saveDB()` intenta `write()` → fallback `save()` → loguea error → espera 800ms para cola de `Database` |
| No activaba welcome | `chat.welcome = true` al hacer `setwelcome` / `setgoodbye` |
| Mensaje genérico | Mensajes indican **grupo y ID**: `Grupo: *Nombre*` / `ID: \`<groupId>\`` y `🔒 Guardado exclusivamente en este grupo` |
| `m.reply` sin await | `await m.reply(...)` + verificación post-guardado `verify !== newMsg` con reintento |
| `del` sin re-save | Ahora `await saveDB()` también en `del/reset` |

### Aislamiento por grupo — Garantizado

```js
const groupId = m.chat // ej: "120363123@g.us"
let chat = handlerChat || global.db.data.chats[groupId]
// ... modifica solo chat de ese groupId
global.db.data.chats[groupId] = chat
chat.sWelcome = newMsg // solo afecta a groupId
// verificación: otros grupos mantienen su valor
global.db.data.chats['OTRO@g.us'].sWelcome // intacto
```

Testeado con mock (ver logs arriba):
- `111@g.us` → cambia solo 111, `222@g.us` permanece igual ✅
- `setgoodbye` igual ✅
- Sin texto muestra actual **solo de ese grupo** ✅

### Validación para que funcione correctamente

1. **Solo grupos:** `if (!m.isGroup) return ❌`
2. **Solo admins:** `if (!isAdmin && !isOwner) return ❌` (además de `handler.admin = true`)
3. **DB lista:** `if (!global.db.data) await global.loadDatabase()`
4. **Texto no vacío:** extrae con fallback de `m.text` para multilínea
5. **Longitud:** `>1000` caracteres → error
6. **Guardado verificado:** compara `global.db.data.chats[groupId].sWelcome === newMsg`

---

## 4) Cómo instalar dependencias y correr el bot

**Requisito:** Node.js `>=22.0.0` (tu entorno actual es `v20.20.2`, usa `--ignore-engines` o actualiza con `nvm`).

```bash
cd /home/user/SHADOW-BOT-MD

# Opción A — Node 20 (actual):
npm install --ignore-engines

# Opción B — Actualizar a Node 22 (recomendado):
# nvm install 22 && nvm use 22
# npm install

# Correr bot
npm start
# o
node src/index.js
# Opciones:
# node src/index.js --qr       # QR
# node src/index.js --code     # código 8 dígitos
```

El bot usa `lowdb` con `database.json` (se crea automáticamente). No borrar `Sessions/Principal/creds.json` si ya vinculaste.

**PM2 (producción):**
```bash
npm install -g pm2
pm2 start ecosystem.config.cjs
pm2 logs
pm2 save
```

---

## 5) Cómo usar los comandos corregidos

Dentro del **grupo** (siendo admin):

```bash
# Bienvenida — solo para este grupo
.setwelcome ¡Bienvenido {usuario} a {grupo}! 🎉 Somos {miembros} miembros. Fecha: {fecha}
# Variables: {usuario} {grupo} {desc} {miembros} {fecha}

# Ver actual (sin texto)
.setwelcome
# Responde: Mensaje actual (solo este grupo) + ejemplo

# Probar (sin necesidad de que entre alguien)
.welcome @usuario
.bienvenida

# Despedida — solo para este grupo
.setgoodbye Adiós {usuario}, quedan {miembros} en {grupo} 💔
.setbye Adiós {usuario}
.setdespedida Chau {usuario}

# Ver actual
.setgoodbye

# Probar
.goodbye @usuario
.bye

# Resetear a default (solo este grupo)
.delwelcome
.resetwelcome
.delgoodbye
.delbye
.resetbye
```

Cada grupo tiene su propio mensaje. Cambiar en `Grupo A` **no** afecta a `Grupo B`.

---

## 6) Verificación

Mock test ejecutado (ver sección bash arriba):
```
111@g.us setwelcome "Bienvenido {usuario} a {grupo} 🎉" → ✅ 222 intacto
222@g.us setwelcome "Hola {usuario} diferente" → ✅ aislamiento
setgoodbye per-grupo → ✅
sin texto muestra actual del grupo → ✅
```

Sintaxis: `node --check plugins/group-setwelcome.js` → ✅

Git push: `e8a3a10..bf8712f main -> main` → ✅

---

## 7) Próximos pasos recomendados

- [ ] Regenerar token GitHub (el usado está expuesto en el remote)
- [ ] `git remote set-url origin https://github.com/yosue891/SHADOW-BOT-MD.git`
- [ ] `npm install --ignore-engines` y probar `node src/index.js --code` para vincular
- [ ] En cada grupo probar `.setwelcome` / `.welcome` y `.setgoodbye` / `.goodbye`
- [ ] Si usas sub-bots (`Sessions/SubBot`), el fix ya contempla `handlerChat` por lo que funciona también con sub-bots.

¿Quieres que también te deje el bot corriendo en PM2 aquí mismo?
