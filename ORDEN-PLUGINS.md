# 🗂️ ORDEN-PLUGINS — Organización de los comandos de SHADOW-BOT-MD

**Fecha:** 2026-09-20
**Repo:** https://github.com/yosue891/SHADOW-BOT-MD

Los **262 plugins** del bot quedaron organizados en **18 carpetas temáticas** dentro de `plugins/`.
Ya no hay archivos sueltos en la raíz de `plugins/`.

```
plugins/
├── owner/          comandos del dueño
├── ia/             todas las IA
├── menus/          todos los menús
├── grupos/         administración de grupos
├── economia/       economía
├── gacha/          gacha de waifus
├── anime/          acciones anime
├── nsfw/           +18
├── descargas/      descargas (YT, TikTok, IG, Spotify...)
├── herramientas/   utilidades y búsquedas
├── stickers/       stickers y packs
├── fun/            diversión y juegos
├── subbots/        sub-bots / jadibots
├── registro/       registro de usuarios
├── info/           información del bot y del sistema
├── ajustes/        toggles (welcome, antilink, nsfw, antispam...)
├── sistema/        hooks internos del framework (no son comandos)
└── pruebas/        comandos experimentales
```

## Resumen por carpeta

| Carpeta | Archivos | ¿Qué contiene? |
|---|---|---|
| `plugins/ajustes/` | 1 | Toggles de configuración: welcome, antilink, nsfw, modoadmin, antispam, etc. |
| `plugins/anime/` | 30 | Acciones y reacciones anime (hug, kiss, pat, waifu, etc.). |
| `plugins/descargas/` | 13 | Descargas: YouTube, TikTok, IG, Spotify, Facebook, Mediafire, etc. |
| `plugins/economia/` | 24 | Sistema de economía: work, daily, bank, robar, slots, ruleta, etc. |
| `plugins/fun/` | 22 | Diversión y juegos: 8ball, parejas, piropos, memes, sopa de letras, etc. |
| `plugins/gacha/` | 16 | Sistema gacha de waifus: reclamar, harem, top, trade, votar, etc. |
| `plugins/grupos/` | 28 | Administración de grupos: kick, promote, link, antilink manual, welcome, etc. |
| `plugins/herramientas/` | 35 | Utilidades: stickers, imágenes, traductor, github, inspectar, búsquedas, etc. |
| `plugins/ia/` | 5 | Todos los comandos de inteligencia artificial del bot. |
| `plugins/info/` | 8 | Información del bot y del sistema: ping, ram, socket, status, creadores, etc. |
| `plugins/menus/` | 12 | Todos los menús del bot (principal, listas y menús por categoría). |
| `plugins/nsfw/` | 9 | Comandos +18 (solo se activan con el toggle nsfw del grupo). |
| `plugins/owner/` | 24 | Comandos exclusivos del dueño (root): gestión de users, plugins, config, eval/exec, reinicio, etc. |
| `plugins/pruebas/` | 2 | Comandos experimentales / de prueba (prods, prodz). |
| `plugins/registro/` | 2 | Registro de usuarios (verificar/registrar y borrar registro). |
| `plugins/sistema/` | 15 | Hooks internos del framework (no son comandos): antilink, antispam, niveles, welcome, validación, etc. |
| `plugins/stickers/` | 7 | Creación de stickers y packs (brat, emojimix, qc, etc.). |
| `plugins/subbots/` | 9 | Sub-bots / jadibots: conexión, ajustes, name, prefix, imagen, etc. |

## ⚙️ Cómo funciona ahora (importante si editas plugins)

1. **El cargador es recursivo.** `src/index.js` recorre `plugins/` y todas sus
   subcarpetas. La clave de cada plugin en `global.plugins` es su ruta relativa:
   `"grupos/group-kick.js"`, `"ia/ai-gemini.js"`, etc.
2. **Los imports a `lib/` suben dos niveles.** Un plugin dentro de una carpeta usa:
   ```js
   import { xpRange } from '../../lib/levelling.js'   // ✅ correcto en subcarpetas
   // import { xpRange } from '../lib/levelling.js'   // ❌ ya no aplica
   ```
3. **Hot-reload recursivo.** Si editas, creas o borras un `.js` dentro de cualquier
   carpeta, el bot lo recarga en caliente sin reiniciar (verificado: *new plugin*,
   *updated plugin*, *deleted plugin*).
