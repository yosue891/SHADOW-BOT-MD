import { promises as _0x5059c8 } from 'fs';
async function loadCharacters() {
  const _0x3e1623 = await _0x5059c8.readFile("./lib/characters.json", "utf-8");
  return JSON.parse(_0x3e1623);
}
function flattenCharacters(_0x69d770) {
  return Object.values(_0x69d770).flatMap(_0x24074a => Array.isArray(_0x24074a.characters) ? _0x24074a.characters : []);
}

let handler = async (_0x29a52a, {
  conn: _0x5236b1,
  args: _0xcd3487,
  usedPrefix: _0x4f501f
}) => {
  if (!global.db.data.chats?.[_0x29a52a.chat]?.["gacha"] && _0x29a52a.isGroup) {
    return _0x29a52a.reply("ꕥ Los comandos de *Gacha* están desactivados en este grupo.\n\nUn *administrador* puede activarlos con el comando:\n» *" + _0x4f501f + "gacha on*");
  }
  if (!global.db.data.characters) {
    global.db.data.characters = {};
  }
  try {
    const _0x598ad7 = await loadCharacters();
    const _0x5144cc = flattenCharacters(_0x598ad7);
    const _0x4069be = _0x5144cc.map(_0x11c4b1 => {
      const _0x1af46a = global.db.data.characters[_0x11c4b1.id] || {};
      const _0x25becd = typeof _0x1af46a.value === "number" ? _0x1af46a.value : Number(_0x11c4b1.value || 0x0);
      return {
        'name': _0x11c4b1.name,
        'value': _0x25becd
      };
    });
    const _0xff799 = parseInt(_0xcd3487[0x0]) || 0x1;
    const _0x277a96 = Math.ceil(_0x4069be.length / 0xa);
    if (_0xff799 < 0x1 || _0xff799 > _0x277a96) {
      return _0x29a52a.reply("ꕥ Página no válida. Hay un total de *" + _0x277a96 + "* páginas.");
    }
    const _0x330cdb = _0x4069be.sort((_0x5a9de2, _0x328b56) => _0x328b56.value - _0x5a9de2.value);
    const _0xb60c55 = _0x330cdb.slice((_0xff799 - 0x1) * 0xa, _0xff799 * 0xa);
    let _0x57bf80 = "❀ *Personajes con más valor:*\n\n";
    _0xb60c55.forEach((_0x1a40ae, _0xc38fd0) => {
      _0x57bf80 += "✰ " + ((_0xff799 - 0x1) * 0xa + _0xc38fd0 + 0x1) + " » *" + _0x1a40ae.name + "*\n";
      _0x57bf80 += "   → Valor: *" + _0x1a40ae.value.toLocaleString() + "*\n";
    });
    _0x57bf80 += "\n⌦ Página *" + _0xff799 + "* de *" + _0x277a96 + '*';
    await _0x5236b1.reply(_0x29a52a.chat, _0x57bf80.trim(), _0x29a52a);
  } catch (_0x513641) {
    await _0x5236b1.reply(_0x29a52a.chat, "⚠︎ Se ha producido un problema.\n> Usa " + _0x4f501f + "report para informarlo.\n\n" + _0x513641.message, _0x29a52a);
  }
};
handler.help = ["topwaifus"];
handler.tags = ["gacha"];
handler.command = ["waifusboard", "waifustop", 'topwaifus', "wtop"];
handler.group = true;
export default handler;
