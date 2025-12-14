import { promises as _0x1dc39e } from 'fs';
async function loadCharacters() {
  const _0x38aab7 = await _0x1dc39e.readFile("./lib/characters.json", "utf-8");
  return JSON.parse(_0x38aab7);
}
function flattenCharacters(_0x1c2607) {
  return Object.values(_0x1c2607).flatMap(_0x3bd33b => Array.isArray(_0x3bd33b.characters) ? _0x3bd33b.characters : []);
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
  if (!Array.isArray(_0x4e26d7.characters)) {
    _0x4e26d7.characters = [];
  }
  if (_0x4e26d7.robCooldown == null) {
    _0x4e26d7.robCooldown = 0x0;
  }
  if (!_0x4e26d7.robVictims) {
    _0x4e26d7.robVictims = {};
  }
  const _0x5598f4 = Date.now();
  const _0x5de98f = _0x4e26d7.robCooldown + 28800000;
  if (_0x4e26d7.robCooldown > 0x0 && _0x5598f4 < _0x5de98f) {
    const _0x5780c4 = Math.ceil((_0x5de98f - _0x5598f4) / 0x3e8);
    const _0x559a44 = Math.floor(_0x5780c4 / 0xe10);
    const _0xf7af84 = Math.floor(_0x5780c4 % 0xe10 / 0x3c);
    const _0x29f88f = _0x5780c4 % 0x3c;
    let _0x1a967f = '';
    if (_0x559a44 > 0x0) {
      _0x1a967f += _0x559a44 + " hora" + (_0x559a44 !== 0x1 ? 's' : '') + " ";
    }
    if (_0xf7af84 > 0x0) {
      _0x1a967f += _0xf7af84 + " minuto" + (_0xf7af84 !== 0x1 ? 's' : '') + " ";
    }
    if (_0x29f88f > 0x0 || _0x1a967f === '') {
      _0x1a967f += _0x29f88f + " segundo" + (_0x29f88f !== 0x1 ? 's' : '');
    }
    return _0x1bbca4.reply("ꕥ Debes esperar *" + _0x1a967f.trim() + "* para usar *" + (_0x12da1c + _0x1b00d4) + "* de nuevo.");
  }
  const _0x185e35 = await _0x1bbca4.mentionedJid;
  const _0x229f68 = _0x185e35[0x0] || _0x1bbca4.quoted && (await _0x1bbca4.quoted.sender);
  if (!_0x229f68 || typeof _0x229f68 !== 'string' || !_0x229f68.includes('@')) {
    return _0x1bbca4.reply("❀ Por favor, cita o menciona al usuario a quien quieras robarle una waifu.");
  }
  if (_0x229f68 === _0x1bbca4.sender) {
    let _0x369e5b = await (async () => _0x4e26d7.name?.["trim"]() || (await _0x46cdbb.getName(_0x1bbca4.sender).then(_0x28b527 => typeof _0x28b527 === 'string' && _0x28b527.trim() ? _0x28b527 : _0x1bbca4.sender.split('@')[0x0])["catch"](() => _0x1bbca4.sender.split('@')[0x0])))();
    return _0x1bbca4.reply("ꕥ No puedes robarte a ti mismo, *" + _0x369e5b + '*.');
  }
  const _0x20a0b2 = _0x4e26d7.robVictims[_0x229f68];
  if (_0x20a0b2 && _0x5598f4 - _0x20a0b2 < 86400000) {
    let _0x326a9f = await (async () => global.db.data.users[_0x229f68]?.["name"]?.["trim"]() || (await _0x46cdbb.getName(_0x229f68).then(_0x16077f => typeof _0x16077f === "string" && _0x16077f.trim() ? _0x16077f : _0x229f68.split('@')[0x0])["catch"](() => _0x229f68.split('@')[0x0])))();
    return _0x1bbca4.reply("ꕥ Ya robaste a *" + _0x326a9f + "* hoy. Solo puedes robarle a alguien *una vez cada 24 horas*.");
  }
  const _0x5b490f = global.db.data.users[_0x229f68];
  if (!_0x5b490f || !Array.isArray(_0x5b490f.characters) || _0x5b490f.characters.length === 0x0) {
    let _0x3fb838 = await (async () => global.db.data.users[_0x229f68]?.["name"]?.['trim']() || (await _0x46cdbb.getName(_0x229f68).then(_0x52645e => typeof _0x52645e === 'string' && _0x52645e.trim() ? _0x52645e : _0x229f68.split('@')[0x0])["catch"](() => _0x229f68.split('@')[0x0])))();
    return _0x1bbca4.reply("ꕥ *" + _0x3fb838 + "* no tiene waifus que puedas robar.");
  }
  const _0x173c4f = Math.random() < 0.9;
  _0x4e26d7.robCooldown = _0x5598f4;
  _0x4e26d7.robVictims[_0x229f68] = _0x5598f4;
  if (!_0x173c4f) {
    let _0x60fa15 = await (async () => global.db.data.users[_0x229f68]?.['name']?.["trim"]() || (await _0x46cdbb.getName(_0x229f68).then(_0x3267c5 => typeof _0x3267c5 === 'string' && _0x3267c5.trim() ? _0x3267c5 : _0x229f68.split('@')[0x0])["catch"](() => _0x229f68.split('@')[0x0])))();
    return _0x1bbca4.reply("ꕥ El intento de robo ha fallado. *" + _0x60fa15 + "* defendió a su waifu heroicamente.");
  }
  const _0x4a1ef6 = _0x5b490f.characters[Math.floor(Math.random() * _0x5b490f.characters.length)];
  const _0x29c4c3 = global.db.data.characters?.[_0x4a1ef6] || {};
  const _0x41a3e2 = typeof _0x29c4c3.name === 'string' ? _0x29c4c3.name : "ID:" + _0x4a1ef6;
  _0x29c4c3.user = _0x1bbca4.sender;
  _0x5b490f.characters = _0x5b490f.characters.filter
_0x4e26d7.characters.includes(_0x4a1ef6)) {
    _0x4e26d7.characters.push(_0x4a1ef6);
  }
  if (_0x4e26d7.sales?.[_0x4a1ef6]?.['user'] === _0x229f68) {
    delete _0x4e26d7.sales[_0x4a1ef6];
  }
  if (_0x5b490f.favorite === _0x4a1ef6) {
    delete _0x5b490f.favorite;
  }
  if (global.db.data.users[_0x229f68]?.["favorite"] === _0x4a1ef6) {
    delete global.db.data.users[_0x229f68].favorite;
  }
  let _0xe835a = await (async () => _0x4e26d7.name?.["trim"]() || (await _0x46cdbb.getName(_0x1bbca4.sender).then(_0x3dfe2a => typeof _0x3dfe2a === 'string' && _0x3dfe2a.trim() ? _0x3dfe2a : _0x1bbca4.sender.split('@')[0x0])["catch"](() => _0x1bbca4.sender.split('@')[0x0])))();
  let _0x5510aa = await (async () => global.db.data.users[_0x229f68]?.['name']?.['trim']() || (await _0x46cdbb.getName(_0x229f68).then(_0xb9576b => typeof _0xb9576b === 'string' && _0xb9576b.trim() ? _0xb9576b : _0x229f68.split('@')[0x0])["catch"](() => _0x229f68.split('@')[0x0])))();
  await _0x1bbca4.reply("❀ *" + _0xe835a + "* ha robado a *" + _0x41a3e2 + "* del harem de *" + _0x5510aa + '*.');
};
handler.help = ["robwaifu"];
handler.tags = ["gacha"];
handler.command = ["robwaifu", 'robarwaifu'];
handler.group = true;
export default handler;
