import { promises as _0x2c0dd7 } from 'fs';
import _0x5e341b from 'node-fetch';
async function loadCharacters() {
  const _0x1e47c9 = await _0x2c0dd7.readFile("./lib/characters.json", "utf-8");
  return JSON.parse(_0x1e47c9);
}
function flattenCharacters(_0x43b58c) {
  return Object.values(_0x43b58c).flatMap(_0x36082b => Array.isArray(_0x36082b.characters) ? _0x36082b.characters : []);
}
function getSeriesNameByCharacter(_0x24a216, _0x177dcc) {
  const _0x248807 = Object.entries(_0x24a216).find(([, _0x150ca8]) => Array.isArray(_0x150ca8.characters) && _0x150ca8.characters.some(_0x1720bc => _0x1720bc.id === _0x177dcc));
  return _0x248807?.[0x1]?.["name"] || "Desconocido";
}
function formatElapsed(_0x344df2) {
  if (!_0x344df2 || _0x344df2 <= 0x0) {
    return '—';
  }
  const _0x2dfb38 = Math.floor(_0x344df2 / 0x3e8);
  const _0x5c600e = Math.floor(_0x2dfb38 / 0x93a80);
  const _0x1c69bc = Math.floor(_0x2dfb38 % 0x93a80 / 0x15180);
  const _0x1e3db1 = Math.floor(_0x2dfb38 % 0x15180 / 0xe10);
  const _0x4d84ac = Math.floor(_0x2dfb38 % 0xe10 / 0x3c);
  const _0x24a213 = _0x2dfb38 % 0x3c;
  const _0x1b1e24 = [];
  if (_0x5c600e > 0x0) {
    _0x1b1e24.push(_0x5c600e + 'w');
  }
  if (_0x1c69bc > 0x0) {
    _0x1b1e24.push(_0x1c69bc + 'd');
  }
  if (_0x1e3db1 > 0x0) {
    _0x1b1e24.push(_0x1e3db1 + 'h');
  }
  if (_0x4d84ac > 0x0) {
    _0x1b1e24.push(_0x4d84ac + 'm');
  }
  if (_0x24a213 > 0x0) {
    _0x1b1e24.push(_0x24a213 + 's');
  }
  return _0x1b1e24.join(" ");
}
function formatTag(_0x2da0e9) {
  return String(_0x2da0e9).trim().toLowerCase().replace(/\s+/g, '_');
}
async function buscarImagenDelirius(_0x239c2e) {
  const _0x40e02d = String(_0x239c2e).trim().toLowerCase().replace(/\s+/g, '_');
  const _0x477652 = ["https://safebooru.org/index.php?page=dapi&s=post&q=index&json=1&tags=" + _0x40e02d, "https://danbooru.donmai.us/posts.json?tags=" + _0x40e02d, global.APIs.delirius.url + "/search/gelbooru?query=" + _0x40e02d];
  for (const _0x4b6369 of _0x477652) {
    try {
      const _0x410c26 = await _0x5e341b(_0x4b6369, {
        'headers': {
          'User-Agent': 'Mozilla/5.0',
          'Accept': 'application/json'
        }
      });
      const _0x2d1653 = _0x410c26.headers.get("content-type") || '';
      if (!_0x410c26.ok || !_0x2d1653.includes("json")) {
        continue;
      }
      const _0x9059c1 = await _0x410c26.json();
      const _0x13a60e = Array.isArray(_0x9059c1) ? _0x9059c1 : _0x9059c1?.["post"] || _0x9059c1?.["data"] || [];
      const _0x39979e = _0x13a60e.map(_0xb2b27 => _0xb2b27?.["file_url"] || _0xb2b27?.["large_file_url"] || _0xb2b27?.["image"] || _0xb2b27?.['media_asset']?.["variants"]?.[0x0]?.["url"]).filter(_0x2f0147 => typeof _0x2f0147 === "string" && /\.(jpe?g|png)$/.test(_0x2f0147));
      if (_0x39979e.length) {
        return _0x39979e;
      }
    } catch {}
  }
  return [];
}

