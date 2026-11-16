import axios from "axios"
import { createCanvas, loadImage } from "@napi-rs/canvas"
import { generateWAMessageContent, generateWAMessageFromContent, proto } from '@whiskeysockets/baileys'

function drawCrown(ctx, x, y, width, height) {
  ctx.save();
  ctx.translate(x, y);
  ctx.shadowColor = "rgba(0, 0, 0, 0.65)";
  ctx.shadowBlur = 10;
  
  const grad = ctx.createLinearGradient(0, -height, 0, 0);
  grad.addColorStop(0, "#FFE082");
  grad.addColorStop(0.5, "#FFD54F");
  grad.addColorStop(1, "#FFA000");
  ctx.fillStyle = grad;
  ctx.strokeStyle = "#FF8F00";
  ctx.lineWidth = Math.max(2, Math.round(width * 0.03));

  ctx.beginPath();
  const hw = width / 2;
  ctx.moveTo(-hw, 0);
  ctx.lineTo(-hw * 0.9, -height * 0.7);
  ctx.lineTo(-hw * 0.45, -height * 0.35);
  ctx.lineTo(0, -height);
  ctx.lineTo(hw * 0.45, -height * 0.35);
  ctx.lineTo(hw * 0.9, -height * 0.7);
  ctx.lineTo(hw, 0);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Jewels
  const jewelR = Math.max(3, Math.round(width * 0.04));
  ctx.fillStyle = "#E91E63";
  ctx.beginPath();
  ctx.arc(0, -height + jewelR, jewelR, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#2196F3";
  ctx.beginPath();
  ctx.arc(-hw * 0.9, -height * 0.7 + jewelR * 0.8, jewelR * 0.8, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#2196F3";
  ctx.beginPath();
  ctx.arc(hw * 0.9, -height * 0.7 + jewelR * 0.8, jewelR * 0.8, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

async function composeCreatorCardImage(conn, creator) {
  const fallbackImage = "https://files.catbox.moe/mwhyfm.jpg";
  try {
    let bg;
    try {
      const res = await axios.get(creator.image, { responseType: 'arraybuffer', timeout: 5000 });
      bg = await loadImage(Buffer.from(res.data));
    } catch {
      try {
        const res = await axios.get(fallbackImage, { responseType: 'arraybuffer', timeout: 5000 });
        bg = await loadImage(Buffer.from(res.data));
      } catch {
        bg = null;
      }
    }

    if (!bg) throw new Error("No background image");

    const W = bg.width || 600;
    const H = bg.height || 600;
    const canvas = createCanvas(W, H);
    const ctx = canvas.getContext("2d");

    // Dibujar imagen de fondo del creador
    ctx.drawImage(bg, 0, 0, W, H);

    // Gradiente sutil arriba para resaltar el avatar
    const topGrad = ctx.createLinearGradient(0, 0, 0, H * 0.45);
    topGrad.addColorStop(0, "rgba(0, 0, 0, 0.42)");
    topGrad.addColorStop(1, "rgba(0, 0, 0, 0)");
    ctx.fillStyle = topGrad;
    ctx.fillRect(0, 0, W, H * 0.45);

    // Dimensiones y centro del avatar (arriba en el centro)
    const r = Math.round(Math.min(W, H) * 0.18);
    const cx = Math.round(W / 2);
    const cy = Math.round(H * 0.28);

    // Intentar obtener foto de perfil de WhatsApp con timeout estricto de 2.5s
    let ppImg = null;
    try {
      const userJid = `${creator.number}@s.whatsapp.net`;
      const ppUrlPromise = conn?.profilePictureUrl?.(userJid, 'image').catch(() => null);
      const timeoutPromise = new Promise(resolve => setTimeout(() => resolve(null), 2500));
      const ppUrl = await Promise.race([ppUrlPromise, timeoutPromise]);
      if (ppUrl) {
        const ppRes = await axios.get(ppUrl, { responseType: 'arraybuffer', timeout: 3500 });
        ppImg = await loadImage(Buffer.from(ppRes.data));
      }
    } catch {}

    // Sombra del marco
    ctx.save();
    ctx.shadowColor = "rgba(0, 0, 0, 0.75)";
    ctx.shadowBlur = 18;
    ctx.beginPath();
    ctx.arc(cx, cy, r + 4, 0, Math.PI * 2);
    ctx.fillStyle = "#FFD700";
    ctx.fill();
    ctx.restore();

    // Borde circular dorado
    ctx.beginPath();
    ctx.arc(cx, cy, r + 2.5, 0, Math.PI * 2);
    ctx.fillStyle = "#FFA000";
    ctx.fill();

    // Clip circular para el avatar
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.clip();

    if (ppImg) {
      // Si tiene foto de perfil, dibujarla centrada
      ctx.drawImage(ppImg, cx - r, cy - r, r * 2, r * 2);
    } else {
      // Si no tiene foto de perfil, dibujar el muñequito de WhatsApp clásico
      ctx.fillStyle = "#CFD8DC";
      ctx.fillRect(cx - r, cy - r, r * 2, r * 2);

      ctx.fillStyle = "#90A4AE";
      // Cabeza
      const headRadius = r * 0.38;
      const headY = cy - r * 0.22;
      ctx.beginPath();
      ctx.arc(cx, headY, headRadius, 0, Math.PI * 2);
      ctx.fill();

      // Torso / hombros
      const torsoY = cy + r * 0.72;
      ctx.beginPath();
      ctx.ellipse(cx, torsoY, r * 0.82, r * 0.58, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();

    // Dibujar corona dorada encima del avatar
    drawCrown(ctx, cx, cy - r + Math.round(r * 0.1), r * 1.0, r * 0.62);

    return canvas.toBuffer("image/jpeg", { quality: 0.92 });
  } catch (err) {
    console.warn("[OWNER CARD] Usando imagen directa para:", creator.name, err?.message);
    try {
      const res = await axios.get(creator.image, { responseType: 'arraybuffer', timeout: 5000 });
      return Buffer.from(res.data);
    } catch {
      const res = await axios.get(fallbackImage, { responseType: 'arraybuffer', timeout: 5000 });
      return Buffer.from(res.data);
    }
  }
}

const creators = [
  {
    name: "Yosue",
    role: "👑 Lord Shadow (Owner Principal)",
    number: "584242773183",
    image: "https://u.pone.rs/krpiuhdc.jpg",
    description: "🎃 Creador principal y líder de Shadow Garden.\n\n🌐 GitHub: github.com/yosue891\n📢 Canal: https://whatsapp.com/channel/0029VbArz9fAO7RGy2915k3O\n📦 Repo: https://github.com/yosue891/SHADOW-BOT-MD.git",
    btnLabel: "🎃 Canal de Yosue 🦇",
    btnUrl: "https://whatsapp.com/channel/0029VbArz9fAO7RGy2915k3O"
  },
  {
    name: "Ado",
    role: "🦇 Segundo Creador Principal",
    number: "50498273976",
    image: "https://u.pone.rs/zhxfvcvh.jpg",
    description: "🕯️ Co-creador principal y encargado de la optimización del aquelarre sombrío.\n\n🌐 GitHub: github.com/ado-hub\n📢 Canal: https://whatsapp.com/channel/0029VbD5h6s0AgWBpfCQlw2P\n📦 Repo: https://github.com/yosue891/SHADOW-BOT-MD.git",
    btnLabel: "🎃 Canal de Ado 🦇",
    btnUrl: "https://whatsapp.com/channel/0029VbD5h6s0AgWBpfCQlw2P"
  },
  {
    name: "Maycol",
    role: "👑 Creador Principal (Owner)",
    number: "51921826291",
    image: "https://u.pone.rs/lixzzxmi.jpg",
    description: "⚔️ Co-creador principal y líder estratégico del Shadow Garden.\n\n📢 Canal: https://whatsapp.com/channel/0029VbArz9fAO7RGy2915k3O\n📦 Repo: https://github.com/yosue891/SHADOW-BOT-MD.git",
    btnLabel: "🎃 Canal Oficial 🦇",
    btnUrl: "https://whatsapp.com/channel/0029VbArz9fAO7RGy2915k3O"
  },
  {
    name: "Daniel",
    role: "💻 Desarrollador Oficial",
    number: "526242255295",
    image: "https://u.pone.rs/pbtcofet.jpg",
    description: "🔮 Desarrollador oficial y hechicero del código en Shadow Garden.\n\n📢 Canal: https://whatsapp.com/channel/0029VbArz9fAO7RGy2915k3O\n📦 Repo: https://github.com/yosue891/SHADOW-BOT-MD.git",
    btnLabel: "🎃 Canal Oficial 🦇",
    btnUrl: "https://whatsapp.com/channel/0029VbArz9fAO7RGy2915k3O"
  },
  {
    name: "Yo soy yo",
    role: "💻 Desarrollador Oficial",
    number: "59163069329",
    image: "https://u.pone.rs/djyyxuim.jpg",
    description: "⚡ Desarrollador del bot y guardián de las sombras.\n\n📢 Canal: https://whatsapp.com/channel/0029VbArz9fAO7RGy2915k3O\n📦 Repo: https://github.com/yosue891/SHADOW-BOT-MD.git",
    btnLabel: "🎃 Canal Oficial 🦇",
    btnUrl: "https://whatsapp.com/channel/0029VbArz9fAO7RGy2915k3O"
  },
  {
    name: "Deylin",
    role: "💻 Desarrollador Oficial",
    number: "50432955554",
    image: "https://u.pone.rs/svuwkpgr.jpg",
    description: "🌙 Desarrollador oficial y arquitecto de funciones del aquelarre.\n\n📢 Canal: https://whatsapp.com/channel/0029VbArz9fAO7RGy2915k3O\n📦 Repo: https://github.com/yosue891/SHADOW-BOT-MD.git",
    btnLabel: "🎃 Canal Oficial 🦇",
    btnUrl: "https://whatsapp.com/channel/0029VbArz9fAO7RGy2915k3O"
  },
  {
    name: "Alexis",
    role: "💻 Desarrollador Oficial",
    number: "380970121849",
    image: "https://u.pone.rs/tmscwlcm.jpg",
    description: "🛡️ Desarrollador oficial y centinela del núcleo de las sombras.\n\n📢 Canal: https://whatsapp.com/channel/0029VbArz9fAO7RGy2915k3O\n📦 Repo: https://github.com/yosue891/SHADOW-BOT-MD.git",
    btnLabel: "🎃 Canal Oficial 🦇",
    btnUrl: "https://whatsapp.com/channel/0029VbArz9fAO7RGy2915k3O"
  }
]

const handler = async (m, { conn }) => {
  try {
    await m?.react?.("🎃").catch(() => null);

    const cardPromises = creators.map(async (creator) => {
      try {
        const imageBuffer = await composeCreatorCardImage(conn, creator);
        const { imageMessage } = await generateWAMessageContent(
          { image: imageBuffer },
          { upload: conn.waUploadToServer }
        );

        return {
          body: {
            text: `🎃 Desarrollador: ${creator.name}\n🦇 Rol: ${creator.role}\n\n${creator.description}`
          },
          footer: {
            text: "🎃 SHADOW GARDEN • HALLOWEEN 🦇"
          },
          header: {
            title: `🎃 ${creator.name} 🦇`,
            hasMediaAttachment: true,
            imageMessage
          },
          nativeFlowMessage: {
            buttons: [
              {
                name: "cta_url",
                buttonParamsJson: JSON.stringify({
                  display_text: `🎃 Chatear con ${creator.name}`,
                  url: `https://wa.me/${creator.number}?text=Hola+${encodeURIComponent(creator.name)},+vengo+desde+el+bot.`
                })
              },
              {
                name: "cta_url",
                buttonParamsJson: JSON.stringify({
                  display_text: creator.btnLabel,
                  url: creator.btnUrl
                })
              },
              {
                name: "cta_url",
                buttonParamsJson: JSON.stringify({
                  display_text: "📦 Repositorio GitHub 🦇",
                  url: "https://github.com/yosue891/SHADOW-BOT-MD.git"
                })
              }
            ]
          }
        };
      } catch (err) {
        console.warn(`[OWNER] Error al preparar tarjeta de ${creator.name}:`, err?.message);
        return null;
      }
    });

    const cardResults = await Promise.all(cardPromises);
    const cards = cardResults.filter(Boolean);

    if (!cards.length) {
      throw new Error("No se pudieron generar las tarjetas del carrusel.");
    }

    const content = {
      viewOnceMessage: {
        message: {
          messageContextInfo: { deviceListMetadata: {}, deviceListMetadataVersion: 2 },
          interactiveMessage: {
            body: { text: "Presentamos al equipo oficial de desarrollo detrás de este proyecto." },
            footer: { text: "Desliza para ver a los creadores" },
            header: { hasMediaAttachment: false },
            carouselMessage: {
              cards,
              messageVersion: 1,
              carouselCardType: 1
            }
          }
        }
      }
    };

    const messageContent = generateWAMessageFromContent(
      m.chat,
      proto.Message.fromObject(content),
      {
        quoted: m,
        userJid: conn.user?.id || conn.user?.jid
      }
    );

    const additionalNodes = [
      {
        tag: 'biz',
        attrs: { actual_actors: '2', host_storage: '2' },
        content: [
          {
            tag: 'interactive',
            attrs: { type: 'native_flow', v: '1' },
            content: [
              {
                tag: 'native_flow',
                attrs: { v: '9', name: 'mixed' },
                content: []
              }
            ]
          }
        ]
      }
    ];

    await conn.relayMessage(m.chat, messageContent.message, {
      messageId: messageContent.key.id,
      additionalNodes
    });

    await conn.sendMessage(m.chat, { 
      text: "Estos son los creadores y desarrolladores más destacados en Shadow-BOT-MD si hay algún error o falla no olvides en reportarlo por alguno de nosotros (y nada de estar escribiendo a media noche por qué no te vamos a contestar)" 
    }, { quoted: m });

  } catch (error) {
    console.error("[OWNER ERROR]", error);

    // Respaldo de texto garantizado en caso de que el cliente o servidor de WhatsApp rechace carruseles
    let fallbackText = `🎃🦇 *[ SHADOW GARDEN • EQUIPO DE CREADORES ]* 🦇🎃\n\n`;
    for (const c of creators) {
      fallbackText += `👑 *${c.name}* — ${c.role}\n`;
      fallbackText += `» 📱 *WhatsApp:* https://wa.me/${c.number}\n`;
      fallbackText += `» 📢 *Canal:* ${c.btnUrl}\n\n`;
    }
    fallbackText += `📦 *Repositorio:* https://github.com/yosue891/SHADOW-BOT-MD.git\n`;
    fallbackText += `\n> ☾ Si encuentras algún error o falla, no olvides reportarlo a cualquiera de nosotros.`;

    await conn.sendMessage(m.chat, {
      text: fallbackText,
      contextInfo: {
        ...(global.rcanal?.contextInfo || {})
      }
    }, { quoted: m });
  }
}

handler.tags = ["main"]
handler.help = ["owner"]
handler.command = /^(owner|creators|creadores|owners|desarrolladores)$/i

export default handler
