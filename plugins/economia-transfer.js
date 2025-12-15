async function handler(m, { conn, args, usedPrefix, command, participants }) {
  let who;
  if (m.isGroup) {
    who = m.mentionedJid[0] ? m.mentionedJid[0] : m.quoted ? m.quoted.sender : false;
  } else {
    who = m.chat;
  }

  if (!who) {
    return m.reply(`🎄✨ Etiqueta o responde al mensaje del usuario al que quieras transferir tus *pesos*. UwU`);
  }

  let senderJid = m.sender;
  if (m.sender.endsWith('@lid') && m.isGroup) {
    const pInfo = participants.find(p => p.lid === m.sender);
    if (pInfo && pInfo.id) senderJid = pInfo.id; 
  }

  let targetJid = who;
  if (who.endsWith('@lid') && m.isGroup) {
    const pInfo = participants.find(p => p.lid === who);
    if (pInfo && pInfo.id) targetJid = pInfo.id; 
  }

  const amountText = args.find(arg => !arg.startsWith('@') && isNumber(arg));
  if (!amountText) {
    return m.reply(`🎅 Debes especificar la cantidad de *pesos* que quieres transferir.\n> Ejemplo: ${usedPrefix + command} 1000 @usuario`);
  }

  const count = Math.min(Number.MAX_SAFE_INTEGER, Math.max(1, parseInt(amountText)));

  // Inicializar siempre los campos de cada usuario
  const user = global.db.data.users[senderJid] || {};
  user.coin = user.coin || 0;
  user.bank = user.bank || 0;
  global.db.data.users[senderJid] = user;

  const targetUser = global.db.data.users[targetJid] || {};
  targetUser.coin = targetUser.coin || 0;
  targetUser.bank = targetUser.bank || 0;
  global.db.data.users[targetJid] = targetUser;

  if (user.bank < count) {
    return m.reply(`⚠️ No tienes suficientes *pesos* en tu banco para realizar la transferencia.\n💰 Tu saldo actual: *${user.bank.toLocaleString()} pesos*`);
  }

  if (!(targetJid in global.db.data.users)) {
    return m.reply(`❌ El usuario no se encuentra en mi base de datos.`);
  }

  if (targetJid === senderJid) {
    return m.reply(`❌ No puedes transferirte *pesos* a ti mismo.`);
  }

  user.bank -= count;
  targetUser.coin += count;

  const mentionText = `@${who.split('@')[0]}`;
  m.reply(`
┏━━━━━━━━━━━━━━━━━━━┓
🌑🎄 *S H A D O W - B O T* 🎄🌑
┗━━━━━━━━━━━━━━━━━━━┛

✨ En las sombras de la Navidad,
el poder oculto fluye entre usuarios...

🎁 Has enviado: *${count.toLocaleString()} pesos* a ${mentionText}.
💰 Te quedan: *${user.bank.toLocaleString()} pesos* en tu banco.

🎅 UwU ¡Feliz Navidad desde las sombras! 🎄
`, null, { mentions: [who] });
}

handler.help = ['pay <cantidad> @usuario'];
handler.tags = ['rpg'];
handler.command = ['pay', 'transfer'];
handler.group = true;
handler.register = true;
export default handler;

function isNumber(x) {
  if (typeof x === 'string') { x = x.trim(); }
  return !isNaN(x) && x !== '';
}
