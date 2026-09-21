/* ============================================================
   ia-shadowia.js  —  Shadowia, asistente personal de Yosue
   ------------------------------------------------------------
   • Usa la MISMA API que el plugin de Simi:
     https://api-gohan-v1.onrender.com/ai/gemini?text=...
   • Personalidad NEUTRA (sin sarcasmo, sin insultos).
   • SOLO owners  ->  handler.rowner = true
   • Ejecuta administración por lenguaje natural:
     promote / demote / kick / add / nombre / descripción /
     foto del grupo / abrir / cerrar / anunciar / salir.
   • Puede ejecutar CUALQUIER comando del bot en nombre del owner.
   • Las acciones destructivas NO las decide la IA: se resuelven
     con reglas deterministas. La IA solo conversa.
   ============================================================ */

import axios from 'axios'

const API_URL = 'https://api-gohan-v1.onrender.com/ai/gemini?text='
const API_TIMEOUT = 90_000 // la API fría puede tardar ~35s

const PROMPT_SHADOWIA = `Eres Shadowia, la asistente personal de Yosue, el dueño de este bot.

Cómo eres:
- Eres una asistente personal de verdad: cálida, cercana, atenta y profesional.
- Tono neutro y amable. Sin sarcasmo, sin ironía, sin insultos, sin bromas pesadas.
- Hablas de forma natural y conversacional, como una persona, no como un manual.
- Puedes tratarlo de "jefe" con cariño, pero sin exagerar ni repetirlo.
- Respondes en español.

Cómo respondes:
- Sé breve pero con diálogo real: 1 a 4 frases sueltas, no un muro de texto.
- No uses asteriscos, guiones bajos, viñetas ni listas numeradas.
- Usa algún emoji de vez en cuando, máximo 2 por respuesta, y no siempre.
- Si te cuenta algo, reacciona a eso antes de responder; no cambies de tema.
- Si lo que te pide no está claro, haz UNA pregunta concreta para entenderlo.
- Cuando tenga sentido, ofrece el siguiente paso (por ejemplo: avisar al grupo,
  revisar la lista de admins, dejar un recordatorio). Sin insistir.
- Usa el contexto de la conversación: si se refiere a "él", "ella", "eso" o
  "el de antes", entiende a quién o a qué se refiere.
- No inventes datos. Si no sabes algo, dilo con honestidad.
- No repitas tu nombre en cada respuesta ni menciones números de teléfono.

Ahora responde lo siguiente`

/* Comandos que el asistente NO ejecuta aunque el owner se lo pida,
   para no dejar el bot inutilizable desde el chat. */
const BLOQUEADOS = new Set(['delplugin', 'saveplugin', 'eval', 'exec', 'restart', 'fix', 'dsowner'])

/* ────────────── memoria (en RAM, por chat) ──────────────
   Guarda qué hizo Shadowia en cada grupo para poder entender
   «devuélvele admin al que se lo quitaste». Se pierde al reiniciar
   el bot a propósito: es más seguro que promover a la persona
   equivocada por un dato viejo. */
const TTL_MEMORIA = 30 * 60 * 1000 // 30 minutos
const MAX_HISTORIAL = 5
const MAX_CONVERSA = 8
const memoria = new Map() // chat -> { acciones: [], conversa: [] }

export function getMemoria(chat) {
  const ahora = Date.now()
  let reg = memoria.get(chat)
  if (!reg) {
    reg = { acciones: [], conversa: [] }
    memoria.set(chat, reg)
  }
  reg.acciones = reg.acciones.filter((a) => ahora - a.ts < TTL_MEMORIA)
  reg.conversa = reg.conversa.filter((c) => ahora - c.ts < TTL_MEMORIA)
  return reg
}

export function registrarAccion(chat, accion, jid) {
  const reg = getMemoria(chat)
  reg.acciones.push({ accion, jid, ts: Date.now() })
  if (reg.acciones.length > MAX_HISTORIAL) reg.acciones.shift()
  return reg.acciones[reg.acciones.length - 1]
}

export function registrarCharla(chat, usuario, ia) {
  const reg = getMemoria(chat)
  reg.conversa.push({ rol: 'user', texto: String(usuario).slice(0, 500), ts: Date.now() })
  reg.conversa.push({ rol: 'shadowia', texto: String(ia).slice(0, 500), ts: Date.now() })
  while (reg.conversa.length > MAX_CONVERSA * 2) reg.conversa.shift()
}

