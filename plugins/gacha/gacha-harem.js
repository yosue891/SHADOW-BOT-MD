import { promises as _0x41e875 } from 'fs';
async function loadCharacters() {
  const _0x484d66 = await _0x41e875.readFile('./lib/characters.json', "utf-8");
  return JSON.parse(_0x484d66);
}
function flattenCharacters(_0x30b912) {
  return Object.values(_0x30b912).flatMap(_0x15c00d => Array.isArray(_0x15c00d.characters) ? _0x15c00d.characters : []);
}

let handler = async (_0x3d2e06, {
  conn: _0xcf6e26,
  args: _0x95f554,
  usedPrefix: _0x5d18d8
}) => {
  if (!global.db.data.chats?.[_0x3d2e06.chat]?.["gacha"] && _0x3d2e06.isGroup) {
    return _0x3d2e06.reply("ꕥ Los comandos de *Gacha* están desactivados en este grupo.\n\nUn *administrador* puede activarlos con el comando:\n» *" + _0x5d18d8 + "gacha on*");
  }
  try {
    if (!global.db.data.users) {
      global.db.data.users = {};
    }
    if (!global.db.data.characters) {
      global.db.data.characters = {};
    }
    let _0xd85d28 = await _0x3d2e06.mentionedJid;
    let _0x41a036 = _0xd85d28 && _0xd85d28.length ? _0xd85d28[0x0] : _0x3d2e06.quoted && (await _0x3d2e06.quoted.sender) ? await _0x3d2e06.quoted.sender : _0x3d2e06.sender;
    let _0x594499 = await (async () => global.db.data.users[_0x41a036]?.['name']?.['trim']() || (await _0xcf6e26.getName(_0x41a036).then(_0x570a5 => typeof _0x570a5 === "string" && _0x570a5.trim() ? _0x570a5 : _0x41a036.split('@')[0x0])["catch"](() => _0x41a036.split('@')[0x0])))();
    const _0x2f5e54 = await loadCharacters();
    const _0x65dde0 = flattenCharacters(_0x2f5e54);
    const _0x55783c = Object.entries(global.db.data.characters).filter(([, _0x17d1f3]) => (_0x17d1f3.user || '').replace(/[^0-9]/g, '') === _0x41a036.replace(/[^0-9]/g, '')).map(([_0x294d0c]) => _0x294d0c);
    if (_0x55783c.length === 0x0) {
      const _0xad579c = _0x41a036 === _0x3d2e06.sender ? "ꕥ No tienes personajes reclamados." : "ꕥ *" + _0x594499 + "* no tiene personajes reclamados.";
      return _0xcf6e26.reply(_0x3d2e06.chat, _0xad579c, _0x3d2e06, {
        'mentions': [_0x41a036]
      });
    }
    _0x55783c.sort((_0x1b5561, _0x4519aa) => {
      const _0x5aa01d = global.db.data.characters[_0x1b5561] || {};
      const _0x3b9cce = global.db.data.characters[_0x4519aa] || {};
      const _0xd0ef14 = _0x65dde0.find(_0x530fb3 => _0x530fb3.id === _0x1b5561);
      const _0x5e53cf = _0x65dde0.find(_0x3a04c5 => _0x3a04c5.id === _0x4519aa);
      const _0x3c86d9 = typeof _0x5aa01d.value === "number" ? _0x5aa01d.value : Number(_0xd0ef14?.["value"] || 0x0);
      const _0x911891 = typeof _0x3b9cce.value === "number" ? _0x3b9cce.value : Number(_0x5e53cf?.["value"] || 0x0);
      return _0x911891 - _0x3c86d9;
    });
    const _0x515552 = parseInt(_0x95f554[0x1]) || 0x1;
    const _0x52506e = Math.ceil(_0x55783c.length / 0x32);
    if (_0x515552 < 0x1 || _0x515552 > _0x52506e) {
      return _0xcf6e26.reply(_0x3d2e06.chat, "❀ Página no válida. Hay un total de *" + _0x52506e + "* páginas.", _0x3d2e06);
    }
    const _0xeff6c7 = (_0x515552 - 0x1) * 0x32;
    const _0x140d59 = Math.min(_0xeff6c7 + 0x32, _0x55783c.length);
    let _0xffd830 = "✿ Personajes reclamados ✿\n";
    _0xffd830 += "⌦ Usuario: *" + _0x594499 + "*\n";
    _0xffd830 += "♡ Personajes: *(" + _0x55783c.length + ")*\n\n";
    for (let _0x54dbe6 = _0xeff6c7; _0x54dbe6 < _0x140d59; _0x54dbe6++) {
      const _0x701778 = _0x55783c[_0x54dbe6];
      const _0x481a06 = global.db.data.characters[_0x701778] || {};
      const _0x74318a = _0x65dde0.find(_0x11c954 => _0x11c954.id === _0x701778);
      const _0x2c4789 = _0x74318a?.["name"] || _0x481a06.name || "ID:" + _0x701778;
      const _0x22866f = typeof _0x481a06.value === "number" ? _0x481a06.value : Number(_0x74318a?.["value"] || 0x0);
      _0xffd830 += "» *" + _0x2c4789 + "* (*" + _0x22866f.toLocaleString() + "*)\n";
    }
    _0xffd830 += "\n⌦ _Página *" + _0x515552 + "* de *" + _0x52506e + '*_';
    await _0xcf6e26.reply(_0x3d2e06.chat, _0xffd830.trim(), _0x3d2e06, {
      'mentions': [_0x41a036]
    });
  } catch (_0x2190c6) {
    await _0xcf6e26.reply(_0x3d2e06.chat, "⚠︎ Se ha producido un problema.\n> Usa *" + _0x5d18d8 + "report* para informarlo.\n\n" + _0x2190c6.message, _0x3d2e06);
  }
};
handler.help = ["harem"];
handler.tags = ['gacha'];
handler.command = ["harem", "waifus", 'claims'];
handler.group = true;
export default handler;
