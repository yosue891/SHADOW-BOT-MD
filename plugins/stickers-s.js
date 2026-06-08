import fs from 'fs'
import sharp from 'sharp'
import fetch from 'node-fetch'
import { downloadContentFromMessage } from '@whiskeysockets/baileys'

let handler = async (m, { conn, args, usedPrefix, command }) => {
  const chat = global.db.data.users[m.sender] || {}
  
  // --- SISTEMA DE REGISTRO INTEGRADO DE TU BOT ---
  if (!chat.registered) {
    const thumbBuffer = await (await fetch('https://iili.io/fXp3swb.jpg')).buffer()

    const fkontak = {
      key: { participants: '0@s.whatsapp.net', fromMe: false, id: 'Shadow' },
      message: {
        locationMessage: {
          name: 'Registro requerido',
          jpegThumbnail: thumbBuffer,
          vcard: 'BEGIN:VCARD\nVERSION:3.0\nN:;Shadow;;;\nFN:Shadow\nORG:Shadow Garden\nitem1.TEL;waid=584242773183:+58 424 2773183\nitem1.X-ABLabel:Shadow\nEND:VCARD'
        }
      },
      participant: '0@s.whatsapp.net'
    }

    const productMessage = {
      product: {
        productImage: { url: 'https://files.catbox.moe/n3bg2n.jpg' },
        productId: '999999999999999',
        title: 'REGISTRO',
        description: 'Registro requerido',
        currencyCode: 'USD',
        priceAmount1000: '0',
        retailId: '1677',
        url: `https://wa.me/584242773183`,
        productImageCount: 1
      },
      businessOwnerJid: '584242773183@s.whatsapp.net',
      caption: [
        `➤ *\`REGISTRO\`*`,
        `𔓕 Hola ${m.pushName || 'usuario'}`,
        `𔓕 Para usar el comando necesitas registrarte`,
        `𔓕 Comando: \`${usedPrefix}reg nombre.edad\``,
        `𔓕 Ejemplo: \`${usedPrefix}reg shadow.18\``
      ].join('\n'),
      footer: '🌌 Shadow Bot',
      interactiveButtons: [
        { name: 'quick_reply', buttonParamsJson: JSON.stringify({ display_text: '📝 Registrarse', id: `${usedPrefix}reg` }) },
        { name: 'cta_url', buttonParamsJson: JSON.stringify({ display_text: '👑 Creador', url: 'https://wa.me/584242773183' }) }
      ],
      mentions: [m.sender],
      contextInfo: {
        externalAdReply: {
          showAdAttribution: true,
          title: 'Shadow • Sistema de Registro',
          body: 'Registro uwu',
          mediaType: 1,
          thumbnailUrl: 'https://files.catbox.moe/n3bg2n.jpg',
          sourceUrl: 'https://wa.me/584242773183'
        }
      }
    }
    return await conn.sendMessage(m.chat, productMessage, { quoted: fkontak })
  }

  const from = m?.chat || m?.key?.remoteJid
  if (!from) return

  // --- CONFIGURACIÓN DE ESTILOS Y COMANDOS ---
  const shapeArgs = { '-c': 'circle', '-t': 'triangle', '-s': 'star', '-r': 'roundrect', '-h': 'hexagon', '-d': 'diamond', '-f': 'frame', '-b': 'border', '-w': 'wave', '-m': 'mirror', '-o': 'octagon', '-y': 'pentagon', '-e': 'ellipse', '-z': 'cross', '-v': 'heart', '-x': 'cover', '-i': 'expand' }      
  const effectArgs = { '-blur': 'blur', '-sepia': 'sepia', '-sharpen': 'sharpen', '-brighten': 'brighten', '-darken': 'darken', '-invert': 'invert', '-grayscale': 'grayscale', '-rotate90': 'rotate90', '-rotate180': 'rotate180', '-flip': 'flip', '-flop': 'flop', '-normalice': 'normalise', '-negate': 'negate', '-tint': 'tint' }      

  if (args[0] === '-list') {
    let helpText = `❖ Lista de Formas y Efectos Disponibles para *imagen*:\n\n❑ *Formas:*\n- -c : Crea un sticker circular\n- -t : Crea un sticker triangular\n- -s : Crea un sticker con forma de estrella\n- -r : Crea un sticker con esquinas redondeadas\n- -h : Crea un sticker hexagonal\n- -d : Crea un sticker con forma de diamante\n- -f : Crea un sticker con un marco\n- -b : Crea un sticker con un borde\n- -w : Crea un sticker con forma de onda\n- -m : Crea un sticker espejado\n- -o : Crea un sticker octogonal\n- -y : Crea un sticker pentagonal\n- -e : Crea un sticker elíptico\n- -z : Crea un sticker en forma de cruz\n- -v : Crea un sticker con forma de corazón\n- -x : Crea un sticker expandido (cover)\n- -i : Crea un sticker expandido (contain)\n\n❑ *Efectos:*\n- -blur : Aplica un efecto de desenfoque\n- -sepia : Aplica un efecto sepia\n- -sharpen : Aplica un efecto de nitidez\n- -brighten : Aumenta el brillo\n- -darken : Disminuye el brillo\n- -invert : Invierte los colores\n- -grayscale : Aplica escala de grises\n- -rotate90 : Rota la imagen 90 grados\n- -rotate180 : Rota la imagen 180 grados\n- -flip : Invierte la imagen horizontalmente\n- -flop : Invierte la imagen verticalmente\n- -normalice : Normaliza la imagen\n- -negate : Negatiza la imagen\n- -tint : Aplica un tinte de color a la imagen\n\n> Ejemplo: *${usedPrefix + command} -c -blur*`
    return await conn.sendMessage(from, { text: helpText }, { quoted: m })
  }

  // --- DETECCIÓN DE MULTIMEDIA (POST O FILTRADO) ---
  const ctx = m?.message?.extendedTextMessage?.contextInfo
  const quotedMsg = ctx?.quotedMessage?.message || ctx?.quotedMessage || null

  const imageMessage = m?.message?.imageMessage || quotedMsg?.imageMessage || null
  const videoMessage = m?.message?.videoMessage || quotedMsg?.videoMessage || null

  const isImage = !!imageMessage
  const isVideo = !!videoMessage

  if (!isImage && !isVideo) {
    return await conn.sendMessage(
      from,
      {
        text: '「✦」Responde a una *imagen* o *video* para crear el sticker.\n' +
              `> ✐ Ejemplo » *${usedPrefix + command} -c*\n` +
              `> ✐ Lista » *${usedPrefix + command} -list*`,
        contextInfo: {
          externalAdReply: {
            title: "sticker estilo Shadow-BOT-MD",
            body: "uwu",
            thumbnailUrl: "https://files.catbox.moe/zxjxhd.jpg", 
            mediaType: 1,
            renderLargerThumbnail: false,
            sourceUrl: null
          }
        }
      },
      { quoted: m }
    )
  }

  // Capturar los efectos solicitados en los argumentos
  const effects = []
  for (const arg of args) {
    if (shapeArgs[arg]) effects.push({ type: 'shape', value: shapeArgs[arg] })
    else if (effectArgs[arg]) effects.push({ type: 'effect', value: effectArgs[arg] })
  }

  // --- FUNCIÓN DE PROCESAMIENTO SHARP DE IMÁGENES ---
  const processImage = async (imgBuffer) => {
    let image = sharp(imgBuffer).resize(512, 512, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    
    const shape = effects.find(e => e.type === 'shape')
    if (shape) {
      const masks = { 
        circle: `<svg width="512" height="512"><circle cx="256" cy="256" r="256" fill="white"/></svg>`, 
        triangle: `<svg width="512" height="512"><polygon points="256,0 512,512 0,512" fill="white"/></svg>`, 
        star: `<svg width="512" height="512"><polygon points="256,20 298,190 478,190 330,290 380,460 256,360 132,460 182,290 34,190 214,190" fill="white"/></svg>`, 
        roundrect: `<svg width="512" height="512"><rect x="0" y="0" width="512" height="512" rx="100" ry="100" fill="white"/></svg>`, 
        hexagon: `<svg width="512" height="512"><polygon points="256,0 450,128 450,384 256,512 62,384 62,128" fill="white"/></svg>`, 
        diamond: `<svg width="512" height="512"><polygon points="256,0 512,256 256,512 0,256" fill="white"/></svg>`, 
        frame: `<svg width="512" height="512"><rect x="20" y="20" width="472" height="472" rx="20" ry="20" fill="none" stroke="white" stroke-width="40"/></svg>`, 
        wave: `<svg width="512" height="512"><path d="M0,320 C150,400 350,200 512,320 L512,0 L0,0 Z" fill="white"/></svg>`, 
        octagon: `<svg width="512" height="512"><polygon points="161,0 351,0 512,161 512,351 351,512 161,512 0,351 0,161" fill="white"/></svg>`, 
        pentagon: `<svg width="512" height="512"><polygon points="256,0 512,196 412,512 100,512 0,196" fill="white"/></svg>`, 
        ellipse: `<svg width="512" height="512"><ellipse cx="256" cy="256" rx="256" ry="150" fill="white"/></svg>`, 
        cross: `<svg width="512" height="512"><polygon points="236,0 276,0 276,236 512,236 512,276 276,276 276,512 236,512 236,276 0,276 0,236 236,236" fill="white"/></svg>`, 
        heart: `<svg width="512" height="512"><path d="M256 480 L 47 273 C 18 244 0 207 0 170 C 0 87 67 20 150 20 C 202 20 256 64 256 64 C 256 64 309 20 362 20 C 445 20 512 87 512 170 C 512 207 494 244 465 273 L 256 480 Z" fill="white"/></svg>` 
      }          
      if (shape.value === 'cover') {
        image = sharp(imgBuffer).resize(512, 512, { fit: 'cover' })
      } else if (shape.value === 'expand') {
        image = sharp(imgBuffer).resize(512, 512, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      } else if (masks[shape.value]) {
        image = image.composite([{ input: Buffer.from(masks[shape.value]), blend: 'dest-in' }])
      }
    }        

    for (const effect of effects) {
      if (effect.type === 'effect') {
        switch (effect.value) {
          case 'blur': image = image.blur(5); break
          case 'sepia': image = image.recomb([[0.393,0.769,0.189],[0.349,0.686,0.168],[0.272,0.534,0.131]]); break
          case 'sharpen': image = image.sharpen(); break
          case 'brighten': image = image.modulate({ brightness: 1.2 }); break
          case 'darken': image = image.modulate({ brightness: 0.8 }); break
          case 'invert': image = image.negate(); break
          case 'grayscale': image = image.greyscale(); break
          case 'rotate90': image = image.rotate(90); break
          case 'rotate180': image = image.rotate(180); break
          case 'flip': image = image.flip(); break
          case 'flop': image = image.flop(); break
          case 'normalice': image = image.normalise(); break
          case 'negate': image = image.negate(); break
          case 'tint': image = image.tint({ r: 255, g: 100, b: 100 }); break
        }
      }
    }        
    return await image.webp().toBuffer()
  }

  // --- DESCARGA Y PROCESAMIENTO ---
  const msg = isImage ? imageMessage : videoMessage
  const dlType = isImage ? 'image' : 'video'

  try {
    const stream = await downloadContentFromMessage(msg, dlType)
    let buffer = Buffer.from([])
    for await (const chunk of stream) buffer = Buffer.concat([buffer, chunk])

    const ts = Date.now()

    if (isImage) {
      // Si es imagen, se procesa directamente con Sharp en memoria y se envía
      const processedBuffer = await processImage(buffer)
      await conn.sendMessage(from, { sticker: processedBuffer }, { quoted: m })
    } else if (isVideo) {
      // Si es video, guardamos temporalmente para pasarlo por tu sistema de stickers normales
      if ((msg.seconds || 0) > 20) return await conn.sendMessage(from, { text: '❖ El video no puede durar más de 20 segundos' }, { quoted: m })
      const tmpFile = `./temp_video-${ts}.mp4`
      await fs.promises.writeFile(tmpFile, buffer)
      
      // Enviamos el video convirtiéndolo en sticker usando el método interno de tu bot
      await conn.sendMessage(from, { sticker: { url: tmpFile } }, { quoted: m })
      if (fs.existsSync(tmpFile)) await fs.promises.unlink(tmpFile)
    }

  } catch (e) {
    await conn.sendMessage(from, { text: `「✦」Error creando el sticker:\n${e.message || e}` }, { quoted: m })
  }
}

handler.help = ['sticker']
handler.tags = ['sticker']
handler.command = ['sticker', 's', 'stiker']

export default handler
