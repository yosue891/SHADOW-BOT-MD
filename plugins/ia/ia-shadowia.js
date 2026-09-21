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

const PROMPT_SHADOWIA = `Eres Shadowia, la asistente personal de Yosue, el dueño del bot.

Modo neutro:
- Eres clara, educada, directa y útil. Tono profesional y amable.
- NO uses sarcasmo, NO uses ironía, NO insultes, NO hagas bromas pesadas.
- No uses apodos despectivos ni palabras ofensivas hacia nadie.
- Responde en español, de forma breve y natural para WhatsApp (evita listas enormes).
- No uses asteriscos ni guiones bajos para dar formato.
- No inventes datos; si no sabes algo, dilo con honestidad.
- No repitas tu nombre en cada respuesta ni menciones números de teléfono.
- Si te piden hacer algo en el grupo, confirma en una línea qué hiciste o qué falta.

Ahora responde lo siguiente`

/* Comandos que el asistente NO ejecuta aunque el owner se lo pida,
   para no dejar el bot inutilizable desde el chat. */
const BLOQUEADOS = new Set(['delplugin', 'saveplugin', 'eval', 'exec', 'restart', 'fix', 'dsowner'])

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
        await avisar('👋 Shadowia se retira. Fue un gusto estar aquí.\nSi me necesitan, el owner puede volver a agregarme.')
        await m.react?.('👋')
        await new Promise((r) => setTimeout(r, 2500)) // deja que el mensaje salga
        await conn.groupLeave(m.chat)
        return
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
        const etiquetas = {
          promote: { verbo: 'promovido a administrador', sufijo: '' },
          demote: { verbo: 'degradado', sufijo: ' (ya no es admin)' },
          kick: { verbo: 'expulsado', sufijo: ' del grupo' },
        }
        const et = etiquetas[orden.action]
        await m.react?.('🛠️')
        await conn.groupParticipantsUpdate(m.chat, [jid], orden.action === 'kick' ? 'remove' : orden.action)
        await m.react?.('✅')
        return avisar(`✅ Listo: *@${String(jid).split('@')[0]}* fue ${et.verbo}${et.sufijo}.`, { mentions: [jid] })
      }

      /* ── agregar ── */
      case 'add': {
        const numero = String(args.join(' ') || '').match(/\d{9,15}/)?.[0]
        if (!numero) {
          await m.react?.('❕')
          return avisar('ℹ️ Dime el número con código de país. Ejemplo: `agrega 584241234567`')
        }
        await m.react?.('🛠️')
        await conn.groupParticipantsUpdate(m.chat, [`${numero}@s.whatsapp.net`], 'add')
        await m.react?.('✅')
        return avisar(`✅ Listo: agregué a *+${numero}* al grupo.`)
      }

      /* ── nombre del grupo ── */
      case 'nombre': {
        if (!orden.value) {
          await m.react?.('❕')
          return avisar('ℹ️ Dime el nuevo nombre. Ejemplo: `cambia el nombre del grupo a Mi Grupo`')
        }
        await conn.groupUpdateSubject(m.chat, orden.value.slice(0, 100))
        await m.react?.('✅')
        return avisar(`✅ Nombre del grupo actualizado a *${orden.value.slice(0, 100)}*.`)
      }

      /* ── descripción ── */
      case 'descripcion': {
        if (!orden.value) {
          await m.react?.('❕')
          return avisar('ℹ️ Dime la nueva descripción. Ejemplo: `cambia la descripción a Grupo oficial`')
        }
        await conn.groupUpdateDescription(m.chat, orden.value)
        await m.react?.('✅')
        return avisar('✅ Descripción del grupo actualizada.')
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
          return avisar('ℹ️ Mándame la imagen junto con el comando, o responde a una imagen y dime `cambia la foto del grupo`.')
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
        return avisar('✅ Foto del grupo actualizada.')
      }

      /* ── abrir / cerrar / anuncios ── */
      case 'abrir':
      case 'cerrar': {
        const valor = orden.action === 'abrir' ? 'not_announcement' : 'announcement'
        await conn.groupSettingUpdate(m.chat, valor)
        await m.react?.('✅')
        return avisar(orden.action === 'abrir' ? '✅ Grupo abierto: todos pueden escribir.' : '✅ Grupo cerrado: solo admins escriben.')
      }
      case 'anunciosOn':
      case 'anunciosOff': {
        await conn.groupSettingUpdate(m.chat, orden.action === 'anunciosOn' ? 'announcement' : 'not_announcement')
        await m.react?.('✅')
        return avisar(orden.action === 'anunciosOn' ? '✅ Anuncios activados.' : '✅ Anuncios desactivados.')
      }

      /* ── ayuda ── */
      case 'ayuda': {
        await m.react?.('ℹ️')
        return avisar(
          `🤖 *Shadowia* — asistente personal de Yosue (solo owners)\n` +
          `\n*Administración del grupo*\n` +
          `• \`promueve a @usuario\` · \`degrada a @usuario\`\n` +
          `• \`expulsa a @usuario\` · \`agrega 584241234567\`\n` +
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
        const prompt = encodeURIComponent(`${PROMPT_SHADOWIA}\nUsuario: ${orden.value}\nShadowia:`)
        const { data } = await axios.get(`${API_URL}${prompt}`, {
          timeout: API_TIMEOUT,
          headers: { 'User-Agent': 'Mozilla/5.0' },
        })
        await conn.sendPresenceUpdate?.('paused', m.chat)

        let respuesta = data?.result?.text
        if (!respuesta) {
          await m.react?.('⚠️')
          return avisar('⚠️ La IA no devolvió respuesta. Intenta de nuevo en unos segundos.')
        }
        respuesta = String(respuesta).replace(/\n{3,}/g, '\n\n').replace(/[ \t]{2,}/g, ' ').trim()
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
