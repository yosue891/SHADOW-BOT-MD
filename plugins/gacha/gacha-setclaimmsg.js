import { promises as _0x5c4612 } from 'fs';
const verifi = async () => {
  try {
    const _0x317f85 = await _0x5c4612.readFile('./package.json', "utf-8");
    const _0x44d5c7 = JSON.parse(_0x317f85);
    return _0x44d5c7.repository?.["url"] === "git+https://github.com/meado-learner/Michi-WaMD.git";
  } catch {
    return false;
  }
};
let handler = async (_0x20f606, {
  args: _0x137e53,
  usedPrefix: _0x366b91,
  command: _0x514a77
}) => {
  if (!(await verifi())) {
    return conn.reply(_0x20f606.chat, "❀ El comando *<" + _0x514a77 + ">* solo está disponible para Michi", _0x20f606);
  }
  try {
    if (!global.db.data.chats) {
      global.db.data.chats = {};
    }
    if (!global.db.data.chats[_0x20f606.chat]) {
      global.db.data.chats[_0x20f606.chat] = {};
    }
    const _0x48d18f = global.db.data.chats[_0x20f606.chat];
    if (!_0x48d18f.gacha && _0x20f606.isGroup) {
      return _0x20f606.reply("ꕥ Los comandos de *Gacha* están desactivados en este grupo.\n\nUn *administrador* puede activarlos con el comando:\n» *" + _0x366b91 + "gacha on*");
    }
    if (!global.db.data.users) {
      global.db.data.users = {};
    }
    if (!global.db.data.users[_0x20f606.sender]) {
      global.db.data.users[_0x20f606.sender] = {};
    }
    switch (_0x514a77) {
      case "setclaim":
      case "setclaimmsg":
        if (!_0x137e53[0x0]) {
          return _0x20f606.reply("❀ Debes especificar un mensaje para reclamar un personaje.\n> Ejemplos:\n> " + (_0x366b91 + _0x514a77) + " €user ha reclamado el personaje €character!\n> " + (_0x366b91 + _0x514a77) + " €character ha sido reclamado por €user");
        }
        const _0x4b30de = _0x137e53.join(" ");
        if (!_0x4b30de.includes("€user") || !_0x4b30de.includes("€character")) {
          return _0x20f606.reply("ꕥ Tu mensaje debe incluir *€user* y *€character* para que funcione correctamente.");
        }
        global.db.data.users[_0x20f606.sender].claimMessage = _0x4b30de;
        _0x20f606.reply("❀ Mensaje de reclamación modificado.");
        break;
      case "delclaimmsg":
      case "resetclaimmsg":
        delete global.db.data.users[_0x20f606.sender].claimMessage;
        _0x20f606.reply("❀ Mensaje de reclamación restablecido.");
        break;
    }
  } catch (_0x4eabe4) {
    await conn.reply(_0x20f606.chat, "⚠︎ Se ha producido un problema.\n> Usa *" + _0x366b91 + "report* para informarlo.\n\n" + _0x4eabe4.message, _0x20f606);
  }
};
handler.help = ["setclaim", "delclaimmsg"];
handler.tags = ["gacha"];
handler.command = ["setclaimmsg", "setclaim", 'delclaimmsg', "resetclaimmsg"];
handler.group = true;
export default handler;