let handler = async (_0x56f8da, {
  conn: _0x26ac7c,
  args: _0x30f3ca,
  usedPrefix: _0x4685c3,
  command: _0x477397
}) => {

  try {
    if (!global.db.data.chats?.[_0x56f8da.chat]?.["gacha"] && _0x56f8da.isGroup) {
      return _0x56f8da.reply("ꕥ Los comandos de *Gacha* están desactivados en este grupo.\n\nUn *administrador* puede activarlos con el comando:\n» *" + _0x4685c3 + "gacha on*");
    }
    if (!_0x30f3ca.length) {
      return _0x56f8da.reply("❀ Por favor, proporciona el nombre de un personaje.\n> Ejemplo » *" + (_0x4685c3 + _0x477397) + " Yuki Suou*");
    }
    const _0x5c3f47 = await loadCharacters();
    const _0x52683c = flattenCharacters(_0x5c3f47);
    const _0x47e8b9 = _0x30f3ca.join(" ").toLowerCase().trim();
    const _0x2f6c28 = _0x52683c.find(_0x4b9ac3 => String(_0x4b9ac3.name).toLowerCase() === _0x47e8b9) || _0x52683c.find(_0x4f005a => String(_0x4f005a.name).toLowerCase().includes(_0x47e8b9) || Array.isArray(_0x4f005a.tags) && _0x4f005a.tags.some(_0x2dd429 => _0x2dd429.toLowerCase().includes(_0x47e8b9))) || _0x52683c.find(_0x2a2349 => _0x47e8b9.split(" ").some(_0x138abe => String(_0x2a2349.name).toLowerCase().includes(_0x138abe) || Array.isArray(_0x2a2349.tags) && _0x2a2349.tags.some(_0x5069ca => _0x5069ca.toLowerCase().includes(_0x138abe))));
    if (!_0x2f6c28) {
      return _0x56f8da.reply("ꕥ No se encontró el personaje *" + _0x47e8b9 + '*.');
    }
    const _0x308c02 = global.db.data;
    switch (_0x477397) {
      case "charinfo":
      case "winfo":
      case "waifuinfo":
        {
          if (!_0x308c02.characters) {
            _0x308c02.characters = {};
          }
          if (!_0x308c02.characters[_0x2f6c28.id]) {
            _0x308c02.characters[_0x2f6c28.id] = {};
          }
          const _0x44af0b = _0x308c02.characters[_0x2f6c28.id];
          _0x44af0b.name ??= _0x2f6c28.name;
          _0x44af0b.value = typeof _0x44af0b.value === 'number' ? _0x44af0b.value : Number(_0x2f6c28.value || 0x64);
          _0x44af0b.votes = typeof _0x44af0b.votes === "number" ? _0x44af0b.votes : 0x0;
          const _0x29b587 = getSeriesNameByCharacter(_0x5c3f47, _0x2f6c28.id);
          const _0x5cac10 = Object.entries(_0x308c02.users).find(([, _0x1b53b1]) => Array.isArray(_0x1b53b1.characters) && _0x1b53b1.characters.includes(_0x2f6c28.id));
          let _0x13d1a3 = await (async () => _0x5cac10?.[0x0] ? _0x308c02.users[_0x5cac10[0x0]]?.["name"]?.["trim"]() || (await _0x26ac7c.getName(_0x5cac10[0x0]))?.["trim"]() || _0x5cac10[0x0].split('@')[0x0] : "desconocido")();
          const _0x5d75f2 = _0x44af0b.user && _0x44af0b.claimedAt ? "\nⴵ Fecha de reclamo » *" + new Date(_0x44af0b.claimedAt).toLocaleDateString("es-VE", {
            'weekday': "long",
            'day': "numeric",
            'month': 'long',
            'year': 'numeric'
          }) + '*' : '';
          const _0x16b784 = typeof _0x44af0b.lastVotedAt === "number" ? "hace *" + formatElapsed(Date.now() - _0x44af0b.lastVotedAt) + '*' : "*Nunca*";
          const _0x17396d = Object.values(_0x308c02.characters).filter(_0x402d3e => typeof _0x402d3e.value === "number").sort((_0x399400, _0x24aaa9) => _0x24aaa9.value - _0x399400.value);
          const _0x294977 = _0x17396d.findIndex(_0x3ffff8 => _0x3ffff8.name === _0x2f6c28.name) + 0x1 || '—';
          const _0x31fc5b = "❀ Nombre » *" + _0x44af0b.name + "*\n⚥ Género » *" + (_0x2f6c28.gender || 'Desconocido') + "*\n✰ Valor » *" + _0x44af0b.value.toLocaleString() + "*\n♡ Estado » " + (_0x5cac10 ? "Reclamado por *" + _0x13d1a3 + '*' : '*Libre*') + _0x5d75f2 + "\n❖ Fuente » *" + _0x29b587 + "*\n❏ Puesto » *#" + _0x294977 + "*\nⴵ Último voto » " + _0x16b784;
          await _0x26ac7c.reply(_0x56f8da.chat, _0x31fc5b.trim(), _0x56f8da);
          break;
        }
      case "charimage":
      case "waifuimage":
      case 'cimage':
      case "wimage":
        {
          const _0x11508e = Array.isArray(_0x2f6c28.tags) ? _0x2f6c28.tags[0x0] : null;
          if (!_0x11508e) {
            return _0x56f8da.reply("ꕥ El personaje *" + _0x2f6c28.name + "* no tiene un tag válido para buscar imágenes.");
          }
          const _0x3d945e = await buscarImagenDelirius(_0x11508e);
          const _0x25f81e = _0x3d945e[Math.floor(Math.random() * _0x3d945e.length)];
          if (!_0x25f81e) {
            return _0x56f8da.reply("ꕥ No se encontraron imágenes para *" + _0x2f6c28.name + "* con el tag *" + _0x11508e + '*.');
          }
          const _0x297cde = getSeriesNameByCharacter(_0x5c3f47, _0x2f6c28.id);
          const _0x4c17dc = "❀ Nombre » *" + _0x2f6c28.name + "*\n⚥ Género » *" + (_0x2f6c28.gender || "Desconocido") + "*\n❖ Fuente » *" + _0x297cde + '*';
          await _0x26ac7c.sendFile(_0x56f8da.chat, _0x25f81e, _0x2f6c28.name + ".jpg", _0x4c17dc, _0x56f8da);
          break;
        }
      case "charvideo":
      case 'waifuvideo':
      case "cvideo":
      case "wvideo":
        {
          const _0x331ac1 = Array.isArray(_0x2f6c28.tags) ? _0x2f6c28.tags[0x0] : null;
          if (!_0x331ac1) {
            return _0x56f8da.reply("ꕥ El personaje " + _0x2f6c28.name + " no tiene un tag válido para buscar videos.");
          }
          const _0x18b04c = String(_0x331ac1).trim().toLowerCase().replace(/\s+/g, '_');
          const _0x5e8a20 = [global.APIs.delirius.url + '/search/gelbooru?query=' + _0x18b04c, "https://safebooru.org/index.php?page=dapi&s=post&q=index&json=1&tags=" + _0x18b04c, "https://danbooru.donmai.us/posts.json?tags=" + _0x18b04c];
          let _0x4e629c = [];
          for (const _0x153b5b of _0x5e8a20) {
            try {
              const _0x55b920 = await _0x5e341b(_0x153b5b, {
                'headers': {
                  'User-Agent': "Mozilla/5.0",
                  'Accept': "application/json"
                }
              });
              const _0x4bad12 = _0x55b920.headers.get("content-type") || '';
              if (!_0x55b920.ok || !_0x4bad12.includes("json")) {
                continue;
              }
              const _0x358d2b = await _0x55b920.json();
              const _0x1ea591 = Array.isArray(_0x358d2b) ? _0x358d2b : _0x358d2b?.["post"] || _0x358d2b?.['data'] || [];
              _0x4e629c = _0x1ea591.map(_0x3ba2f4 => _0x3ba2f4?.["file_url"] || _0x3ba2f4?.['large_file_url'] || _0x3ba2f4?.["image"] || _0x3ba2f4?.['media_asset']?.["variants"]?.[0x0]?.["url"]).filter(_0x53113d => typeof _0x53113d === "string" && /\.(gif|mp4)$/.test(_0x53113d));
              if (_0x4e629c.length) {
                break;
              }
            } catch {}
          }
          if (!_0x4e629c.length) {
            return _0x56f8da.reply("ꕥ No se encontraron videos para " + _0x2f6c28.name + '.');
          }
          const _0x11ce91 = _0x4e629c[Math.floor(Math.random() * _0x4e629c.length)];
          const _0x39c4d8 = getSeriesNameByCharacter(_0x5c3f47, _0x2f6c28.id);
          const _0x1a9b17 = "❀ Nombre » *" + _0x2f6c28.name + "*\n⚥ Género » *" + (_0x2f6c28.gender || "Desconocido") + "*\n❖ Fuente » *" + _0x39c4d8 + '*';
          await _0x26ac7c.sendFile(_0x56f8da.chat, _0x11ce91, _0x2f6c28.name + '.' + (_0x11ce91.endsWith(".mp4") ? "mp4" : 'gif'), _0x1a9b17, _0x56f8da);
          break;
        }
    }
  } catch (_0x4a1000) {
    await _0x26ac7c.reply(_0x56f8da.chat, "⚠︎ Se ha producido un problema.\n> Usa *" + _0x4685c3 + "report* para informarlo.\n\n" + _0x4a1000.message, _0x56f8da);
  }
};
handler.help = ["winfo", "wimage", "waifuvideo"];
handler.tags = ["gacha"];
handler.command = ['charinfo', 'winfo', "waifuinfo", "charimage", "waifuimage", "cimage", 'wimage', "charvideo", "waifuvideo", "cvideo", "wvideo"];
handler.group = true;
export default handler;
        