export function limpiarMemoria(chat) {
  memoria.delete(chat)
}

/** minutos transcurridos, redondeado hacia arriba (mínimo 1) */
const haceMinutos = (ts) => Math.max(1, Math.round((Date.now() - ts) / 60000))

/* ────────────────────────── utilidades ────────────────────────── */

const limpiar = (s = '') =>
  String(s)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')

/** quita la mención "@58424..." para dejar solo el texto libre */
const sinMenciones = (s = '') => String(s).replace(/@\d{5,}/g, ' ').replace(/\s+/g, ' ').trim()

/** solo para intenciones de texto libre: elimina signos de interrogación/exclamación */
const sinSignos = (s = '') => String(s).replace(/[¿?¡!]/g, ' ').replace(/\s+/g, ' ').trim()

/**
 * Un JID puede llegar como "584241234567:12@s.whatsapp.net" (con dispositivo)
 * o como "...@lid". Esto deja solo los dígitos para poder comparar.
 */
export function jidNumero(jid) {
  const s = String(jid || '')
  const m = s.match(/(\d{5,})(?::\d+)?@/)?.[1]
  return m || s.replace(/\D/g, '') || null
}

/**
 * Busca un participante por cualquiera de sus identidades.
 * Idéntico criterio al de src/handler.js: id, jid, lid o phoneNumber.
 */
export function buscarParticipante(participants, jid) {
  const num = jidNumero(jid)
  if (!num || !Array.isArray(participants)) return null
  return (
    participants.find((p) => {
      const ids = [p?.id, p?.jid, p?.lid, p?.phoneNumber].filter(Boolean).map(jidNumero)
      return ids.includes(num)
    }) || null
  )
}

/**
 * ¿Es admin este participante? Acepta 'admin', 'superadmin' y las variantes
 * booleanas, igual que isAdminParticipant() de src/handler.js.
 */
export function esAdminParticipante(p) {
  return p?.admin === 'admin' || p?.admin === 'superadmin' || p?.isAdmin === true || p?.isSuperAdmin === true
}

/**
 * Extrae el valor de "cambia el nombre del grupo a X" / "pon la descripción por X".
 * @param {string} texto texto original (sin normalizar)
 * @param {RegExp} patron debe capturar el grupo 1 = verbo+campo
 */
export function extraerValor(texto, patron) {
  const limpio = sinMenciones(texto).trim()
  const m = patron.exec(limpio)
  let resto = m ? limpio.slice(m[0].length) : limpio
  // va quitando «del grupo» y la preposición hasta que ya no cambia nada,
  // porque pueden aparecer en cualquier orden («... a del grupo», «... del grupo a ...»)
  let anterior
  do {
    anterior = resto
    resto = resto.replace(/^(del\s+grupo)\s*/i, '').replace(/^(a|al|por|en|=|:)\s+/i, '').trim()
  } while (resto !== anterior)
  return resto
}

const RE_NOMBRE = /^(cambia|cambiar|pon|poner|pone|actualiza|actualizar|renombra|renombrar)\s+(el\s+)?(nombre|titulo|t[ií]tulo|subject)/i
const RE_DESC = /^(cambia|cambiar|pon|poner|pone|actualiza|actualizar)\s+(la\s+)?(descripcion|descripci[oó]n|desc)/i

/**
 * Interpreta la orden del owner y devuelve una intención determinista.
 * No depende de la IA: es puro texto -> acción.
 * El ORDEN importa: demote va antes que promote (por "quítale el admin"),
 * y «usa <comando>» va antes que la ayuda.
 * @returns {{action:string, value?:string, extra?:string, needsGroup?:boolean, needsAdmin?:boolean, reason?:string}}
 */