4. **Puedes seguir usando la raíz.** Un plugin nuevo en `plugins/mi-plugin.js` se
   carga igual (clave `"mi-plugin.js"`), aunque lo recomendado es meterlo en su carpeta.
5. **Comandos de owner adaptados** a la nueva estructura:
   - `.saveplugin fun/mi-plugin` (responde al código) → lo guarda en `plugins/fun/`.
     Si escribes solo `.saveplugin mi-plugin` → se guarda en la raíz de `plugins/`.
   - `.delplugin fun-top` (busca en todas las carpetas) o `.delplugin fun/fun-top`.
   - `.getplugin fun-top` o `.getplugin grupos/group-kick` → te manda el código.
   - `.detectar` / `.checksyntax` → escanea recursivamente todas las carpetas.
   - Todos validan rutas: se bloquea cualquier intento de salir de `plugins/` (`..`).

## 📌 Reglas al agregar un comando nuevo

- Nombre del archivo: `categoria-nombre.js` y va en su carpeta, ej.
  `plugins/fun/fun-nueva-idea.js`.
- Exporta siempre `export default handler` con `handler.command = ['...']`.
- Si usas cosas de `lib/`, importa con `../../lib/...`.
- Respeta las etiquetas: `handler.tags` (ej. `['owner']`, `['grupos']`) para que el
  comando aparezca en el menú correcto (`prin-*`).
- `handler.rowner = true` para comandos solo del dueño, `handler.group = true` /
  `handler.admin = true` para grupos.

---

## Detalle completo (archivo → comandos)

### plugins/ajustes/ — 1 archivos
- `_options.js` → `welcome`, `bienvenida`, `antiprivado`, `antiprivate`, `restrict`, `restringir`, `autolevelup`, `autonivel`, `antibot`, `antibots`, `autoaceptar`, `aceptarauto`, `autorechazar`, `rechazarauto`, `autoresponder`, `autorespond`, `antisubbots`, `antibot2`, `modoadmin`, `soloadmin`, `reaction`, `reaccion`, `nsfw`, `modohorny`, `antispam`, `jadibotmd`, `modejadibot`, `subbots`, `detect`, `avisos`, `antilink`, `antifake`, `autoread`

### plugins/anime/ — 30 archivos
- `anime-cafe.js` → `coffee`, `cafe`, `taza`
- `anime-cosplay.js` → `cosplay`
- `anime-cuddle.js` → `cuddle`, `acurrucarse`
- `anime-dance.js` → `dance`, `bailar`
- `anime-eat.js` → `eat`, `comer`
- `anime-episodios.js` → `anime`, `animedl`
- `anime-happy.js` → `happy`, `feliz`
- `anime-hello.js` → `hello`, `hola`
- `anime-hide.js` → `hide`, `esconder`, `seesconde`
- `anime-hug.js` → `hug`, `abrazar`
- `anime-kill.js` → `kill`, `matar`
- `anime-kiss.js` → `kiss`, `besar`
- `anime-kiss2.js` → `kiss2`, `besar2`
- `anime-kisscheek.js` → `kisscheek`
- `anime-laugh.js` → `laugh`, `reirse`
- `anime-lean.js` → `lean`, `recostar`, `recostarse`
- `anime-lick.js` → `lick`, `lamer`, `licking`
- `anime-look.js` → `look`, `mirar`, `mira`
- `anime-love.js` → `love`, `amor`, `enamorada`
- `anime-morder.js` → `morder`, `bite`
- `anime-pampering.js` → `pampering`, `mimos`, `apapachar`
- `anime-pat.js` → `pat`, `acariciar`
- `anime-pout.js` → `pout`, `pucheros`
- `anime-preg.js` → `preg`, `embarazar`, `preñar`
- `anime-sad.js` → `sad`, `triste`
- `anime-seduce.js` → `seduce`, `seducir`
- `anime-slap.js` → `slap`, `bofetada`
- `anime-smoke.js` → `smoke`, `fumar`, `fumando`
- `anime-waifu.js` → `waifu`
- `anime-yawn.js` → `yawn`, `bostezo`, `bostezar`

