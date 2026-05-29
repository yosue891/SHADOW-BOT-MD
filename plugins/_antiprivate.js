export async function before(m, { conn, isOwner, isROwner }) {
  if (m.isBaileys && m.fromMe) return true;
  if (m.isGroup) return false;
  if (!m.message) return true;

  const bot = global.db.data.settings[conn.user.jid] || {};

  const palabrasClave = ['PIEDRA', 'PAPEL', 'TIJERA', 'serbot', 'jadibot'];
  if (palabrasClave.some(p => m.text?.toUpperCase().includes(p))) return true;

  if (m.chat === '120363416409380841@newsletter') return true;

  const creador = '+5804242773183';
  if (m.sender.includes(creador.replace('+', ''))) return true;

  if (bot.antiPrivate && !isOwner && !isROwner) {
    await conn.updateBlockStatus(m.sender, 'block');
    return true;
  }

  return true;
}