export function parsearOrden(rawText = '') {
  const t = limpiar(rawText).trim()
  const tSinSignos = sinSignos(t)

  if (!t) return { action: 'ayuda' }

  /* Tabla ordenada: la primera coincidencia gana. */
  const INTENCIONES = [
    {
      action: 'salir',
      re: /(^|\s)(sal(te|gan|ida)?|sal\s*de\s*aqu[ií]|vete|ret[ií]rate|leave|out|fuera\s*de\s*aqu[ií]|abandona(r)?\s*(el\s*)?grupo)(\s|$|!|\.)/,
      needsGroup: true,
    },
    {
      action: 'devolverAdmin',
      // ANTES que demote: si no, «devuélvele el admin» caería en «quita...admin»
      re: /(^|\s)(devuelve(le|les)?|regresa(le|les)?|retorna(le|les)?|restaura(r)?|reestablece(r)?|restablece(r)?|dale\s+de\s+vuelta|devolver|regresar|deshaz|deshacer|revierte|revertir|undo)\s+(?:\w+\s+){0,3}admin/,
      needsGroup: true, needsAdmin: true,
    },
    {
      action: 'demote',
      re: /(^|\s)(degradar|degrada|quita(le|les)?\s*(el\s*)?admin|quitar\s*admin|saca(le|les)?\s*(el\s*)?admin|sacar\s*admin|retira(r)?\s*(el\s*)?admin|demote)(\s|$)/,
      needsGroup: true, needsAdmin: true,
    },
    {
      action: 'promote',
      re: /(^|\s)(promociona|promover|promueve|promote|has\s*admin|haz\s*admin|dale\s*admin|da(le|les)?\s*admin|dar\s*admin|admin\s*a|asciende|ascender)(\s|$)/,
      needsGroup: true, needsAdmin: true,
    },
    {
      action: 'kick',
      re: /(^|\s)(kick|kick?ea(r|lo|la|los|las)?|expulsa(r|lo|la|los|las)?|echa(r|lo|la|los|las)?|hecha(r|lo|la|los|las)?|saca(r|lo|la|los|las)?|elimina(r|lo|la|los|las)?|banea(r|lo|la|los|las)?|fuera\s*a)(\s|$)/,
      needsGroup: true, needsAdmin: true,
    },
    {
      action: 'add',
      re: /(^|\s)(agrega|agregar|anade|añade|mete|meter|invita|invitar|add|addnum)(\s|$)/,
      needsGroup: true, needsAdmin: true,
    },
    {
      action: 'nombre',
      re: /(cambia|cambiar|pon|poner|actualiza|actualizar|renombra|renombrar)\s*(el\s*)?(nombre|titulo|t[ií]tulo|subject)(\s+del\s+grupo)?/,
      needsGroup: true, needsAdmin: true,
      valor: (raw) => extraerValor(raw, RE_NOMBRE),
    },
    {
      action: 'descripcion',
      re: /(cambia|cambiar|pon|poner|actualiza|actualizar)\s*(la\s*)?(descripcion|descripci[oó]n|desc)(\s+del\s+grupo)?/,
      needsGroup: true, needsAdmin: true,
      valor: (raw) => extraerValor(raw, RE_DESC),
    },
    {
      action: 'foto',
      re: /((cambia|cambiar|pon|poner|actualiza|actualizar)\s*(la\s*)?(foto|imagen|perfil|portada|banner|pp)(\s+del\s+grupo)?|(foto|imagen|portada|banner)\s+(del|de\s+este)?\s*grupo)/,
      needsGroup: true, needsAdmin: true,
    },
    { action: 'abrir', re: /(^|\s)(abre|abrir|unlock|desbloquea|desbloquear)\s*(el\s*)?grupo/, needsGroup: true, needsAdmin: true },
    { action: 'cerrar', re: /(^|\s)(cierra|cerrar|lock|bloquea|bloquear)\s*(el\s*)?grupo/, needsGroup: true, needsAdmin: true },
    { action: 'anunciosOn', re: /(^|\s)(activa|activar|prende)\s*(los\s*)?anuncios/, needsGroup: true, needsAdmin: true },
    { action: 'anunciosOff', re: /(^|\s)(desactiva|desactivar|apaga|quita)\s*(los\s*)?anuncios/, needsGroup: true, needsAdmin: true },

    /* «usa <comando>» ANTES que la ayuda: si no, «usa menu» caía en ayuda */
    {
      action: 'comando',
      re: /^(?:usa|usar|ejecuta|ejecutar|corre|correr|lanza|lanzar|aplica|aplicar)\s+(?:el\s+)?(?:comando\s+)?([a-z0-9_-]+)(?:\s+([\s\S]*))?$/,
      parse: (match) => ({ value: match[1], extra: (match[2] || '').trim() }),
    },

    { action: 'ayuda', re: /(?:^|\s)(?:ayuda|help|que\s+puedes\s+hacer|que\s+sabes\s+hacer|que\s+haces)\s*$/, entrada: 'sinSignos' },
  ]

  for (const intencion of INTENCIONES) {
    const match = intencion.re.exec(intencion.entrada === 'sinSignos' ? tSinSignos : t)
    if (!match) continue
    const orden = { action: intencion.action }
    if (intencion.needsGroup) {
      orden.needsGroup = true
      orden.reason = 'Esto solo funciona dentro de un grupo.'
    }
    if (intencion.needsAdmin) orden.needsAdmin = true
    if (intencion.valor) orden.value = intencion.valor(rawText)
    if (intencion.parse) Object.assign(orden, intencion.parse(match))
    return orden
  }

  /* nada coincide: conversación con la IA */
  return { action: 'charlar', value: rawText, usaApi: true }
}

