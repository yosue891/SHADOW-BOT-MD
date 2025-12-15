async function handler(m, { conn, args, usedPrefix, command, participants }) {
  if (!global.db.data.chats[m.chat].economy && m.isGroup) {
    return m.reply(`《✦》Los comandos de *Economía* están desactivados en este grupo.\n\nUn *administrador* puede activarlos con el comando:\n» *${usedPrefix}economy on*`)
  }

  let who;
  if (m.isGroup) {
    who = m.mentionedJid[0] ? m.mentionedJid[0] : m.quoted ? m.quoted.sender : false;
  } else {
    who = m.chat;
  }
  if (!who) return m.reply(`🎄✨ Etiqueta o responde al mensaje del usuario al que quieras transferir tus *pesos*. UwU`);

  const amountText = args.find(arg => !arg.startsWith('@') && isNumber(arg));
  if (!amountText) {
    return m.reply(`🎅 Debes especificar la cantidad de *pesos* que quieres transferir.\n> Ejemplo: ${usedPrefix + command} 1000 @usuario`);
  }

  const count = Math.min(Number.MAX_SAFE_INTEGER, Math.max(1, parseInt(amountText)));

  // Inicializar siempre los campos de cada usuario
  const sender = global.db.data.users[m.sender] || {};
  sender.coin = sender.coin || 0;
  sender.bank = sender.bank || 0;
  global.db.data.users[m.sender] = sender;

  const target = global.db.data.users[who] || {};
  target.coin = target.coin || 0;
  target.bank = target.bank || 0;
  global.db.data.users[who] = target;

  if (sender.bank < count) {
    return m.reply(`⚠️ No tienes suficientes *pesos* en tu banco para realizar la transferencia.\n💰 Tu saldo actual: *${sender.bank.toLocaleString()} pesos*`);
  }
  if (who === m.sender) return m.reply(`❌ No puedes transferirte *pesos* a ti mismo.`);

  sender.bank -= count;
  target.coin += count;

  const mentionText = `@${who.split('@')[0]}`;
  m.reply(`
┏━━━━━━━━━━━━━━━━━━━┓
🌑🎄 *S H A D O W - B O T* 🎄🌑
┗━━━━━━━━━━━━━━━━━━━┛

✨ En las sombras de la Navidad,
el poder oculto fluye entre usuarios...

🎁 Has enviado: *${count.toLocaleString()} pesos* a ${mentionText}.
💰 Te quedan: *${sender.bank.toLocaleString()} pesos* en tu banco.

🎅 UwU ¡Feliz Navidad desde las sombras! 🎄
`, null, { mentions: [who] });
}

handler.help = ['pay <cantidad> @usuario'];
handler.tags = ['economia'];
handler.command = ['pay', 'transfer'];
handler.group = true;
handler.register = true;
export default handler;

function isNumber(x) {
  if (typeof x === 'string') x = x.trim();
  return !isNaN(x) && x !== '';
}
