import { watchFile, unwatchFile } from "fs"
import chalk from "chalk"
import { fileURLToPath } from "url"
import fs from "fs"

global.botNumber = "" 

global.owner = [
// ZONA DE JIDS
["584242773183", "yosue </>", true],
["523328418129"],
["5491156178758"],
["51900373696"],
["50493732693"],
// ZONA DE LIDS 
["", "", true],
["", "", true], 
["", "", true]
]

global.mods = []
global.suittag = ["584242773183"] 
global.prems = []


global.libreria = "Baileys Multi Device"
global.vs = "^1.3.2"
global.nameqr = "shadow"
global.sessions = "Sessions/Principal"
global.jadi = "Sessions/SubBot"
global.MichiJadibts = true

global.botname = "Shadow-BOT-MD"
global.textbot = "Shadow-BOT, yosue"
global.dev = "SHADOW-BOT-MD"
global.author = "*SHADOW-BOT-MD* © mᥲძᥱ ᥕі𝗍һ 𝙮𝙤𝙨𝙪𝙚"
global.etiqueta = "© 𝙮𝙤𝙨𝙪𝙚 | 𝟤𝟢𝟤𝟧"
global.currency = "¢ Pesos"
global.michipg = "https://files.catbox.moe/ptx6h0.jpg"
global.icono = "https://files.catbox.moe/exo9ty.jpg"
global.catalogo = fs.readFileSync('./lib/catalogo.jpg')


global.group = "https://chat.whatsapp.com/D80dadzwRq4LQqFGUntZfK?mode=ems_copy_t"
global.community = ""
global.channel = "https://whatsapp.com/channel/0029VbArz9fAO7RGy2915k3O"
global.github = "https://github.com"
global.gmail = "minexdt@gmail.com"
global.ch = {
ch1: "120363420941524030@newsletter"
}


global.APIs = {
vreden: { url: "https://api.vreden.web.id", key: null },
delirius: { url: "https://api.delirius.store", key: null },
zenzxz: { url: "https://api.zenzxz.my.id", key: null },
siputzx: { url: "https://api.siputzx.my.id", key: null },
adonix: { url: "https://api-adonix.ultraplus.click", key: null }
}


let file = fileURLToPath(import.meta.url)
watchFile(file, () => {
unwatchFile(file)
console.log(chalk.redBright("Update 'settings.js'"))
import(`${file}?update=${Date.now()}`)
})
