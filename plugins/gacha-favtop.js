import { promises as fs } from 'fs';

async function loadCharacters() {
  const data = await fs.readFile("./lib/characters.json", "utf-8");
  return JSON.parse(data);
}

function flattenCharacters(obj) {
  return Object.values(obj).flatMap(entry =>
    Array.isArray(entry.characters) ? entry.characters : []
  );
}

const handler = async (m, { conn, args, usedPrefix, command }) => {
  if (!global.db.data.chats?.[m.chat]?.["gacha"] && m.isGroup) {
    return m.reply("ꕥ Los comandos de *Gacha* están desactivados en este grupo.\n\nUn *administrador* puede activarlos con el comando:\n» *" + usedPrefix + "gacha on*");
  }
  if (!global.db.data.characters) global.db.data.characters = {};
  if (!global.db.data.users) global.db.data.users = {};

  try {
    const charactersData = await loadCharacters();
    const allCharacters = flattenCharacters(charactersData);
    const userData = global.db.data.users[m.sender];
    if (!Array.isArray(userData.characters)) {
      userData.characters = [];
    }

    switch (command) {
      case "setfav":
      case "wfav": {
        if (!args.length) {
          return m.reply("❀ Debes especificar un personaje.\n> Ejemplo » *" + (usedPrefix + command) + " Yuki Suou*");
        }
        const query = args.join(" ").toLowerCase().trim();
        const found = allCharacters.find(c => c.name.toLowerCase() === query);
        if (!found) return m.reply("ꕥ No se encontró el personaje *" + query + "*.");
        if (!userData.characters.includes(found.id)) {
          return m.reply("ꕥ El personaje *" + found.name + "* no está reclamado por ti.");
        }
        const prevFav = userData.favorite;
        userData.favorite = found.id;
        if (prevFav && prevFav !== found.id) {
          const prevChar = global.db.data.characters?.[prevFav];
          const prevName = typeof prevChar?.name === 'string' ? prevChar.name : "personaje anterior";
          return m.reply("❀ Se ha reemplazado tu favorito *" + prevName + "* por *" + found.name + "*!");
        }
        return m.reply("❀ Ahora *" + found.name + "* es tu personaje favorito!");
      }

      case "favtop":
      case "favoritetop":
      case "favboard": {
        const favCount = {};
        for (const [, u] of Object.entries(global.db.data.users)) {
          const fav = u.favorite;
          if (fav) favCount[fav] = (favCount[fav] || 0) + 1;
        }
        const favList = allCharacters.map(c => ({
          name: c.name,
          favorites: favCount[c.id] || 0
        })).filter(c => c.favorites > 0);

        const page = parseInt(args[0]) || 1;
        const totalPages = Math.max(1, Math.ceil(favList.length / 10));
        if (page < 1 || page > totalPages) {
          return m.reply("ꕥ Página no válida. Hay un total de *" + totalPages + "* páginas.");
        }
        const sorted = favList.sort((a, b) => b.favorites - a.favorites);
        const slice = sorted.slice((page - 1) * 10, page * 10);
        let text = "✰ Top de personajes favoritos:\n\n";
        slice.forEach((c, i) => {
          text += '#' + ((page - 1) * 10 + i + 1) + " » *" + c.name + "*\n";
          text += "   ♡ " + c.favorites + " favorito" + (c.favorites !== 1 ? 's' : '') + ".\n";
        });
        text += "\n> Página " + page + " de " + totalPages;
        await conn.reply(m.chat, text.trim(), m);
        break;
      }

      case "deletefav":
      case "delfav": {
        if (!userData.favorite) {
          return m.reply("❀ No tienes ningún personaje marcado como favorito.");
        }
        const favId = userData.favorite;
        const favChar = global.db.data.characters?.[favId] || {};
        let favName = typeof favChar.name === "string" ? favChar.name : null;
        if (!favName) {
          const found = allCharacters.find(c => c.id === favId);
          favName = found?.name || "personaje desconocido";
        }
        delete userData.favorite;
        m.reply("✎ *" + favName + "* ha dejado de ser tu personaje favorito.");
        break;
      }
    }
  } catch (err) {
    await conn.reply(m.chat, "⚠︎ Se ha producido un problema.\n> Usa *" + usedPrefix + "report* para informarlo.\n\n" + err.message, m);
  }
};

handler.help = ["setfav", "favtop", "delfav"];
handler.tags = ["gacha"];
handler.command = ["setfav", 'wfav', "favtop", "favoritetop", 'favboard', "deletefav", "delfav"];
handler.group = true;

export default handler;
