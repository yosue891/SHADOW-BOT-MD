export async function before(m, { conn, isAdmin, isMods, isROwner }) {
  if (!m.isGroup) return
  if (!m || !m.text) return

  const chat = global.db.data.chats[m.chat] || {}

  if (chat.modoadmin) {
    if (!isAdmin && !isMods && !isROwner) {
      return true
    }
  }
  return false
}

export async function modoadmin(m, { args }) {
  const chat = global.db.data.chats[m.chat] || {}
  if (!args[0]) return

  if (args[0].toLowerCase() === "on") {
    chat.modoadmin = true
    global.db.data.chats[m.chat] = chat
  }

  if (args[0].toLowerCase() === "off") {
    chat.modoadmin = false
    global.db.data.chats[m.chat] = chat
  }
}
