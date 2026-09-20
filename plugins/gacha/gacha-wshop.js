import { promises as _0x4d55cb } from 'fs';
const verifi = async () => {
  try {
    const _0x7f4aa0 = await _0x4d55cb.readFile("./package.json", "utf-8");
    const _0x125a0e = JSON.parse(_0x7f4aa0);
    return _0x125a0e.repository?.["url"] === "git+https://github.com/meado-learner/Michi-WaMD.git";
  } catch {
    return false;
  }
};
let handler = async (_0x3a70e2, {
  conn: _0x77a4a8,
  args: _0x5416da,
  command: _0x4c30c7,
  usedPrefix: _0x23c742
}) => {
  if (!(await verifi())) {
    return _0x77a4a8.reply(_0x3a70e2.chat, "❀ El comando *<" + _0x4c30c7 + ">* solo está disponible para Michi.", _0x3a70e2);
  }
  const _0x7d7ebb = global.db.data.chats[_0x3a70e2.chat];
  if (!_0x7d7ebb.sales) {
    _0x7d7ebb.sales = {};
  }
  if (!global.db.data.characters) {
    global.db.data.characters = {};
  }
  if (!global.db.data.users[_0x3a70e2.sender]) {
    global.db.data.users[_0x3a70e2.sender] = {
      'coin': 0x0,
      'characters': []
    };
  }
  if (!_0x7d7ebb.gacha && _0x3a70e2.isGroup) {
    return _0x3a70e2.reply("ꕥ Los comandos de *Gacha* están desactivados en este grupo.\n\nUn *administrador* puede activarlos con el comando:\n» *" + _0x23c742 + "gacha on*");
  }
  try {
    switch (_0x4c30c7) {
      case "sell":
      case "vender":
        {
          if (_0x5416da.length < 0x2) {
            return _0x3a70e2.reply("❀ Debes especificar un precio para subastar el personaje.\n> Ejemplo » *" + (_0x23c742 + _0x4c30c7) + " 5000 Yuki Suou*");
          }
          const _0x3be439 = parseInt(_0x5416da[0x0]);
          if (isNaN(_0x3be439) || _0x3be439 < 0x7d0) {
            return _0x3a70e2.reply("ꕥ El precio mínimo para subastar un personaje es de *¥2,000 " + currency + '*.');
          }
          const _0x2a4019 = _0x5416da.slice(0x1).join(" ").toLowerCase();
          const _0x49cc4c = Object.keys(global.db.data.characters).find(_0x59a84e => (global.db.data.characters[_0x59a84e]?.["name"] || '').toLowerCase() === _0x2a4019 && global.db.data.characters[_0x59a84e]?.["user"] === _0x3a70e2.sender);
          if (!_0x49cc4c) {
            return _0x3a70e2.reply("ꕥ No se ha encontrado al personaje *" + _0x5416da.slice(0x1).join(" ") + '*.');
          }
          const _0x2528c = global.db.data.characters[_0x49cc4c];
          _0x7d7ebb.sales[_0x49cc4c] = {
            'name': _0x2528c.name,
            'user': _0x3a70e2.sender,
            'price': _0x3be439,
            'time': Date.now()
          };
          let _0x494e3f = await (async () => global.db.data.users[_0x3a70e2.sender].name?.["trim"]() || (await _0x77a4a8.getName(_0x3a70e2.sender).then(_0xb9a79a => typeof _0xb9a79a === "string" && _0xb9a79a.trim() ? _0xb9a79a : _0x3a70e2.sender.split('@')[0x0])["catch"](() => _0x3a70e2.sender.split('@')[0x0])))();
          _0x3a70e2.reply("✎ *" + _0x2528c.name + "* ha sido puesto a la venta!\n❀ Vendedor » *" + _0x494e3f + "*\n⛁ Valor » *¥" + _0x3be439.toLocaleString() + " " + currency + "*\nⴵ Expira en » *3 dias*\n> Puedes ver los personajes en venta usando *" + _0x23c742 + 'wshop*');
          break;
        }
      case 'removesale':
      case "removerventa":
        {
          if (!_0x5416da.length) {
            return _0x3a70e2.reply("❀ Debes especificar un personaje para eliminar.\n> Ejemplo » *" + (_0x23c742 + _0x4c30c7) + " Yuki Suou*");
          }
          const _0x383f1e = _0x5416da.join(" ").toLowerCase();
          const _0xb0b4d5 = Object.keys(_0x7d7ebb.sales).find(_0x4c18b0 => (_0x7d7ebb.sales[_0x4c18b0]?.["name"] || '').toLowerCase() === _0x383f1e);
          if (!_0xb0b4d5 || _0x7d7ebb.sales[_0xb0b4d5].user !== _0x3a70e2.sender) {
            return _0x3a70e2.reply("ꕥ El personaje *" + _0x5416da.join(" ") + "* no está a la venta por ti.");
          }
          delete _0x7d7ebb.sales[_0xb0b4d5];
          _0x3a70e2.reply("❀ *" + _0x5416da.join(" ") + "* ha sido eliminado de la lista de ventas.");
          break;
        }
      case 'wshop':
      case "haremshop":
      case "tiendawaifus":
        {
          const _0x4832c5 = Object.entries(_0x7d7ebb.sales || {});
          if (!_0x4832c5.length) {
            const _0x25ce44 = await _0x77a4a8.groupMetadata(_0x3a70e2.chat);
            return _0x3a70e2.reply("ꕥ No hay personajes en venta en *" + (_0x25ce44.subject || "este grupo") + '*');
          }
          const _0x5b2628 = parseInt(_0x5416da[0x0]) || 0x1;
          const _0x1b1001 = Math.ceil(_0x4832c5.length / 0xa);
          if (_0x5b2628 < 0x1 || _0x5b2628 > _0x1b1001) {
            return _0x3a70e2.reply("ꕥ Página inválida. Solo hay *" + _0x1b1001 + "* disponible" + (_0x1b1001 > 0x1 ? 's' : '') + '.');
          }
          const _0x45f8ff = [];
          for (const [_0x10551c, _0x36740d] of _0x4832c5.slice((_0x5b2628 - 0x1) * 0xa, _0x5b2628 * 0xa)) {
            const _0xc904b2 = 259200000 - (Date.now() - _0x36740d.time);
            const _0x10cf0e = Math.floor(_0xc904b2 / 0x5265c00);
            const _0x13e871 = Math.floor(_0xc904b2 % 0x5265c00 / 0x36ee80);
            const _0xfef40f = Math.floor(_0xc904b2 % 0x36ee80 / 0xea60);
            const _0x3bfea8 = Math.floor(_0xc904b2 % 0xea60 / 0x3e8);
            let _0x200ce7 = await (async () => global.db.data.users[_0x36740d.user]?.["name"]?.['trim']() || (await _0x77a4a8.getName(_0x36740d.user).then(_0x2e6aa9 => typeof _0x2e6aa9 === "string" && _0x2e6aa9.trim() ? _0x2e6aa9 : _0x36740d.user.split('@')[0x0])["catch"](() => _0x36740d.user.split('@')[0x0])))();
            const _0x77ab5d = typeof global.db.data.characters[_0x10551c]?.['value'] === 'number' ? global.db.data.characters[_0x10551c].value : 0x0;
            _0x45f8ff.push("❀ *" + _0x36740d.name + "* (✰ " + _0x77ab5d + "):\n⛁ Precio » *¥" + _0x36740d.price.toLocaleString() + " " + currency + "*\n❖ Vendedor » *" + _0x200ce7 + "*\nⴵ Expira en » *" + _0x10cf0e + "d " + _0x13e871 + "h " + _0xfef40f + "m " + _0x3bfea8 + 's*');
          }
          _0x3a70e2.reply("*☆ HaremShop `≧◠ᴥ◠≦`*\n" + ("❏ Personajes en venta <" + _0x4832c5.length + ">:\n\n") + _0x45f8ff.join("\n\n") + ("\n\n> • Paginá *" + _0x5b2628 + "* de *" + _0x1b1001 + '*'));
          break;
        }
      case "buyc":
      case "buycharacter":
      case "buychar":
        {
          if (!_0x5416da.length) {
            return _0x3a70e2.reply("❀ Debes especificar un personaje para comprar.\n> Ejemplo » *" + (_0x23c742 + _0x4c30c7) + " Yuki Suou*");
          }
          const _0x2309e9 = _0x5416da.join(" ").toLowerCase();
          const _0x2f4429 = Object.keys(_0x7d7ebb.sales).find(_0x1ca872 => (_0x7d7ebb.sales[_0x1ca872]?.['name'] || '').toLowerCase() === _0x2309e9);
          if (!_0x2f4429) {
            return _0x3a70e2.reply("ꕥ No se ha encontrado al personaje *" + _0x5416da.join(" ") + "* en venta.");
          }
          const _0x2ffd79 = _0x7d7ebb.sales[_0x2f4429];
          if (_0x2ffd79.user === _0x3a70e2.sender) {
            return _0x3a70e2.reply("ꕥ No puedes comprar tu propio personaje.");
          }
          const _0x1891ed = global.db.data.users[_0x3a70e2.sender];
          const _0x3df509 = typeof _0x1891ed?.["coin"] === "number" ? _0x1891ed.coin : 0x0;
          if (_0x3df509 < _0x2ffd79.price) {
            return _0x3a70e2.reply("ꕥ No tienes suficientes *" + currency + "* para comprar a *" + _0x2ffd79.name + "*.\n> Necesitas *¥" + _0x2ffd79.price.toLocaleString() + " " + currency + '*');
          }
          const _0x4845e4 = global.db.data.users[_0x2ffd79.user];
          if (!_0x4845e4) {
            global.db.data.users[_0x2ffd79.user] = {
              'coin': 0x0,
              'characters': []
            };
          }
          if (!Array.isArray(_0x4845e4.characters)) {
            _0x4845e4.characters = [];
          }
          _0x1891ed.coin -= _0x2ffd79.price;
          _0x4845e4.coin += _0x2ffd79.price;
          global.db.data.characters[_0x2f4429].user = _0x3a70e2.sender;
          if (!_0x1891ed.characters.includes(_0x2f4429)) {
            _0x1891ed.characters.push(_0x2f4429);
          }
          _0x4845e4.characters = _0x4845e4.characters.filter(_0x3374c9 => _0x3374c9 !== _0x2f4429);
          if (_0x4845e4.favorite === _0x2f4429) {
            delete _0x4845e4.favorite;
          }
          delete _0x7d7ebb.sales[_0x2f4429];
          let _0x4e79ac = await (async () => _0x4845e4.name?.["trim"]() || (await _0x77a4a8.getName(_0x2ffd79.user).then(_0x585dcc => typeof _0x585dcc === "string" && _0x585dcc.trim() ? _0x585dcc : _0x2ffd79.user.split('@')[0x0])["catch"](() => _0x2ffd79.user.split('@')[0x0])))();
          let _0xde11d9 = await (async () => _0x1891ed.name?.["trim"]() || (await _0x77a4a8.getName(_0x3a70e2.sender).then(_0x23a297 => typeof _0x23a297 === 'string' && _0x23a297.trim() ? _0x23a297 : _0x3a70e2.sender.split('@')[0x0])['catch'](() => _0x3a70e2.sender.split('@')[0x0])))();
          _0x3a70e2.reply("❀ *" + _0x2ffd79.name + "* ha sido comprado por *" + _0xde11d9 + "*!\n> Se han transferido *¥" + _0x2ffd79.price.toLocaleString() + " " + currency + "* a *" + _0x4e79ac + '*');
          break;
        }
    }
  } catch (_0x500f87) {
    await _0x77a4a8.reply(_0x3a70e2.chat, "⚠︎ Se ha producido un problema.\n> Usa *" + _0x23c742 + "report* para informarlo.\n\n" + _0x500f87.message, _0x3a70e2);
  }
};
handler.help = ["sell", "removesale", "wshop", "buyc"];
handler.tags = ["gacha"];
handler.command = ["sell", 'vender', 'removesale', "removerventa", 'haremshop', "tiendawaifus", 'wshop', "buycharacter", "buychar", "buyc"];
handler.group = true;
export default handler;