### plugins/descargas/ — 13 archivos
- `_test.js` → `testytmp3full`
- `dls-apetoide.js` → `apk`
- `dls-audivd.js` → `audivd`
- `dls-facebook.js` → `facebook`, `fb`
- `dls-ig.js` → `instagram`, `ig`
- `dls-mediafire.js` → `mf`, `mediafire`
- `dls-play.js` → `play`, `playaudio`, `ytaudio`
- `dls-playdocs.js` → `mp3doc`, `ytmp3doc`, `mp4doc`, `ytmp4doc`
- `dls-spotify.js` → regex /^(spotify|spdl)$/i
- `dls-tiktok.js` → `tt`, `tiktok`
- `dls-wallpaper.js` → `wallpaper`, `wp`
- `dls-ytmp.js` → `ytmp3`, `playvid`, `ytv`, `ytmp4`, `yt`
- `herras-playch.js` → `playch`

### plugins/economia/ — 24 archivos
- `economia-apostar.js` → `apostar`, `casino`
- `economia-aventura.js` → `adventure`, `aventura`
- `economia-bank.js` → `bal`, `balance`, `bank`
- `economia-cazar.js` → `cazar`, `hunt`
- `economia-cofre.js` → `coffer`, `cofre`, `abrircofre`, `cofreabrir`
- `economia-crime.js` → `crimen`, `crime`
- `economia-curar.js` → `heal`, `curar`
- `economia-daily.js` → `daily`, `diario`
- `economia-dep.js` → `deposit`, `depositar`, `d`, `dep`
- `economia-einfo.js` → `economyinfo`, `infoeconomy`, `einfo`
- `economia-flip.js` → `cf`, `suerte`, `coinflip`, `flip`
- `economia-give.js` → `pay`, `coinsgive`, `givecoins`
- `economia-minar.js` → `minar`, `miming`, `mine`
- `economia-monthly.js` → `monthly`, `mensual`
- `economia-navidad.js` → `navidad`, `christmas`
- `economia-pescar.js` → `pescar`, `fish`
- `economia-retirar.js` → `withdraw`, `retirar`, `with`
- `economia-robar.js` → `robar`, `steal`, `rob`
- `economia-ruleta.js` → `ruleta`, `roulette`, `rt`
- `economia-slot.js` → `slot`
- `economia-slut.js` → `slut`, `protituirse`
- `economia-weekly.js` → `weekly`, `semanal`
- `economia-work.js` → `w`, `work`, `chambear`, `chamba`, `trabajar`
- `economía-eboard.js` → `baltop`, `eboard`, `economyboard`

### plugins/fun/ — 22 archivos
- `fun-8ball.js` → `8ball`, `shadowball`, `naviball`
- `fun-afk.js` → (hook interno, sin comando)
- `fun-afk2.js` → `afk`
- `fun-calculador.js` → `gay`, `lesbiana`, `pajero`, `pajera`, `puto`, `puta`, `manco`, `manca`, `rata`, `prostituta`, `prostituto`
- `fun-cancion.js` → `cancion`, `canción`
- `fun-confesar.js` → `confesar`, `confesiones`
- `fun-consejo.js` → `consejo`
- `fun-esclavizar.js` → `esclavizar`, `esclavo_opcion`, `liberar`, `liberar_confirm`, `esclavos`
- `fun-formarpareja.js` → `formarpareja`, `formarparejas`
- `fun-formarpareja5.js` → `formarpareja5`
- `fun-marry.js` → `marry`, `casarse`, `divorce`, `divorciarse`, `confirmdivorce`, `acceptmarry`, `declinemarry`
- `fun-memes.js` → `meme`
- `fun-nombreshadow.js` → `nombreshadow`, `nombreninja`, `shadowgarden`
- `fun-orcado.js` → `orcado`, `ahorcado`, `letra`
- `fun-pedido.js` → `pedido`
- `fun-piropo.js` → `piropo`
- `fun-pista.js` → `pista`, `hint`
- `fun-pvp.js` → `pvp`, `ppt`
- `fun-shadowbug.js` → `shadowbug`
- `fun-sopa.js` → `sopa`, `sopadeletras`, `shadowgame`, `resolver`
- `fun-top.js` → `top`
- `fun-trio.js` → `formartrio`

