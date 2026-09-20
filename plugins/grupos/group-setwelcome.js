const handler = async (m, { conn, text, command, usedPrefix, isAdmin, isOwner, chat: handlerChat }) => {
  try {
    // ===== VALIDACIÓN PREVIA =====
    if (!m.isGroup) {
      return await m.reply(`❌ *Este comando solo funciona en grupos.*\n\nUsa este comando dentro del grupo donde quieres personalizar el mensaje.`)
    }

    // Aunque handler.group y handler.admin ya validan, reforzamos para mensajes claros
    const isGroupAdmin = isAdmin || isOwner
    if (!isGroupAdmin) {
      return await m.reply(`❌ *Solo administradores* pueden configurar la bienvenida/despedida.\n\n> Tip: Pide a un admin que ejecute: *${usedPrefix}${command} <texto>*`)
    }

    // ===== INICIALIZACIÓN DB - GARANTIZAR AISLAMIENTO POR GRUPO =====
    // Asegurar que global.db y su estructura existan
    if (!global.db) {
      return await m.reply(`❌ Error interno: base de datos no inicializada. Intenta de nuevo en unos segundos.`)
    }
    if (global.db.data == null) {
      try { await global.loadDatabase() } catch {}
    }
    if (!global.db.data) global.db.data = {}
    if (!global.db.data.chats || typeof global.db.data.chats !== 'object') {
      global.db.data.chats = {}
    }

    const groupId = m.chat // ID único del grupo -> clave para aislamiento por grupo
    // Obtener el chat del grupo. Prioridad: handlerChat (pasado por src/handler.js) -> global.db.data.chats[groupId]
    // Si no existe, inicializarlo con los defaults del bot (no pisar otros grupos)
    let chat = handlerChat && typeof handlerChat === 'object' ? handlerChat : global.db.data.chats[groupId]

    if (!chat || typeof chat !== 'object') {
      chat = {}
    }

    // Si aún no está registrado en DB, registrarlo (solo este grupo)
    if (!global.db.data.chats[groupId] || typeof global.db.data.chats[groupId] !== 'object') {
      global.db.data.chats[groupId] = chat
    } else {
      // Sincronizar referencia (importante: chat debe ser la misma referencia que está en DB)
      // Si handlerChat era referencia distinta, unificar
      if (global.db.data.chats[groupId] !== chat) {
        // Copiar props de handlerChat a la referencia de DB si es necesario
        Object.assign(global.db.data.chats[groupId], chat)
        chat = global.db.data.chats[groupId]
      }
    }

    // Asegurar defaults sin borrar personalizaciones existentes
    if (typeof chat.welcome === 'undefined') chat.welcome = true
    if (typeof chat.sWelcome === 'undefined') chat.sWelcome = ''
    if (typeof chat.sBienvenida === 'undefined') chat.sBienvenida = ''
    if (typeof chat.sBye === 'undefined') chat.sBye = ''
    if (typeof chat.sGoodbye === 'undefined') chat.sGoodbye = ''
    if (typeof chat.sDespedida === 'undefined') chat.sDespedida = ''

    // Helpers
    const getGroupName = async () => {
      try {
        if (m.isGroup) {
          const meta = await conn.groupMetadata(groupId).catch(() => null)
          return meta?.subject || 'este grupo'
        }
      } catch {}
      return 'este grupo'
    }

    const saveDB = async () => {
      // Guardado robusto: intenta todos los métodos disponibles
      // 1) lowdb Low.write() (src/index.js usa Low + JSONFile)
      // 2) Database.save() (lib/database.js)
      // 3) fallback interval del bot (30s) pero forzamos aquí
      let saved = false
      let lastError = null
      try {
        if (global.db?.write && typeof global.db.write === 'function') {
          await global.db.write()
          saved = true
        }
      } catch (e) { lastError = e }
      try {
        if (!saved && typeof global.db?.save === 'function') {
          // lib/database.js usa save() encolado
          const r = global.db.save()
          if (r instanceof Promise) await r
          // Para Database class, esperar un poco a que _save se ejecute
          await new Promise(res => setTimeout(res, 800))
          saved = true
        }
      } catch (e) { lastError = e }

      // Verificación: leer de nuevo y comprobar que el valor quedó en memoria
      // (Si write falló silenciosamente, al menos queda en memoria hasta el próximo intervalo)
      if (!saved && lastError) console.error('[setwelcome] Error guardando DB:', lastError)
      return saved
    }

    // Obtener texto real: `text` viene de handler (args.join), pero para soportar multilínea
    // también intentamos extraer del mensaje original después del comando
    let rawText = (typeof text === 'string' ? text : '')
    // Fallback: extraer directamente de m.text para preservar saltos de línea si `text` vino vacío por algún motivo
    if (!rawText || !rawText.trim()) {
      try {
        const prefix = usedPrefix || ''
        const cmdLen = (prefix + command).length
        const full = (m.text || '').trim()
        // Quitar prefijo+comando del inicio
        if (full.toLowerCase().startsWith((prefix + command).toLowerCase())) {
          rawText = full.slice(cmdLen).trim()
        }
      } catch {}
    }
    const cleanText = (rawText || '').trim()

    // Obtener nombre del grupo para mensajes
    const groupName = await getGroupName()

    switch (command) {
      case 'setwelcome':
      case 'setbienvenida': {
        if (!cleanText) {
          const actual = chat.sWelcome || chat.sBienvenida || 'Por defecto (¡Bienvenido/a a las sombras! Que tu estancia sea legendaria.)'
          return await m.reply(
            `⚔️ *Configuración de Bienvenida — ${groupName}* ⚔️\n\n` +
            `• *Grupo:* ${groupId}\n` +
            `• *Mensaje actual (solo este grupo):*\n> ${actual}\n\n` +
            `Escribe el nuevo mensaje de *bienvenida* para *este grupo únicamente*.\n\n` +
            `*Variables disponibles:*\n` +
            `• *{usuario}* ➜ Menciona al nuevo usuario\n` +
            `• *{grupo}* ➜ Nombre del grupo\n` +
            `• *{desc}* ➜ Descripción del grupo\n` +
            `• *{miembros}* ➜ Cantidad de miembros\n` +
            `• *{fecha}* ➜ Fecha actual\n\n` +
            `*Ejemplo:*\n` +
            `> ${usedPrefix + command} ¡Bienvenido {usuario} a {grupo}! 🎉 Somos {miembros} miembros.\n\n` +
            `📌 _Este mensaje solo se guardará en *${groupName}* y no afectará a otros grupos._`
          )
        }

        if (cleanText.length > 1000) {
          return await m.reply(`❌ El mensaje es demasiado largo (máx. 1000 caracteres). Actualmente: ${cleanText.length}`)
        }

        // Guardar SOLO en este grupo (aislamiento por groupId)
        const newMsg = cleanText
        chat.sWelcome = newMsg
        chat.sBienvenida = newMsg
        // Asegurar que la bienvenida esté activada en este grupo
        chat.welcome = true
        // Re-asignar referencia en DB (por si era copia)
        global.db.data.chats[groupId] = chat

        const saved = await saveDB()

        // Verificación post-guardado
        const verify = global.db.data.chats[groupId]?.sWelcome
        if (verify !== newMsg) {
          console.warn('[setwelcome] Verificación falló, reintentando asignar...')
          global.db.data.chats[groupId].sWelcome = newMsg
          global.db.data.chats[groupId].sBienvenida = newMsg
          await saveDB().catch(() => {})
        }

        await m.reply(
          `✅ *Mensaje de bienvenida establecido con éxito*\n\n` +
          `• *Grupo:* *${groupName}*\n` +
          `• *ID:* \`${groupId}\`\n` +
          `• *Nuevo mensaje (solo este grupo):*\n> ${newMsg}\n\n` +
          `🔒 _Guardado exclusivamente en este grupo. Otros grupos mantienen su propio mensaje._\n\n` +
          `🧪 Prueba con: *${usedPrefix}welcome*  o  *${usedPrefix}bienvenida*`
        )
        break
      }

      case 'setgoodbye':
      case 'setbye':
      case 'setdespedida': {
        if (!cleanText) {
          const actual = chat.sBye || chat.sGoodbye || chat.sDespedida || 'Por defecto (Ha abandonado la orden. Que las sombras guíen su nuevo camino.)'
          return await m.reply(
            `⚔️ *Configuración de Despedida — ${groupName}* ⚔️\n\n` +
            `• *Grupo:* ${groupId}\n` +
            `• *Mensaje actual (solo este grupo):*\n> ${actual}\n\n` +
            `Escribe el nuevo mensaje de *despedida* para *este grupo únicamente*.\n\n` +
            `*Variables disponibles:*\n` +
            `• *{usuario}* ➜ Nombre/mención del usuario\n` +
            `• *{grupo}* ➜ Nombre del grupo\n` +
            `• *{desc}* ➜ Descripción del grupo\n` +
            `• *{miembros}* ➜ Cantidad de miembros restantes\n` +
            `• *{fecha}* ➜ Fecha actual\n\n` +
            `*Ejemplo:*\n` +
            `> ${usedPrefix + command} Adiós {usuario}, que la sombra te acompañe. Quedan {miembros} miembros.\n\n` +
            `📌 _Este mensaje solo se guardará en *${groupName}* y no afectará a otros grupos._`
          )
        }

        if (cleanText.length > 1000) {
          return await m.reply(`❌ El mensaje es demasiado largo (máx. 1000 caracteres). Actualmente: ${cleanText.length}`)
        }

        const newMsg = cleanText
        chat.sBye = newMsg
        chat.sGoodbye = newMsg
        chat.sDespedida = newMsg
        chat.welcome = true // también activa despedida (usa mismo flag)
        global.db.data.chats[groupId] = chat

        const saved = await saveDB()
        const verify = global.db.data.chats[groupId]?.sBye
        if (verify !== newMsg) {
          console.warn('[setgoodbye] Verificación falló, reintentando...')
          global.db.data.chats[groupId].sBye = newMsg
          global.db.data.chats[groupId].sGoodbye = newMsg
          global.db.data.chats[groupId].sDespedida = newMsg
          await saveDB().catch(() => {})
        }

        await m.reply(
          `✅ *Mensaje de despedida establecido con éxito*\n\n` +
          `• *Grupo:* *${groupName}*\n` +
          `• *ID:* \`${groupId}\`\n` +
          `• *Nuevo mensaje (solo este grupo):*\n> ${newMsg}\n\n` +
          `🔒 _Guardado exclusivamente en este grupo. Otros grupos mantienen su propio mensaje._\n\n` +
          `🧪 Prueba con: *${usedPrefix}goodbye*  o  *${usedPrefix}bye*`
        )
        break
      }

      case 'delwelcome':
      case 'resetwelcome': {
        chat.sWelcome = ''
        chat.sBienvenida = ''
        global.db.data.chats[groupId] = chat
        await saveDB()
        await m.reply(`🗑️ *Mensaje de bienvenida restablecido* en *${groupName}*.\n\nAhora se usará el mensaje por defecto.\n> _Solo este grupo fue afectado._`)
        break
      }

      case 'delgoodbye':
      case 'delbye':
      case 'resetgoodbye':
      case 'resetbye': {
        chat.sBye = ''
        chat.sGoodbye = ''
        chat.sDespedida = ''
        global.db.data.chats[groupId] = chat
        await saveDB()
        await m.reply(`🗑️ *Mensaje de despedida restablecido* en *${groupName}*.\n\nAhora se usará el mensaje por defecto.\n> _Solo este grupo fue afectado._`)
        break
      }

      default:
        return await m.reply(`❌ Comando no reconocido: ${command}`)
    }
  } catch (e) {
    console.error('[group-setwelcome] Error:', e)
    try { await m.reply(`❌ Error al configurar: ${e?.message || e}`) } catch {}
  }
}

handler.help = ['setwelcome <texto>', 'setbienvenida <texto>', 'setgoodbye <texto>', 'setbye <texto>', 'setdespedida <texto>', 'delwelcome', 'delgoodbye']
handler.tags = ['grupos']
handler.command = [
  'setwelcome', 'setbienvenida',
  'setgoodbye', 'setbye', 'setdespedida',
  'delwelcome', 'delgoodbye', 'delbye',
  'resetwelcome', 'resetgoodbye', 'resetbye'
]
handler.group = true
handler.admin = true
handler.botAdmin = false

export default handler
