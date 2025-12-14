import { promises as _0x174608 } from 'fs';
async function loadCharacters() {
  const _0x475aad = await _0x174608.readFile("./lib/characters.json", 'utf-8');
  return JSON.parse(_0x475aad);
}

const handler = async (_0x3efd03, {
  conn: _0x1a915e,
  args: _0x2e3e3a,
  usedPrefix: _0x2ce678,
  command: _0x3972c5
}) => {
  try {
    if (!global.db.data.chats?.[_0x3efd03.chat]?.["gacha"] && _0x3efd03.isGroup) {
      return _0x3efd03.reply("ꕥ Los comandos de *Gacha* están desactivados en este grupo.\n\nUn *administrador* puede activarlos con el comando:\n» *" + _0x2ce678 + "gacha on*");
    }
    const _0x2ea2ad = await loadCharacters();
    switch (_0x3972c5) {
      case "serielist":
      case "slist":
      case "animelist":
        {
          const _0x2684b9 = Object.keys(_0x2ea2ad);
          const _0x45a91a = _0x2684b9.length;
          const _0x2eecea = parseInt(_0x2e3e3a[0x0]) || 0x1;
          const _0x93cd8c = Math.max(0x1, Math.ceil(_0x45a91a / 0x14));
          if (_0x2eecea < 0x1 || _0x2eecea > _0x93cd8c) {
            return _0x3efd03.reply("ꕥ Página no válida. Hay un total de *" + _0x93cd8c + "* páginas.");
          }
          const _0x4c77fc = (_0x2eecea - 0x1) * 0x14;
          const _0x55c52f = Math.min(_0x4c77fc + 0x14, _0x45a91a);
          const _0x317c1e = _0x2684b9.slice(_0x4c77fc, _0x55c52f);
          let _0x1998ea = "*❏ Lista de series (" + _0x45a91a + "):*\n\n";
          for (const _0x5a05f0 of _0x317c1e) {
            const _0x205a5f = _0x2ea2ad[_0x5a05f0];
            const _0xd84e05 = typeof _0x205a5f.name === "string" ? _0x205a5f.name : _0x5a05f0;
            const _0x5054c2 = Array.isArray(_0x205a5f.characters) ? _0x205a5f.characters.length : 0x0;
            _0x1998ea += "» *" + _0xd84e05 + "* (" + _0x5054c2 + ") *ID* (" + _0x5a05f0 + ")\n";
          }
          _0x1998ea += "\n> • _Página " + _0x2eecea + '/' + _0x93cd8c + '_';
          await _0x3efd03.reply(_0x1998ea.trim());
          break;
        }
      case "serieinfo":
      case "ainfo":
      case "animeinfo":
        {
          if (!_0x2e3e3a.length) {
            return _0x3efd03.reply("❀ Debes especificar el nombre de un anime\n> Ejemplo » " + (_0x2ce678 + _0x3972c5) + " Naruto");
          }
          const _0x25c916 = _0x2e3e3a.join(" ").toLowerCase().trim();
          const _0x5c369c = Object.entries(_0x2ea2ad);
          const _0x46d32d = _0x5c369c.find(([, _0xe5550d]) =>
            (typeof _0xe5550d.name === "string" && _0xe5550d.name.toLowerCase().includes(_0x25c916)) ||
            (Array.isArray(_0xe5550d.tags) && _0xe5550d.tags.some(_0x1658c2 => _0x1658c2.toLowerCase().includes(_0x25c916)))
          ) || _0x5c369c.filter(([, _0x27f53d]) =>
            (typeof _0x27f53d.name === "string" && _0x25c916.split(" ").some(_0x5a1771 => _0x27f53d.name.toLowerCase().includes(_0x5a1771))) ||
            (Array.isArray(_0x27f53d.tags) && _0x27f53d.tags.some(_0x2bb71e => _0x25c916.split(" ").some(_0x202b3e => _0x2bb71e.toLowerCase().includes(_0x202b3e))))
          )[0x0] || [];
          const [_0x5299d2, _0x21b110] = _0x46d32d;
          if (!_0x5299d2 || !_0x21b110) {
            return _0x3efd03.reply("ꕥ No se encontró la serie *" + _0x25c916 + "*\n> Puedes sugerirlo usando el comando *" + _0x2ce678 + "suggest sugerencia de serie: " + _0x25c916 + '*');
          }
          let _0x23a41e = Array.isArray(_0x21b110.characters) ? _0x21b110.characters : [];
          const _0x261a87 = _0x23a41e.length;
          const _0x164034 = _0x23a41e.filter(_0xd4f65a =>
            Object.values(global.db.data.users).some(_0x4f0e2a =>
              Array.isArray(_0x4f0e2a.characters) && _0x4f0e2a.characters.includes(_0xd4f65a.id)
            )
          );
 la serie *" + _0x25c916 + "*\n> Puedes sugerirlo usando el comando *" + _0x2ce678 + "suggest sugerencia de serie: " + _0x25c916 + '*');
          }
          let _0x23a41e = Array.isArray(_0x21b110.characters) ? _0x21b110.characters : [];
          const _0x261a87 = _0x23a41e.length;
          const _0x164034 = _0x23a41e.filter(_0xd4f65a =>
            Object.values(global.db.data.users).some(_0x4f0e2a =>
              Array.isArray(_0x4f0e2a.characters) && _0x4f0e2a.characters.includes(_0xd4f65a.id)
            )
          );
          _0x23a41e.sort((_0x585056, _0x49ae43) => {
            const _0x299319 = global.db.data.characters?.[_0x585056.id] || {};
            const _0x58cec2 = global.db.data.characters?.[_0x49ae43.id] || {};
            const _0x515fc5 = typeof _0x299319.value === 'number' ? _0x299319.value : Number(_0x585056.value || 0x0);
             const _0xb27ee = typeof _0x58cec2.value === 'number' ? _0x58cec2.value : Number(_0x49ae43.value || 0x0);
            return _0xb27ee - _0x515fc5;
          });
          let _0x2b72c5 = "*❀ Fuente: `<" + (_0x21b110.name || _0x5299d2) + ">`*\n\n";
          _0x2b72c5 += "❏ Personajes » *`" + _0x261a87 + "`*\n";
          _0x2b72c5 += "♡ Reclamados » *`" + _0x164034.length + '/' + _0x261a87 + " (" + (_0x164034.length / _0x261a87 * 0x64).toFixed(0x0) + "%)`*\n";
          _0x2b72c5 += "❏ Lista de personajes:\n\n";
          for (const _0x32a452 of _0x23a41e) {
            const _0x1306ee = global.db.data.characters?.[_0x32a452.id] || {};
            const _0x5ccef9 = typeof _0x1306ee.value === "number" ? _0x1306ee.value : Number(_0x32a452.value || 0x0);
            const _0x20cdb2 = Object.entries(global.db.data.users).find(([, _0x225c89]) =>
              Array.isArray(_0x225c89.characters) && _0x225c89.characters.includes(_0x32a452.id)
            );
            let _0x2c4d39 = await (async () =>
              _0x20cdb2?.[0x0]
                ? global.db.data.users[_0x20cdb2[0x0]]?.["name"]?.["trim"]() ||
                  (await _0x1a915e.getName(_0x20cdb2[0x0]))?.["trim"]() ||
                  _0x20cdb2[0x0].split('@')[0x0]
                : 'desconocido'
            )();
            const _0x4f01c5 = _0x20cdb2 ? "Reclamado por *" + _0x2c4d39 + '*' : "Libre";
            _0x2b72c5 += "» *" + _0x32a452.name + "* (" + _0x5ccef9.toLocaleString() + ") • " + _0x4f01c5 + ".\n";
          }
          _0x2b72c5 += "\n> ⌦ _Página *1* de *1*_";
          await _0x1a915e.reply(_0x3efd03.chat, _0x2b72c5.trim(), _0x3efd03);
          break;
        }
    }
  } catch (_0x1c0f4b) {
    await _0x1a915e.reply(_0x3efd03.chat, "⚠︎ Se ha producido un problema.\n> Usa *" + _0x2ce678 + "report* para informarlo.\n\n" + _0x1c0f4b.message, _0x3efd03);
  }
};
handler.help = ['serieinfo'];
handler.tags = ["gacha"];
handler.command = ["serielist", "slist", 'animelist', "serieinfo", "ainfo", "animeinfo"];
handler.group = true;
export default handler;
