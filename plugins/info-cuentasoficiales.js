let media = 'https://files.catbox.moe/lcn1kw.mp4'
let handler = async (m, {conn, command}) => {
  const wm = (typeof global !== 'undefined' && global.wm) ? global.wm : 'Shadow-BOT-MD ⚔️';
  const bot = 'Shadow-BOT-MD ⚔️';

  let fkontak = {
    key: {participants: '0@s.whatsapp.net', remoteJid: 'status@broadcast', fromMe: false, id: 'Halo'},
    message: {
      contactMessage: {
        vcard: `BEGIN:VCARD\nVERSION:3.0\nN:Sy;Bot;;;\nFN:y\nitem1.TEL;waid=${m.sender.split('@')[0]}:${m.sender.split('@')[0]}\nitem1.X-ABLabel:Ponsel\nEND:VCARD`
      }
    },
    participant: '0@s.whatsapp.net'
  }

  let texto = `🌑⚔️ 𝘽𝙄𝙀𝙉𝙑𝙀𝙉𝙄𝘿𝙊(𝘼) 𝘼 𝙇𝘼𝙎 𝘾𝙐𝙀𝙉𝙏𝘼𝙎 𝙊𝙁𝙄𝘾𝙄𝘼𝙇𝙀𝙎 ⚔️🌑
💜 𝙒𝙀𝙇𝘾𝙊𝙈𝙀 𝙏𝙊 𝙏𝙃𝙀 𝙊𝙁𝙁𝙄𝘾𝙄𝘼𝙇 𝘼𝘾𝘾𝙊𝙐𝙉𝙏𝙎
┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈
💖 𝙎𝙝𝙖𝙙𝙤𝙬-𝘽𝙊𝙏-𝙈𝘿 ⚔️✨
『☽』 El poder oculto se revela solo en las sombras...
┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈
✅ *GITHUB OFICIAL*
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
👑 Creador Principal: +58 424-2773183 (Yosue)
⚔️ Segundo Creador: +504 9373-2693 (Ado)
🤩 Colaborador: +51 900 373 696 (Gian Pool?
┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈
🌌✨ *Shadow-BOT-MD* — El jardín sombrío nunca duerme ✨🌌`

  await conn.sendButton(m.chat, texto, wm, media, [
   ['👑 Creadores 💗', '#owner'],
   ['☘️ Volver al Menú', '/menu']
       ],
    null, [
   ['Shadow-BOT-MD ⚔️', 'https://github.com/yosue891/SHADOW-BOT-MD.git']
       ],
    fkontak
  )
}

handler.command = ['cuentasoficiales']

export default handler