/**
 * Resuelve a quién va dirigida la acción: mención > citado > número en el texto.
 */
export function resolverObjetivo(m, args = []) {
  const mencion = Array.isArray(m?.mentionedJid) ? m.mentionedJid.filter(Boolean)[0] : null
  if (mencion) return { jid: mencion, origen: 'mención' }

  const citado = m?.quoted?.sender
  if (citado) return { jid: citado, origen: 'mensaje citado' }

  const numero = String(args.join(' ') || '').match(/\d{9,15}/)?.[0]
  if (numero) return { jid: `${numero}@s.whatsapp.net`, origen: `número ${numero}` }

  return null
}

/** bloquea acciones sobre el propio bot, el creador del grupo y el owner del bot */
export function esProtegido(jid, { botJid, ownerGrupo, ownerBot }) {
  if (!jid) return 'No indicaste a quién.'
  if (jid === botJid) return 'No puedo hacerme eso a mí misma.'
  if (ownerGrupo && jid === ownerGrupo) return 'No puedo tocar al creador del grupo.'
  if (ownerBot && jid === ownerBot) return 'No puedo tocar al owner del bot.'
  return null
}

/* ────────────────────────── handler ────────────────────────── */

const handler = async (m, { conn, args, text, isROwner, isOwner, usedPrefix, command, isBotAdmin: isBotAdminCtx }) => {
  // Doble seguro además de handler.rowner
  if (!isROwner && !isOwner) {
    return conn.reply(m.chat, '⛔ Shadowia solo responde a los owners del bot.', m)
  }

  const entrada = (text || '').trim()
  const meta = await conn.groupMetadata(m.chat).catch(() => null)
  const botJid = conn.user?.jid || conn.user?.id
  const ownerGrupo = meta?.owner || (m.isGroup ? `${m.chat.split('-')[0]}@s.whatsapp.net` : null)
  const ownerBot = Array.isArray(global.owner?.[0]) ? `${String(global.owner[0][0]).replace(/\D/g, '')}@s.whatsapp.net` : null

  // Preferimos el isBotAdmin que ya calculó src/handler.js (maneja :device y @lid).
  // Solo si no viene (p. ej. en pruebas) lo calculamos nosotros.
  const botEsAdmin =
    typeof isBotAdminCtx === 'boolean'
      ? isBotAdminCtx
      : esAdminParticipante(buscarParticipante(meta?.participants, botJid))

  const orden = parsearOrden(entrada)

  /* validaciones comunes de grupo/admin */
  if (orden.needsGroup && !m.isGroup) {
    await m.react?.('❕')
    return conn.reply(m.chat, 'ℹ️ Esto solo funciona dentro de un grupo.', m)
  }
  if (orden.needsAdmin && m.isGroup && !botEsAdmin) {
    await m.react?.('❕')
    return conn.reply(m.chat, 'ℹ️ Necesito ser administradora de este grupo para hacer eso.\n\n> Si crees que ya lo soy, revisa en *Info. del grupo → Participantes* que aparezca como admin, y vuelve a intentarlo.', m)
  }

  const avisar = async (texto, opciones) => conn.reply(m.chat, texto, m, opciones)

  try {
    switch (orden.action) {
      /* ── salir del grupo, con mensaje antes ── */
      case 'salir': {
        await avisar('👋 Entendido, jefe. Me despido y salgo del grupo.\nFue un gusto estar aquí. Cuando quieras, vuélveme a agregar.')
        await m.react?.('👋')
        await new Promise((r) => setTimeout(r, 2500)) // deja que el mensaje salga
        await conn.groupLeave(m.chat)
        return
      }

      /* ── devolver el admin a quien se lo quitó ── */
      case 'devolverAdmin': {
        const reg = getMemoria(m.chat)
        const ultimoDemote = [...reg.acciones].reverse().find((a) => a.accion === 'demote')

        if (!ultimoDemote) {
          await m.react?.('🤔')
          return avisar(
            '🤔 No tengo registro de haberle quitado admin a alguien en este grupo.\n\n' +
            '> Puede que el bot se haya reiniciado o que ya pasara media hora.\n' +
            '> Si me dices a quién (mención o respondiendo su mensaje), lo hago de una.',
          )
        }

        const objetivo = resolverObjetivo(m, args)
        const jid = objetivo?.jid || ultimoDemote.jid
        const bloqueo = esProtegido(jid, { botJid, ownerGrupo, ownerBot })
        if (bloqueo) {
          await m.react?.('⚠️')
          return avisar(`⚠️ ${bloqueo}`)
        }

        await m.react?.('🛠️')
        await conn.groupParticipantsUpdate(m.chat, [jid], 'promote')
        registrarAccion(m.chat, 'promote', jid)
        await m.react?.('✅')

        const nota = objetivo ? '' : ` (a quien se lo quité hace ${haceMinutos(ultimoDemote.ts)} min)`
        return avisar(`✅ Le devolví el admin a *@${String(jid).split('@')[0]}*${nota}.\n\n¿Necesitas algo más, jefe?`, { mentions: [jid] })
      }

      /* ── promote / demote / kick ── */
      case 'promote':
      case 'demote':
      case 'kick': {
        const objetivo = resolverObjetivo(m, args)
        const bloqueo = esProtegido(objetivo?.jid, { botJid, ownerGrupo, ownerBot })
        if (bloqueo) {
          await m.react?.('⚠️')
          return avisar(`⚠️ ${bloqueo}\n\n> Menciona a la persona o responde a su mensaje.`)
        }

        const jid = objetivo.jid
        const frases = {
          promote: `Listo, jefe ✨ *@${String(jid).split('@')[0]}* ya es administrador del grupo.\n\n¿Le aviso algo o sigo con otra cosa?`,
          demote: `Listo, jefe. Le quité el admin a *@${String(jid).split('@')[0]}*.\n\nSi fue un error, dime «devuélvele admin» y se lo regreso.`,
          kick: `Listo, jefe. Expulsé a *@${String(jid).split('@')[0]}* del grupo.\n\n¿Quieres que revise algo más?`,
        }
        await m.react?.('🛠️')
        await conn.groupParticipantsUpdate(m.chat, [jid], orden.action === 'kick' ? 'remove' : orden.action)
        registrarAccion(m.chat, orden.action, jid)
        await m.react?.('✅')
        return avisar(frases[orden.action], { mentions: [jid] })
      }

      /* ── agregar ── */
      case 'add': {
        const numero = String(args.join(' ') || '').match(/\d{9,15}/)?.[0]
        if (!numero) {
          await m.react?.('❕')
          return avisar('ℹ️ Con gusto, jefe. Dime el número con código de país. Ejemplo: `agrega 584241234567`')
        }
        await m.react?.('🛠️')
        await conn.groupParticipantsUpdate(m.chat, [`${numero}@s.whatsapp.net`], 'add')
        await m.react?.('✅')
        return avisar(`Listo, jefe ✅ Agregué a *+${numero}* al grupo.\n\n¿Le escribo algo de bienvenida?`)
      }

      /* ── nombre del grupo ── */
      case 'nombre': {
        if (!orden.value) {
          await m.react?.('❕')
          return avisar('ℹ️ Claro, jefe. Dime el nuevo nombre. Ejemplo: `cambia el nombre del grupo a Mi Grupo`')
        }
        await conn.groupUpdateSubject(m.chat, orden.value.slice(0, 100))
        await m.react?.('✅')
        return avisar(`Listo, jefe ✨ El grupo ahora se llama *${orden.value.slice(0, 100)}*.\n\n¿Cambio también la descripción?`)
      }

      /* ── descripción ── */
      case 'descripcion': {
        if (!orden.value) {
          await m.react?.('❕')
          return avisar('ℹ️ Claro, jefe. Dime la nueva descripción. Ejemplo: `cambia la descripción a Grupo oficial`')
        }
        await conn.groupUpdateDescription(m.chat, orden.value)
        await m.react?.('✅')
        return avisar('Listo, jefe ✨ Ya actualicé la descripción del grupo.\n\n¿Reviso algo más?')
      }

      /* ── foto del grupo ── */
      case 'foto': {
        // la imagen puede venir citada O adjunta en el mismo mensaje del comando
        const candidatos = [m.quoted, m].filter(Boolean)
        const fuente = candidatos.find((q) => {
          const mime = q?.msg?.mimetype || q?.mimetype || ''
          return /^image\//.test(mime) || /webp/i.test(mime)
        })
        if (!fuente) {
          await m.react?.('❕')
          return avisar('ℹ️ Claro, jefe. Mándame la imagen junto con el comando, o responde a una imagen y dime `cambia la foto del grupo`.')
        }
        if (typeof fuente.download !== 'function') {
          await m.react?.('⚠️')
          return avisar('⚠️ No puedo descargar esa imagen (puede que haya expirado). Vuelve a enviarla.')
        }
        const img = await fuente.download().catch(() => null)
        if (!img?.length) {
          await m.react?.('⚠️')
          return avisar('⚠️ No pude descargar la imagen.')
        }
        await conn.updateProfilePicture(m.chat, img)
        await m.react?.('✅')
        return avisar('Listo, jefe ✨ Ya cambié la foto del grupo.\n\n¿Te gustó cómo quedó?')
      }

      /* ── abrir / cerrar / anuncios ── */
      case 'abrir':
      case 'cerrar': {
        const valor = orden.action === 'abrir' ? 'not_announcement' : 'announcement'
        await conn.groupSettingUpdate(m.chat, valor)
        await m.react?.('✅')
        return avisar(orden.action === 'abrir' ? 'Listo, jefe 🔓 Abrí el grupo: ya todos pueden escribir.\n\n¿Lo dejo así o lo cierro más tarde?' : 'Listo, jefe 🔒 Cerré el grupo: solo los admins pueden escribir.\n\nCuando quieras lo abro de nuevo.')
      }
      case 'anunciosOn':
      case 'anunciosOff': {
        await conn.groupSettingUpdate(m.chat, orden.action === 'anunciosOn' ? 'announcement' : 'not_announcement')
        await m.react?.('✅')
        return avisar(orden.action === 'anunciosOn' ? 'Listo, jefe 📢 Activé los anuncios del grupo.' : 'Listo, jefe 🔕 Desactivé los anuncios del grupo.')
      }

      /* ── ayuda ── */
      case 'ayuda': {
        await m.react?.('ℹ️')
        return avisar(
          `🤖 *Shadowia* — asistente personal de Yosue (solo owners)\n` +
          `\n*Administración del grupo*\n` +
          `• \`promueve a @usuario\` · \`degrada a @usuario\`\n` +
          `• \`expulsa a @usuario\` · \`agrega 584241234567\`\n` +
          `• \`devuélvele admin\` → se lo regreso a quien se lo quité\n` +
          `• \`cambia el nombre del grupo a ...\`\n` +
          `• \`cambia la descripción a ...\`\n` +
          `• \`cambia la foto del grupo\` (respondiendo a una imagen)\n` +
          `• \`abre el grupo\` · \`cierra el grupo\`\n` +
          `• \`activa los anuncios\` · \`desactiva los anuncios\`\n` +
          `\n*Control del bot*\n` +
          `• \`sal del grupo\` → me despido y salgo\n` +
          `• \`usa <cualquier comando>\` → ejecuto ese plugin por ti\n` +
          `\n*Conversar*\n` +
          `• Cualquier otra cosa y te contesto (modo neutro, misma IA de Simi)`,
        )
      }

      /* ── ejecutar cualquier plugin del bot ── */
      case 'comando': {
        const nombre = String(orden.value || '').toLowerCase()
        if (BLOQUEADOS.has(nombre)) {
          await m.react?.('⛔')
          return avisar(`⛔ El comando \`${nombre}\` está bloqueado para el asistente.`)
        }
        const ejecutado = await ejecutarComando({ m, conn, args, text, usedPrefix, nombre, extra: orden.extra || '', meta, botJid })
        if (!ejecutado) {
          await m.react?.('❔')
          return avisar(`❔ No encontré el comando \`${nombre}\`. Prueba con \`${usedPrefix}${command} ayuda\`.`)
        }
        await m.react?.('✅')
        return
      }

      /* ── conversación con la IA (misma API que Simi) ── */
      case 'charlar':
      default: {
        await conn.sendPresenceUpdate?.('composing', m.chat)

        // contexto corto de la conversación para que Shadowia pueda seguir el hilo
        const reg = getMemoria(m.chat)
        const contexto = reg.conversa.map((c) => `${c.rol === 'user' ? 'Yosue' : 'Shadowia'}: ${c.texto}`).join('\n')
        const bloque = contexto
          ? `\n\nConversación reciente (úsala solo si viene al caso):\n${contexto}\n`
          : '\n'

        const prompt = encodeURIComponent(`${PROMPT_SHADOWIA}${bloque}\nYosue: ${orden.value}\nShadowia:`)

        let data
        try {
          const r = await axios.get(`${API_URL}${prompt}`, {
            timeout: API_TIMEOUT,
            headers: { 'User-Agent': 'Mozilla/5.0' },
          })
          data = r.data
        } catch {
          await conn.sendPresenceUpdate?.('paused', m.chat).catch?.(() => {})
          await m.react?.('⚠️')
          return avisar('⚠️ No pude conectar con la IA (la API suele tardar cuando está fría). ¿Lo intento otra vez?')
        }
        await conn.sendPresenceUpdate?.('paused', m.chat)

        let respuesta = data?.result?.text
        if (!respuesta) {
          await m.react?.('⚠️')
          return avisar('⚠️ La IA no devolvió respuesta. Intenta de nuevo en unos segundos.')
        }
        respuesta = String(respuesta).replace(/\n{3,}/g, '\n\n').replace(/[ \t]{2,}/g, ' ').trim()

        registrarCharla(m.chat, orden.value, respuesta)
        await m.react?.('✅')
        return conn.reply(m.chat, respuesta, m)
      }
    }
  } catch (e) {
    await conn.sendPresenceUpdate?.('paused', m.chat).catch?.(() => {})
    await m.react?.('❌')
    return avisar(`❌ No pude completar la acción.\n\n🪵 ${e?.message || e}`)
  }
}

