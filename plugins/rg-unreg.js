let handlerUnreg = async (m, { conn, usedPrefix }) => {
  const user = global.db.data.users[m.sender]
  const pp = await conn.profilePictureUrl(m.sender, 'image').catch(() => 'https://files.catbox.moe/xr2m6u.jpg')

  if (!user.registered) {
    return m.reply('『⚠️』 No tienes ningún pacto activo...')
  }

  user.registered = false
  user.name = ''
  user.age = 0

  // Documento estilizado tipo placeholder
  const DOCUMENT_TEMPLATE = {
    url: 'https://mmg.whatsapp.net/v/t62.7119-24/539012045_745537058346694_1512031191239726227_n.enc',
    mimetype: 'application/pdf',
    fileSha256: '+gmvvCB6ckJSuuG3ZOzHsTBgRAukejv1nnfwGSSSS/4=',
    fileLength: '999999999999',
    pageCount: 0,
    mediaKey: 'MWO6fI223TY8T0i9onNcwNBBPldWfwp1j1FPKCiJFzw=',
    fileName: 'Shadow🔥', // 👈 aquí cambiamos Choso por Shadow
    fileEncSha256: 'ZS8v9tio2un1yWVOOG3lwBxiP+mNgaKPY9+wl5pEoi8=',
    directPath: '/v/t62.7119-24/539012045_745537058346694_1512031191239726227_n.enc',
    mediaKeyTimestamp: String(Math.floor(Date.now() / 1000))
  }

  await conn.sendMessage(m.chat, {
    text: `『💀』 El sello ha sido roto...\n\n🌑 La sombra se disuelve en la oscuridad.`,
    contextInfo: {
      externalAdReply: {
        title: '☽ Sello Shadow Roto ☽',
        body: 'El pacto ha sido disuelto',
        thumbnailUrl: pp,
        sourceUrl: 'https://whatsapp.com/channel/0029Vb7GXFc9cDDW4i1gJY1m',
        mediaType: 1,
        renderLargerThumbnail: true,
        ...DOCUMENT_TEMPLATE // 👈 se incrusta el documento aquí
      }
    }
  }, { quoted: m })
}

handlerUnreg.help = ['unreg']
handlerUnreg.tags = ['rg']
handlerUnreg.command = ['unreg', 'borrarregistro', 'delreg']

export default handlerUnreg