### plugins/gacha/ — 16 archivos
- `gacha-delwaifu.js` → `delchar`, `deletewaifu`, `delwaifu`
- `gacha-favtop.js` → `setfav`, `wfav`, `favtop`, `favoritetop`, `favboard`, `deletefav`, `delfav`
- `gacha-give.js` → `givechar`, `givewaifu`, `regalar`
- `gacha-giveall.js` → `giveallharem`
- `gacha-harem.js` → `harem`, `waifus`, `claims`
- `gacha-infogacha.js` → `gachainfo`, `ginfo`, `infogacha`
- `gacha-reclamar.js` → `claim`, `c`, `reclamar`
- `gacha-robwaifu.js` → `robwaifu`, `robarwaifu`
- `gacha-rw.js` → `rollwaifu`, `rw`, `roll`
- `gacha-serieinfo.js` → `serielist`, `slist`, `animelist`, `serieinfo`, `ainfo`, `animeinfo`
- `gacha-setclaimmsg.js` → `setclaimmsg`, `setclaim`, `delclaimmsg`, `resetclaimmsg`
- `gacha-topwaifus.js` → `waifusboard`, `waifustop`, `topwaifus`, `wtop`
- `gacha-trade.js` → `trade`, `intercambiar`
- `gacha-votar.js` → `vote`, `votar`
- `gacha-wshop.js` → `sell`, `vender`, `removesale`, `removerventa`, `haremshop`, `tiendawaifus`, `wshop`, `buycharacter`, `buychar`, `buyc`
- `gacha-wvideo.js` → `charinfo`, `winfo`, `waifuinfo`, `charimage`, `waifuimage`, `cimage`, `wimage`, `charvideo`, `waifuvideo`, `cvideo`, `wvideo`

### plugins/grupos/ — 28 archivos
- `group-advertir.js` → `advertir`, `advertencia`, `warn`, `unwarn`, `quitarwarn`, `delwarn`
- `group-banchat.js` → `banearbot`, `banchat`
- `group-cerrar.js` → `cerrar`
- `group-close.js` → `close`, `open`
- `group-del.js` → `del`, `delete`
- `group-delprimary.js` → `delprimary`
- `group-demote.js` → `demote`, `degradar`
- `group-encuesta.js` → `poll`, `encuesta`, `shadowpoll`
- `group-fantasmas.js` → `inactivos`, `fantasmas`, `kickinactivos`, `kickfantasmas`
- `group-infor.js` → `infogrupo`, `gp`
- `group-invocar.js` → `tagall`, `invocar`, `todos`
- `group-kick.js` → `kick`, `echar`, `hechar`, `sacar`, `ban`
- `group-kicknum.js` → `kicknum`, `listnum`, `listanum`
- `group-lid.js` → `lid`, `lidnum`
- `group-linea.js` → `listonline`, `online`, `linea`, `enlinea`
- `group-link.js` → `link`, `enlace`
- `group-mute.js` → `mute`, `unmute`
- `group-perfil.js` → `profile`, `perfil`
- `group-promote.js` → `promote`, `promover`
- `group-rastreo.js` → `rastrear`
- `group-revoke.js` → `revoke`, `restablecer`
- `group-setgp.js` → `gpbanner`, `groupimg`, `gpdesc`, `groupdesc`, `gpname`, `groupname`
- `group-setprimary.js` → `setprimary`
- `group-setwelcome.js` → `setwelcome`, `setbienvenida`, `setgoodbye`, `setbye`, `setdespedida`, `delwelcome`, `delgoodbye`, `delbye`, `resetwelcome`, `resetgoodbye`, `resetbye`
- `group-tag.js` → `tag`, `todos`
- `group-unbanchat.js` → `desbanearbot`, `unbanchat`
- `group-verprimary.js` → `verprimary`
- `wc.js` → `welcome`, `bienvenida`, `banner`, `goodbye`, `bye`, `despedida`

