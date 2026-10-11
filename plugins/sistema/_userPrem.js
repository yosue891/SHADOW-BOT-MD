let nextCheck = 0
export async function all() {
  const now = Date.now()
  if (now < nextCheck) return
  nextCheck = now + 60000
  for (const [jid, user] of Object.entries(global.db.data.users)) {
    if (!user.premium || !(user.premiumTime > 0) || now < user.premiumTime) continue
    user.premiumTime = 0
    user.premium = false
    const number = jid.split('@')[0]
    await this.sendMessage(jid, { text: `✐ @${number} Se agotó tu tiempo como usuario premium`, mentions: [jid] }).catch(console.error)
  }
}
