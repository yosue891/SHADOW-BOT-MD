import axios from 'axios'
import {
  proto,
  generateWAMessageFromContent,
  generateWAMessageContent
} from '@whiskeysockets/baileys'

const handler = async (m, { conn, text, command, usedPrefix }) => {
  if (!global.db.data) global.db.data = {}
  if (!global.db.data.users) global.db.data.users = {}
  if (!global.db.data.users[m.sender]) global.db.data.users[m.sender] = {}
  if (!global.db.data.users[m.sender].esclavos) global.db.data.users[m.sender].esclavos = []

  if (command === 'esclavizar') {
    let who
    if (m.isGroup) {
      who = m.mentionedJid[0] ? m.mentionedJid[0] : m.quoted ? m.quoted.sender : false
    } else {
      who = m.chat
    }

    if (!who) {
      return conn.reply(m.chat, `✐ Etiqueta a alguien o responde a su mensaje para esclavizarlo.`, m)
    }

    let amo = m.sender
    let misEsclavos = global.db.data.users[amo].esclavos

    if (misEsclavos.includes(who)) {
      return conn.reply(m.chat, `⚠︎ ¡Este usuario ya es tu esclavo! No puedes volver a esclavizarlo.`, m)
    }

    if (misEsclavos.length >= 3) {
      return conn.reply(m.chat, `☠︎ Ya tienes el límite máximo de 3 esclavos. ¡Libera a alguno primero con *${usedPrefix}liberar*!`, m)
    }

    if (m.react) await m.react('⛓️')

    const msg = generateWAMessageFromContent(
      m.chat,
      {
        viewOnceMessage: {
          message: {
            messageContextInfo: {
              deviceListMetadata: {},
              deviceListMetadataVersion: 2
            },
            interactiveMessage: proto.Message.InteractiveMessage.fromObject({
              body: {
                text: `jajajaja este wey te dejaste esclavizar que pendejo pero bueno aquí tienes 3 opciones elije sabíamente u.u\n\n Elige tu destino antes de que sea tarde...`
              },
              footer: {
                text: 'Shadow Juego - Sistema de Esclavitud'
              },
              header: {
                hasMediaAttachment: false
              },
              nativeFlowMessage: {
                buttons: [
                  {
                    name: 'quick_reply',
                    buttonParamsJson: JSON.stringify({
                      display_text: '🏃 Correr',
                      id: `${usedPrefix}esclavo_opcion correr|${who}|${amo}`
                    })
                  },
                  {
                    name: 'quick_reply',
                    buttonParamsJson: JSON.stringify({
                      display_text: '💀 Matarse',
                      id: `${usedPrefix}esclavo_opcion matarse|${who}|${amo}`
                    })
                  },
                  {
                    name: 'quick_reply',
                    buttonParamsJson: JSON.stringify({
                      display_text: '🧎 Aceptar destino',
                      id: `${usedPrefix}esclavo_opcion aceptar|${who}|${amo}`
                    })
                  }
                ]
              }
            })
          }
        }
      },
      { quoted: m }
    )

    return await conn.relayMessage(m.chat, msg.message, { messageId: msg.key.id })
  }

  if (command === 'esclavo_opcion') {
    if (!text) return
    let [accion, esclavoJid, amoJid] = text.split('|')
    let nombreAmo = await conn.getName(amoJid)

    if (!global.db.data.users[amoJid]) global.db.data.users[amoJid] = {}
    if (!global.db.data.users[amoJid].esclavos) global.db.data.users[amoJid].esclavos = []

    if (accion === 'correr') {
      return conn.reply(m.chat, `@${esclavoJid.split('@')[0]} corrió lo más rápido para no ser esclavizado (pero muere por pendejo que se cree xd)`, m, { mentions: [esclavoJid] })
    }

    if (accion === 'matarse') {
      return conn.reply(m.chat, `De verdad se mató que gey XD`, m)
    }

    if (accion === 'aceptar') {
      let actuales = global.db.data.users[amoJid].esclavos
      
      if (actuales.includes(esclavoJid)) {
        return conn.reply(m.chat, `Ya aceptaste tu destino anteriormente, ya eres su esclavo.`, m)
      }

      if (actuales.length >= 3) {
        return conn.reply(m.chat, `El amo ya alcanzó el límite máximo de 3 esclavos mientras decidías.`, m)
      }

      global.db.data.users[amoJid].esclavos.push(esclavoJid)
      return conn.reply(m.chat, `bueno @${esclavoJid.split('@')[0]} te quedaste como esclavo de ${nombreAmo} bueno ya que ahora te morirás de hambre xd`, m, { mentions: [esclavoJid, amoJid] })
    }
  }

  if (command === 'esclavos') {
    let amo = m.sender
    let misEsclavos = global.db.data.users[amo].esclavos

    if (!misEsclavos || misEsclavos.length === 0) {
      return conn.reply(m.chat, `⛓️ No tienes a nadie esclavizado actualmente. ¡Sal a buscar víctimas!`, m)
    }

    let texto = `⛓️ *Tus Esclavos Actuales (${misEsclavos.length}/3):*\n\n`
    for (let i = 0; i < misEsclavos.length; i++) {
      texto += `${i + 1}. @${misEsclavos[i].split('@')[0]}\n`
    }
    texto += `\n> Puedes liberar a cualquiera usando *${usedPrefix}liberar*`

    return conn.reply(m.chat, texto, m, { mentions: misEsclavos })
  }

  if (command === 'liberar') {
    let who = m.mentionedJid[0] ? m.mentionedJid[0] : m.quoted ? m.quoted.sender : false
    if (!who) {
      return conn.reply(m.chat, `✐ Etiqueta o responde al esclavo que deseas liberar.`, m)
    }

    let amo = m.sender
    let misEsclavos = global.db.data.users[amo].esclavos

    if (!misEsclavos || !misEsclavos.includes(who)) {
      return conn.reply(m.chat, `⚠︎ Esa persona no es esclavo tuyo.`, m)
    }

    const msg = generateWAMessageFromContent(
      m.chat,
      {
        viewOnceMessage: {
          message: {
            messageContextInfo: {
              deviceListMetadata: {},
              deviceListMetadataVersion: 2
            },
            interactiveMessage: proto.Message.InteractiveMessage.fromObject({
              body: {
                text: `¿quieres liberaelo de verdad?\n\nConfirma tu acción en los botones de abajo:`
              },
              header: {
                hasMediaAttachment: false
              },
              nativeFlowMessage: {
                buttons: [
                  {
                    name: 'quick_reply',
                    buttonParamsJson: JSON.stringify({
                      display_text: '✅ Sí',
                      id: `${usedPrefix}liberar_confirm si|${who}|${amo}`
                    })
                  },
                  {
                    name: 'quick_reply',
                    buttonParamsJson: JSON.stringify({
                      display_text: '❌ No',
                      id: `${usedPrefix}liberar_confirm no|${who}|${amo}`
                    })
                  }
                ]
              }
            })
          }
        }
      },
      { quoted: m }
    )

    return await conn.relayMessage(m.chat, msg.message, { messageId: msg.key.id })
  }

  if (command === 'liberar_confirm') {
    if (!text) return
    let [decision, esclavoJid, amoJid] = text.split('|')

    if (decision === 'si') {
      if (global.db.data.users[amoJid] && global.db.data.users[amoJid].esclavos) {
        global.db.data.users[amoJid].esclavos = global.db.data.users[amoJid].esclavos.filter(id => id !== esclavoJid)
      }
      if (m.react) await m.react('🕊️')
      return conn.reply(m.chat, `bueno te han liberado eres libre cuidate y que te atropelle un tren digo te quiero cuidate uwu`, m, { mentions: [esclavoJid] })
    }

    if (decision === 'no') {
      return conn.reply(m.chat, `Operación cancelada. Se queda bajo tu yugo.`, m)
    }
  }
}

handler.help = ['esclavizar', 'liberar', 'esclavos']
handler.tags = ['juegos']
handler.command = ['esclavizar', 'esclavo_opcion', 'liberar', 'liberar_confirm', 'esclavos']
handler.group = true

export default handler