### plugins/herramientas/ — 35 archivos
- `herras-catbox.js` → `catbox`
- `herras-columna.js` → `tabla`
- `herras-comprimir.js` → `compress`, `comprimir`
- `herras-form.js` → `form`
- `herras-get.js` → `fetch`, `get`
- `herras-gitclone.js` → `gitclone`
- `herras-githubraw.js` → `raw`, `rawurl`, `githubraw`
- `herras-githubstalk.js` → `githubstalk`, `ghstalk`, `github`
- `herras-hd.js` → `hd`
- `herras-ibtn.js` → `ibtn`
- `herras-imgbbshadow.js` → `imgbbshadow`, `uploadshadow`
- `herras-inspeccionar.js` → `inspect`, `inspeccionar`, `inspector`, `id`, `idgp`, `gp`
- `herras-lottie.js` → `lottie`
- `herras-nombre.js` → regex /^(nombre)$/i
- `herras-pix.js` → `pix`, `pago`
- `herras-ptv.js` → `ptv`, `pvideo`, `circlevideo`
- `herras-quozio.js` → `quozio`
- `herras-reducir.js` → `reduce`, `reducir`
- `herras-reels.js` → `reels`
- `herras-remover.js` → `remover`, `removebg`
- `herras-ss.js` → `ssweb`, `ss`
- `herras-toimg.js` → `toimg`, `jpg`, `img`
- `herras-tourl.js` → `tourl`, `upload`, `url`
- `herras-traducir.js` → `translate`, `trad`, `tr`, `traducir`, `treaductor`, `transle`
- `herras-ver.js` → `readviewonce`, `read`, `readvo`, `ver`
- `herras-whatmusic.js` → `shazam`, `whatmusic`
- `herrs-userptv.js` → `userptv`
- `search-ptv.js` → `ptvsearch`, `ptvtt`, `ttptv`
- `searchs-google.js` → `search`, `google`
- `searchs-infoanime.js` → `infoanime`
- `searchs-npmjs.js` → `npmjs`
- `searchs-pinterest.js` → `pinterest`, `pin`
- `searchs-tiktok.js` → `tiktoks`, `tiktoksearch`, `ttss`
- `searchs-yts.js` → `ytbuscar`, `ytsearch`, `yts`
- `tools-say.js` → `say`, `decir`

### plugins/ia/ — 5 archivos
- `ai-chatgpt.js` → regex /^(openai|chatgpt|ia|ai|chatgpt2|ia2)$/i
- `ai-copilot.js` → `copilot`
- `ai-gemini.js` → `gemini`
- `ai-simi.js` → `simi`
- `ai-venice.js` → `venice`, `veniceai`

### plugins/info/ — 8 archivos
- `_status.js` → `status`, `report`, `estado`, `informe`
- `info-bot.js` → (hook interno, sin comando)
- `info-cuentasoficiales.js` → `cuentasoficiales`
- `info-owner.js` → regex /^(owner|creators|creadores|owners|desarrolladores)$/i
- `info-script.js` → `script`, `sc`
- `info-socket.js` → `info`, `infobot`, `infosocket`
- `infor-ping.js` → `ping`, `p`
- `infor-ram.js` → `speed`, `sped`

### plugins/menus/ — 12 archivos
- `prin-allmenu.js` → `allmenu`
- `prin-cmdsinfo.js` → `suggest`, `sug`, `report`, `reportar`, `invite`, `fixmsg`, `ds`
- `prin-menu.js` → `help`, `menu`, `m`
- `prin-menuanime.js` → `menuanime`
- `prin-menudescarga.js` → `menudescargas`, `menudescar`
- `prin-menufun.js` → `menufun`
- `prin-menugacha.js` → `menugacha`
- `prin-menugrupo.js` → `menugrupo`
- `prin-menuherras.js` → `menuherras`
- `prin-menuia.js` → `menuia`
- `prin-menulist.js` → `mls`, `menulist`
- `prin-menuowner.js` → `menuowner`

### plugins/nsfw/ — 9 archivos
- `nfsw-rule34.js` → `r34`, `rule34`
- `nsfw-69.js` → `sixnine`, `69`
- `nsfw-anal.js` → `anal`, `culiar`
- `nsfw-chaqueta.js` → `jalame`, `jalamela`, `chaqueteame`, `chaqueta`
- `nsfw-cum.js` → `cum`, `leche`
- `nsfw-hentaiseach.js` → `hentaisearch`
- `nsfw-sexso.js` → `sexo`, `sex`
- `nsfw-tetas.js` → `tetas`
- `nsfw-yuri.js` → `yuri`, `lesbianas`, `tijeras`

