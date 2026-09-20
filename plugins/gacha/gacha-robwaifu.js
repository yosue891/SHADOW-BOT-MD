import { promises as _0x1dc39e } from 'fs';
async function loadCharacters() {
  const _0x38aab7 = await _0x1dc39e.readFile("./lib/characters.json", "utf-8");
  return JSON.parse(_0x38aab7);
}
function flattenCharacters(_0x30b912) {
  return Object.values(_0x30b912).flatMap(_0x15c00d => Array.isArray(_0x15c00d.characters) ? _0x15c00d.characters : []);
}

let handler = async (_0x1bbca4, {
  conn: _0x46cdbb,
  usedPrefix: _0x12da1c,
  command: _0x1b00d4
}) => {
  if (!global.db.data.chats?.[_0x1bbca4.chat]?.["gacha"] && _0x1bbca4.isGroup) {
    return _0x1bbca4.reply("ꕥ Los comandos de *Gacha* están desactivados en este grupo.\n\nUn *administrador* puede activarlos con el comando:\n» *" + _0x12da1c + "gacha on*");
  }

  const _0x4e26d7 = global.db.data.users[_0x1bbca4.sender];
  if (!Array.isArray(_0x4e26d7.characters)) _0x4e26d7.characters = [];
  if (_0x4e26d7.robCooldown == null) _0x4e26d7.robCooldown = 0;
  if (!_0x4e26d7.robVictims) _0x4e26d7.robVictims = {};

  const now = Date.now();
  const cooldownLimit = _0x4e26d7.robCooldown + 28800000;
  if (_0x4e26d7.robCooldown > 0 && now < cooldownLimit) {
    const remaining = Math.ceil((cooldownLimit - now) / 1000);
    const h = Math.floor(remaining / 3600);
    const m = Math.floor((remaining % 3600) / 60);
    const s = remaining % 60;
    let time = '';
    if (h) time += `${h} hora${h !== 1 ? 's' : ''} `;
    if (m) time += `${m} minuto${m !== 1 ? 's' : ''} `;
    if (s || time === '') time += `${s} segundo${s !== 1 ? 's' : ''}`;
    return _0x1bbca4.reply(`ꕥ Debes esperar *${time.trim()}* para usar *${_0x12da1c + _0x1b00d4}* de nuevo.`);
  }

  const mentioned = await _0x1bbca4.mentionedJid;
  const target = mentioned?.[0] || (_0x1bbca4.quoted && await _0x1bbca4.quoted.sender);
  if (!target || typeof target !== 'string' || !target.includes('@')) {
    return _0x1bbca4.reply("❀ Por favor, cita o menciona al usuario a quien quieras robarle una waifu.");
  }

  if (target === _0x1bbca4.sender) {
    const name = _0x4e26d7.name?.trim() || await _0x46cdbb.getName(_0x1bbca4.sender).catch(() => _0x1bbca4.sender.split('@')[0]);
    return _0x1bbca4.reply(`ꕥ No puedes robarte a ti mismo, *${name}*.`);
  }

  const lastRob = _0x4e26d7.robVictims[target];
  if (lastRob && now - lastRob < 86400000) {
    const name = global.db.data.users[target]?.name?.trim() || await _0x46cdbb.getName(target).catch(() => target.split('@')[0]);
    return _0x1bbca4.reply(`ꕥ Ya robaste a *${name}* hoy. Solo puedes robarle a alguien *una vez cada 24 horas*.`);
  }

  const targetUser = global.db.data.users[target];
  if (!targetUser || !Array.isArray(targetUser.characters) || targetUser.characters.length === 0) {
    const name = targetUser?.name?.trim() || await _0x46cdbb.getName(target).catch(() => target.split('@')[0]);
    return _0x1bbca4.reply(`ꕥ *${name}* no tiene waifus que puedas robar.`);
  }

  const success = Math.random() < 0.9;
  _0x4e26d7.robCooldown = now;
  _0x4e26d7.robVictims[target] = now;

  if (!success) {
    const name = targetUser?.name?.trim() || await _0x46cdbb.getName(target).catch(() => target.split('@')[0]);
    return _0x1bbca4.reply(`ꕥ El intento de robo ha fallado. *${name}* defendió a su waifu heroicamente.`);
  }

  const stolenId = targetUser.characters[Math.floor(Math.random() * targetUser.characters.length)];
  const charData = global.db.data.characters?.[stolenId] || {};
  const charName = typeof charData.name === 'string' ? charData.name : `ID:${stolenId}`;
  charData.user = _0x1bbca4.sender;

  targetUser.characters = targetUser.characters.filter(id => id !== stolenId);
  if (!_0x4e26d7.characters.includes(stolenId)) {
    _0x4e26d7.characters.push(stolenId);
  }

  if (_0x4e26d7.sales?.[stolenId]?.user === target) {
    delete _0x4e26d7.sales[stolenId];
  }
  if (targetUser.favorite === stolenId) {
    delete targetUser.favorite;
  }
  if (global.db.data.users[target]?.favorite === stolenId) {
    delete global.db.data.users[target].favorite;
  }

  const thiefName = _0x4e26d7.name?.trim() || await _0x46cdbb.getName(_0x1bbca4.sender).catch(() => _0x1bbca4.sender.split('@')[0]);
  const victimName = targetUser?.name?.trim() || await _0x46cdbb.getName(target).catch(() => target.split('@')[0]);

  await _0x1bbca4.reply(`❀ *${thiefName}* ha robado a *${charName}* del harem de *${victimName}*.`);
};

handler.help = ["robwaifu"];
handler.tags = ["gacha"];
handler.command = ["robwaifu", "robarwaifu"];
handler.group = true;
export default handler;
