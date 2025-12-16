let media = 'https://files.catbox.moe/4rk0yc.mp4'
let handler = async (m, {conn, command}) => {
let fkontak = {
key: {participants: '0@s.whatsapp.net', remoteJid: 'status@broadcast', fromMe: false, id: 'Halo'},
message: {
contactMessage: {
vcard: `BEGIN:VCARD\nVERSION:3.0\nN:Sy;Bot;;;\nFN:y\nitem1.TEL;waid=${m.sender.split('@')[0]}:${m.sender.split('@')[0]}\nitem1.X-ABLabel:Ponsel\nEND:VCARD`
}
},
participant: '0@s.whatsapp.net'
}
let str = `🎄💙 𝘽𝙄𝙀𝙉𝙑𝙀𝙉𝙄𝘿𝙊(𝘼) 𝘼 𝙇𝘼𝙎 𝘾𝙐𝙀𝙉𝙏𝘼𝙎 𝙊𝙁𝙄𝘾𝙄𝘼𝙇𝙀𝙎 🎄
💜 𝙒𝙀𝙇𝘾𝙊𝙈𝙀 𝙏𝙊 𝙏𝙃𝙀 𝙊𝙁𝙁𝙄𝘾𝙄𝘼𝙇 𝘼𝘾𝘾𝙊𝙐𝙉𝙏𝙎
┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈
💖 𝙎𝙝𝙖𝙙𝙤𝙬-𝘽𝙊𝙏-𝙈𝘿 ⚔️✨
El poder oculto entre luces navideñas UwU
┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈
✅ GITHUB OFICIAL
https://github.com/yosue891
┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈
✅ *CANAL OFICIAL - YOSUE*
https://whatsapp.com/channel/0029VbArz9fAO7RGy2915k3O
┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈
✅ *CANAL OFICIAL - ADO*
https://whatsapp.com/channel/0029VbBIgz1HrDZg92ISUl2M
┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈
✅ *COMUNIDAD OFICIAL*
https://chat.whatsapp.com/ETHW7aP7kOICrR2RBrfE6N
┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈
👑 Creador Principal 🎅: +58 424-2773183 (Yosue)
🎁 Segundo Creador ❄️: +504 9373-2693 (Ado)
┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈
🎄✨ *Shadow-BOT-MD* — La sombra también celebra la Navidad UwU ✨🎄`

await conn.sendButton(
m.chat,
str,
wm,
media,
[
['🎄 Grupos Oficiales 🔰', '.grupos'],
['👑 Creadores 💗', '#owner'],
['☘️ Volver al Menú', '/menu']
],
null,
[['Shadow-BOT-MD ⚔️', 'https://github.com/yosue891']],
fkontak
)
}

handler.command = /^cuentasoficiales$/i  // ✅ ahora solo funciona con este comando
handler.exp = 35
export default handler