/**
 * Ejecuta otro plugin del bot en nombre del owner.
 * Devuelve true si encontró y corrió el plugin.
 */
async function ejecutarComando({ m, conn, args, usedPrefix, nombre, extra, meta, botJid }) {
  const plugins = global.plugins || {}
  const claves = Object.keys(plugins)
  const clave = claves.find((k) => {
    const p = plugins[k]
    const cmds = Array.isArray(p?.command) ? p.command : p?.command ? [p.command] : []
    return cmds.some((c) => String(c).toLowerCase() === nombre)
  })
  if (!clave) return false

  const plugin = plugins[clave]
  // igual que src/handler.js: args incluye el nombre del comando como args[0]
  const listaArgs = [nombre, ...(extra ? extra.split(/\s+/).filter(Boolean) : [])]

  await plugin.call(conn, m, {
    match: null,
    usedPrefix,
    noPrefix: false,
    args: listaArgs,
    command: nombre,
    text: extra || '',
    conn,
    participants: meta?.participants || [],
    groupMetadata: meta,
    user: buscarParticipante(meta?.participants, m.sender) || {},
    bot: buscarParticipante(meta?.participants, botJid) || {},
    isROwner: true,
    isOwner: true,
    isMods: true,
    isRAdmin: true,
    isAdmin: true,
    isBotAdmin: esAdminParticipante(buscarParticipante(meta?.participants, botJid)),
    isPrems: true,
    chatUpdate: null,
    __dirname: process.cwd(),
    __filename: `${process.cwd()}/plugins/${clave}`,
    chat: global.db?.data?.chats?.[m.chat] || {},
    settings: global.db?.data?.settings?.[botJid] || {},
  })
  return true
}

handler.help = ['shadowia']
handler.tags = ['ia']
handler.command = ['shadowia', 'asistente', 'ayuda']
handler.rowner = true // solo owners
handler.register = false
handler.limit = false

export default handler
