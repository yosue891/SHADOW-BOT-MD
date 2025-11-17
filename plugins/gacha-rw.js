import _0x1756dd from 'node-fetch';
import { promises as _0xd02b6a } from 'fs';
async function loadCharacters() {
  try {
    await _0xd02b6a.access("./lib/characters.json");
  } catch {
    await _0xd02b6a.writeFile("./lib/characters.json", '{}');
  }
  const _0xc71a3e = await _0xd02b6a.readFile("./lib/characters.json", 'utf-8');
  return JSON.parse(_0xc71a3e);
}
function flattenCharacters(_0x111976) {
  return Object.values(_0x111976).flatMap(_0x1c4553 => Array.isArray(_0x1c4553.characters) ? _0x1c4553.characters : []);
}
function getSeriesNameByCharacter(_0x4f8e7d, _0x23f241) {
  return Object.entries(_0x4f8e7d).find(([, _0x49760b]) => Array.isArray(_0x49760b.characters) && _0x49760b.characters.some(_0x42118b => String(_0x42118b.id) === String(_0x23f241)))?.[0x1]?.["name"] || 'Desconocido';
}
function formatTag(_0x2d21e6) {
  return String(_0x2d21e6).trim().toLowerCase().replace(/\s+/g, '_');
}
async function buscarImagenDelirius(_0x15c321) {
  const _0x2a4325 = String(_0x15c321).trim().toLowerCase().replace(/\s+/g, '_');
  const _0x141c97 = ['https://safebooru.org/index.php?page=dapi&s=post&q=index&json=1&tags=' + _0x2a4325, "https://danbooru.donmai.us/posts.json?tags=" + _0x2a4325, global.APIs.delirius.url + "/search/gelbooru?query=" + _0x2a4325];
  for (const _0x50fc69 of _0x141c97) {
    try {
      const _0x437bb5 = await _0x1756dd(_0x50fc69, {
        'headers': {
          'User-Agent': "Mozilla/5.0",
          'Accept': "application/json"
        }
      });
      const _0x5da82b = _0x437bb5.headers.get("content-type") || '';
      if (!_0x437bb5.ok || !_0x5da82b.includes("json")) {
        continue;
      }
      const _0x2170b9 = await _0x437bb5.json();
      const _0x94dd79 = Array.isArray(_0x2170b9) ? _0x2170b9 : _0x2170b9?.["post"] || _0x2170b9?.["data"] || [];
      const _0x2623a8 = _0x94dd79.map(_0x43dfa7 => _0x43dfa7?.["file_url"] || _0x43dfa7?.["large_file_url"] || _0x43dfa7?.["image"] || _0x43dfa7?.["media_asset"]?.["variants"]?.[0x0]?.["url"]).filter(_0x2c4ece => typeof _0x2c4ece === "string" && /\.(jpe?g|png)$/.test(_0x2c4ece));
      if (_0x2623a8.length) {
        return _0x2623a8;
      }
    } catch {}
  }
  return [];
}
const verifi = async () => {
  try {
    const _0x2f140c = await _0xd02b6a.readFile("./package.json", "utf-8");
    const _0x4ba22e = JSON.parse(_0x2f140c);
    return _0x4ba22e.repository?.['url'] === "git+https://github.com/meado-learner/SHADOW-BOT-MD.git";
  } catch {
    return false;
  }
};
const handler = async (_0x52e8ea, {
  conn: _0x52624e,
  usedPrefix: _0x28c296,
  command: _0x37efe9
}) => {
  if (!(await verifi())) {
    return _0x52624e.reply(_0x52e8ea.chat, "❀ El comando *<" + _0x37efe9 + ">* solo está disponible para Michi", _0x52e8ea);
  }
  const _0x24a0ee = global.db.data.chats;
  if (!_0x24a0ee[_0x52e8ea.chat]) {
    _0x24a0ee[_0x52e8ea.chat] = {};
  }
  const _0x1455b9 = _0x24a0ee[_0x52e8ea.chat];
  if (!_0x1455b9.characters) {
    _0x1455b9.characters = {};
  }
  if (!_0x1455b9.gacha && _0x52e8ea.isGroup) {
    return _0x52e8ea.reply("ꕥ Los comandos de *Gacha* están desactivados en este grupo.\n\nUn *administrador* puede activarlos con el comando:\n» *" + _0x28c296 + "gacha on*");
  }
  const _0x258d6a = global.db.data.users[_0x52e8ea.sender];
  const _0x5f5a92 = Date.now();
  if (_0x258d6a.lastRoll && _0x5f5a92 < _0x258d6a.lastRoll) {
    const _0x5e244b = Math.ceil((_0x258d6a.lastRoll - _0x5f5a92) / 0x3e8);
    const _0xa625cb = Math.floor(_0x5e244b / 0x3c);
    const _0x2bcabe = _0x5e244b % 0x3c;
    let _0x250486 = '';
    if (_0xa625cb > 0x0) {
      _0x250486 += _0xa625cb + " minuto" + (_0xa625cb !== 0x1 ? 's' : '') + " ";
    }
    if (_0x2bcabe > 0x0 || _0x250486 === '') {
      _0x250486 += _0x2bcabe + " segundo" + (_0x2bcabe !== 0x1 ? 's' : '');
    }
    return _0x52e8ea.reply("ꕥ Debes esperar *" + _0x250486.trim() + "* para usar *" + (_0x28c296 + _0x37efe9) + "* de nuevo.");
  }
  try {
    const _0x575937 = await loadCharacters();
    const _0x87f143 = flattenCharacters(_0x575937);
    const _0x1bbcdf = _0x87f143[Math.floor(Math.random() * _0x87f143.length)];
    const _0x58e804 = String(_0x1bbcdf.id);
    const _0x17c098 = getSeriesNameByCharacter(_0x575937, _0x1bbcdf.id);
    const _0x1100a8 = String(_0x1bbcdf.tags?.[0x0] || '').trim().toLowerCase().replace(/\s+/g, '_');
    const _0x10818e = await buscarImagenDelirius(_0x1100a8);
    const _0x53c4e2 = _0x10818e[Math.floor(Math.random() * _0x10818e.length)];
    if (!_0x53c4e2) {
      return _0x52e8ea.reply("ꕥ No se encontró imágenes para el personaje *" + _0x1bbcdf.name + '*.');
    }
    if (!global.db.data.characters) {
      global.db.data.characters = {};
    }
    if (!global.db.data.characters[_0x58e804]) {
      global.db.data.characters[_0x58e804] = {};
    }
    const _0x52604a = global.db.data.characters[_0x58e804];
    const _0x92c74a = global.db.data.characters?.[_0x58e804] || {};
    _0x52604a.name = String(_0x1bbcdf.name || "Sin nombre");
    _0x52604a.value = typeof _0x92c74a.value === "number" ? _0x92c74a.value : Number(_0x1bbcdf.value) || 0x64;
    _0x52604a.votes = Number(_0x52604a.votes || _0x92c74a.votes || 0x0);
    _0x52604a.reservedBy = _0x52e8ea.sender;
    _0x52604a.reservedUntil = _0x5f5a92 + 0x4e20;
    _0x52604a.expiresAt = _0x5f5a92 + 0xea60;
    let _0x3491a7 = await (async () => typeof _0x52604a.user === "string" && _0x52604a.user.trim() ? global.db.data.users[_0x52604a.user]?.["name"]?.["trim"]() || (await _0x52624e.getName(_0x52604a.user).then(_0x52bee7 => typeof _0x52bee7 === 'string' && _0x52bee7.trim() ? _0x52bee7 : _0x52604a.user.split('@')[0x0])["catch"](() => _0x52604a.user.split('@')[0x0])) : 'desconocido')();
    const _0x4281e8 = "❀ Nombre » *" + _0x52604a.name + "*\n⚥ Género » *" + (_0x1bbcdf.gender || 'Desconocido') + "*\n✰ Valor » *" + _0x52604a.value.toLocaleString() + "*\n♡ Estado » *" + (_0x52604a.user ? "Reclamado por " + _0x3491a7 : "Libre") + "*\n❖ Fuente » *" + _0x17c098 + '*';
    const _0x310243 = await _0x52624e.sendFile(_0x52e8ea.chat, _0x53c4e2, _0x52604a.name + ".jpg", _0x4281e8, _0x52e8ea);
    _0x1455b9.lastRolledId = _0x58e804;
    _0x1455b9.lastRolledMsgId = _0x310243.key?.['id'] || null;
    _0x1455b9.lastRolledCharacter = {
      'id': _0x58e804,
      'name': _0x52604a.name,
      'media': _0x53c4e2
    };
    _0x258d6a.lastRoll = _0x5f5a92 + 900000;
  } catch (_0x3a0e46) {
    await _0x52624e.reply(_0x52e8ea.chat, "⚠︎ Se ha producido un problema.\n> Usa " + _0x28c296 + "report para informarlo.\n\n" + _0x3a0e46.message, _0x52e8ea);
  }
};
handler.help = ['rw', "rollwaifu"];
handler.tags = ['gacha'];
handler.command = ["rollwaifu", 'rw', "roll"];
handler.group = true;
export default handler;