### plugins/owner/ — 24 archivos
- `_ts.js` → `limpiar`, `checkspace`
- `dueño-addowner.js` → `addowner`, `addown`, `setowner`, `delowner`, `dedown`, `ownerlist`, `listowner`
- `dueño-autoadmin.js` → `admin`, `atad`, `autoadmin`
- `dueño-banuser.js` → `banuser`
- `dueño-bcgc.js` → `bcgc`
- `dueño-cachesubs.js` → `limpiarsubbots`, `clearbots`, `cleanall`
- `dueño-delplugin.js` → `delplugin`, `removeplugin`
- `dueño-detectar.js` → `detectarsyntax`, `detectar`, `checksyntax`
- `dueño-dsowner.js` → `delai`, `dsowner`, `clearallsession`
- `dueño-eval.js` → `eval`, `ev`, `evaluate`, `>`, `run`, `execute`
- `dueño-exec.js` → regex /(?:)/
- `dueño-fix.js` → `update`, `fix`, `actualizar`
- `dueño-follow.js` → `followchannel`
- `dueño-getmeta.js` → regex /^getmeta$/i
- `dueño-getplungin.js` → `getplugin`, `gp`
- `dueño-grupolist.js` → `listgroup`, `gruposlista`, `grouplist`, `listagrupos`
- `dueño-ip.js` → `ip`
- `dueño-lisban.js` → `banlist`, `listban`
- `dueño-ptvsearch.js` → `ptvch`, `ptvchanel`, `ptvstory`
- `dueño-restart.js` → `restart`, `reiniciar`
- `dueño-reunion.js` → `reunion`, `meeting`
- `dueño-saveplugin.js` → `saveplugin`
- `dueño-spam2.js` → `spam2`
- `dueño-unbanuser.js` → `unbanuser`

### plugins/pruebas/ — 2 archivos
- `pruebas-pods.js` → `prods`
- `pruebas-prodz.js` → `prodz`

### plugins/registro/ — 2 archivos
- `rg-unreg.js` → `unreg`, `borrarregistro`, `delreg`
- `rg-verificar.js` → `verify`, `verificar`, `reg`, `register`, `registrar`

### plugins/sistema/ — 15 archivos
- `_antilink.js` → (hook interno, sin comando)
- `_antiprivado-arabes.js` → (hook interno, sin comando)
- `_antiprivate.js` → (hook interno, sin comando)
- `_antispam.js` → (hook interno, sin comando)
- `_antisubbots.js` → (hook interno, sin comando)
- `_cmdWithMedia.js` → (hook interno, sin comando)
- `_fakes.js` → (hook interno, sin comando)
- `_infomessage.js` → (hook interno, sin comando)
- `_level.js` → (hook interno, sin comando)
- `_modoadmin.js` → (hook interno, sin comando)
- `_rcanal.js` → (hook interno, sin comando)
- `_templateResponse.js` → (hook interno, sin comando)
- `_userPrem.js` → (hook interno, sin comando)
- `_validCommand.js` → (hook interno, sin comando)
- `_welcome.js` → (hook interno, sin comando)

### plugins/stickers/ — 7 archivos
- `herras-brat.js` → regex /^(brat|bratcolor)$/i
- `herras-bratvid.js` → `bratvid`
- `herras-emojimix.js` → `emojimix`, `mixemoji`, `mixemojis`
- `herras-pack.js` → `pack`, `stickerpack`
- `stickers-qc.js` → `qc`
- `stickers-s.js` → `sticker`, `s`, `stiker`
- `stickers-search.js` → `stickersearch`, `search`

### plugins/subbots/ — 9 archivos
- `subs-ajustes.js` → `self`, `public`, `antiprivate`, `gponly`, `sologp`, `join`, `salir`, `leave`, `logout`, `reload`
- `subs-conexion.js` → `qr`, `code`
- `subs-darcode.js` → `darcode`
- `subs-listbots.js` → `botlist`, `listbots`, `bots`
- `subs-perfil.js` → `setpfp`, `setimage`, `setstatus`, `setbio`, `setusername`, `setuser`
- `subs-setimagen.js` → `setimagen`
- `subs-setname.js` → `setname`
- `subs-setprefix.js` → `setprefix`
- `subs-setvid.js` → `setvid`

---

## ✅ Verificación realizada tras la reorganización

| Prueba | Resultado |
|---|---|
| Archivos cargados por el bot | **262/262** (`[ ✿ ] Plugins cargados: 262`) |
| Errores de import | **0** |
| Comandos registrados | **245 plugins con comando + 17 hooks internos** = igual que antes de mover |
| Sintaxis (`node --check`) | OK en todo `plugins/`, `lib/`, `src/` y `config.js` |
| Hot-reload en subcarpetas | ✅ nuevo, ✅ actualizado, ✅ borrado |
| `npm test` | ✅ pasa |
| Comandos owner de gestión de plugins | ✅ adaptados a subcarpetas + validación de rutas |

> El comando `test` eliminado antes sigue eliminado; `testytmp3full` quedó en
> `plugins/descargas/_test.js`.
