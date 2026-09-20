const linkRegex = /(chat\.whatsapp\.com\/[0-9A-Za-z]{20,24})|(z?https:\/\/whatsapp\.com\/channel\/[0-9A-Za-z]{20,24})/i
const allowedLinks = ['https://whatsapp.com/channel/0029Vb64nWqLo4hb8cuxe23n']
const delay = ms => new Promise(resolve => setTimeout(resolve, ms))

export async function before(m, { conn, isAdmin, isBotAdmin, isMods, isROwner, participants }) {
  if (!m.isGroup) return
  if (!m || !m.text) return
  const chat = global?.db?.data?.chats[m.chat]
  const isGroupLink = linkRegex.test(m.text)
  const isChannelLink = /whatsapp\.com\/channel\//i.test(m.text)
  const hasAllowedLink = allowedLinks.some(link => m.text.includes(link))
  if (hasAllowedLink) return
  if ((isGroupLink || isChannelLink) && !isAdmin) {
    if (isBotAdmin) {
      const linkThisGroup = `https://chat.whatsapp.com/${await conn.groupInviteCode(m.chat)}`
      if (isGroupLink && m.text.includes(linkThisGroup)) return !0
    }
    if (chat.antilink && isGroupLink && !isAdmin && isBotAdmin && !isMods && m.key.participant !== conn.user.jid) {
      const randomDelay = 1000 + Math.floor(Math.random() * 3000)
      await delay(randomDelay)
      await conn.sendMessage(m.chat, { delete: { remoteJid: m.chat, fromMe: false, id: m.key.id, participant: m.key.participant }})
      await delay(2000 + Math.floor(Math.random() * 2000))
      await conn.groupParticipantsUpdate(m.chat, [m.key.participant], 'remove')
    }
  }
    }
