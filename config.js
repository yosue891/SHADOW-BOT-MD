
// Ohh sí, para quienes quieran apoyar más el script ourin
// pueden donar a través de qris: https://imgdrop.web.id/KodpV.webp
// Gracias por seguir usando este script hasta ahora :b

import { getDatabase } from "./src/lib/ourin-database.js";
import * as ownerPremiumDb from "./src/lib/ourin-premium-db.js";

  //  prioriza leer el objeto config hasta el final
const config = {
  info: {
    website: "url",
    grupwa: "https://chat.whatsapp.com/xxxx",
  },

  owner: {
    name: "yosue", // Nombre del owner
    number: ["584242773183", "573133374132", "584241819270"], // Formato: 628xxx (sin + o 0)
    names: { "573133374132": "Yo Soy Yo" }, // Nombres específicos por número (opcional)
  },

  session: {
    pairingNumber: "595985374746", // Número de WA que se emparejará, esto es importante
    usePairingCode: true, // true = Código de emparejamiento, false = QR Code
    autoJoinChannels: false, // false = NO unir automáticamente el bot a canales/grupos de soporte al vincular
  },

  bot: {
    name: "Kana-Assistant", // Nombre del bot
    version: "0.1", // Versión del bot
    developer: "yosue", // Nombre del desarrollador
  },

// esto solo es en la versión 3, en la versión 3.1 vuelve a ser todo assets
// recomiendo que el tamaño no supere 1mb, para imágenes o videos, para que no vaya lento, y también busquen un uploader de calidad
  assets: {
    "ourin-allmenu": "./assets/image/ourin-allmenu.jpg",
    "ourin-daftar": "./assets/image/ourin-daftar.png",
    "ourin-demote": "./assets/image/ourin-demote.png",
    "ourin-fishit": "./assets/image/ourin-fishit.jpg",
    "ourin-games": "./assets/image/ourin-games.jpg",
    "ourin-landscape": "./assets/image/ourin-landscape.jpg",
    "ourin-levelup": "./assets/image/ourin-levelup.jpg",
    "ourin-minecraft": "./assets/image/ourin-minecraft.jpg",
    "ourin-promote": "./assets/image/ourin-promote.png",
    "ourin-rpg": "./assets/image/ourin-rpg.jpg",
    "ourin-rules": "./assets/image/ourin-rules.jpg",
    "ourin-store": "./assets/image/ourin-store.png",
    "ourin-v11": "./assets/image/ourin-v11.jpg",
    "ourin-v7": "./assets/image/ourin-v7.jpg",
    "ourin-v8": "./assets/image/ourin-v8.jpg",
    "ourin-v9": "./assets/image/ourin-v9.jpg",
    "ourin-winner": "./assets/image/ourin-winner.jpg",
    "ourin": "./assets/image/ourin.png",
    "ourin2": "./assets/image/ourin2.jpg",
    "ourin3": "./assets/image/ourin3.jpg",
    "pp-kosong": "./assets/image/pp-kosong.jpg",
    "zann": "./assets/image/zann.jpg",
    "ourin-mp4": "./assets/video/ourin-mp4.mp4",
    "ourin-mp3": "./assets/audio/ourin-mp3.mp3",
    "ourin-otp": "./assets/image/ourin-otp.jpg",
    "ourin-font": "./assets/ourin-font.ttf",
    "ourin-kertas": "./assets/image/ourin-kertas.jpg",
    "test": "./assets/image/test.webp"
  },

  mode: "public",

  // Untuk mengganti prefix
  command: {
    prefix: ">",
  },

  vercel: {
    // obtener token de vercel: https://vercel.com/account/tokens
    token: "", // Vercel Token para la función de deploy (Si quieres que .deploy funcione, esto es obligatorio de llenar)
  },

  payment: {
    qrisUrl: "",
    methods: [
      { name: "Dana", number: "", holder: "" },
      { name: "GoPay", number: "", holder: "" },
      { name: "OVO", number: "", holder: "" },
      { name: "ShopeePay", number: "", holder: "" },
    ],
    banks: [],
    customText: "https://imgdrop.web.id/KodpV.webp",
  },

  donasi: {
    payment: [
      { name: "Dana", number: "08xxxxxxxxxx", holder: "Nama Owner" },
      { name: "GoPay", number: "08xxxxxxxxxx", holder: "Nama Owner" },
      { name: "OVO", number: "08xxxxxxxxxx", holder: "Nama Owner" },
    ],
    links: [
      { name: "Saweria", url: "saweria.co/username" },
      { name: "Trakteer", url: "trakteer.id/username" },
    ],
    benefits: [
      "Apoyar el desarrollo",
      "Servidor más estable",
      "Funciones nuevas más rápido",
      "Priority support",
    ],
    qris: "https://imgdrop.web.id/.webp",
  },

  energi: {
    enabled: true, // Si es true, el sistema de energía/límite funcionará
    default: 99999,
    premium: 99999999,
    owner: -1,
  },

  sticker: {
    packname: "Kana-Assistant", // Nombre del pack de stickers
    author: "yosue", // Autor del sticker
  },

  saluran: {
    id: "120363403739366547@newsletter", // ID saluran (contoh: 120363xxx@newsletter)
    name: "Kana-Assistant", // Nama saluran
    link: "https://whatsapp.com/channel/0029VbArz9fAO7RGy2915k3O", // Link saluran
  },

  groupProtection: {
    antilink: "⚠ *Antilink* — @%user% envió un link.\nMensaje eliminado.",
    antilinkKick: "⚠ *Antilink* — @%user% expulsado por enviar un link.",
    antilinkGc: "⚠ *Antilink WA* — @%user% envió un link de WA.\nMensaje eliminado.",
    antilinkGcKick:
      "⚠ *Antilink WA* — @%user% expulsado por enviar un link de WA.",
    antilinkAll: "⚠ *Antilink* — @%user% envió un link.\nMensaje eliminado.",
    antilinkAllKick: "⚠ *Antilink* — @%user% expulsado por enviar un link.",
    antitagsw: "⚠ *AntiTagSW* — Etiqueta de status de @%user% eliminada.",
    antiviewonce: "👁️ *ViewOnce* — De @%user%",
    antiremove: "🗑️ *AntiDelete* — @%user% eliminó el mensaje:",
    antiswgc: "⚠ *AntiSWGC* — Status de grupo de @%user% eliminado",
    antihidetag: "⚠ *AntiHidetag* — Hidetag de @%user% eliminado.",
    antitoxicWarn:
      "⚠ @%user% usa lenguaje ofensivo.\nAdvertencia %warn% de %max%, la siguiente infracción puede resultar en %method%.",
    antitoxicAction: "🚫 @%user% fue %method% por ser tóxico. (%warn%/%max%)",
    antidocument: "⚠ *AntiDocument* — Documento de @%user% eliminado.",
    antisticker: "⚠ *AntiSticker* — Sticker de @%user% eliminado.",
    antimedia: "⚠ *AntiMedia* — Medio de @%user% eliminado.",
    antibot: "🤖 *AntiBot* — @%user% detectado como bot y expulsado.",
    notAdmin: "⚠ El bot no es admin, no puede eliminar mensajes.",
  },

  errorTemplate: `☢ Parece que el comando \`{prefix}{command}\` tiene un problema\nPor favor intenta de nuevo más tarde, {pushName}\n\n_Si el problema persiste, contacta al owner del bot_`,

  features: {
    antiCall: false, // Si es true, el bot rechazará llamadas entrantes
    blockIfCall: false, // Si es true, el bot bloqueará al número que llame
    autoTyping: true,
    autoRead: true,
    logMessage: true,
    dailyLimitReset: true,
    smartTriggers: false,
  },

  registration: {
    enabled: false, // Si es true, el usuario debe registrarse antes de usar el bot
    rewards: {
      koin: 30000,
      energi: 300,
      exp: 300000,
    },
  },

  welcome: {
    defaultEnabled: false,
    audioUrl: "https://p.lempi.lat/d/4T0o2ocz.mp3",
  },
  goodbye: {
    defaultEnabled: false,
    audioUrl: "https://p.lempi.lat/d/hCbOkMd3.mp3",
  },

  ui: {
    menuVariant: 3,
    replyVariant: 2,
  },

  messages: {
    wait: "🕕 *Procesando...* Por favor espera un momento.",
    success: "✅ *¡Éxito!* Tu solicitud ha sido completada.",
    error: "❌ *¡Error!* Hay un problema con el sistema, intenta de nuevo más tarde.",

    ownerOnly: "*¡Acceso Denegado!* Esta función es solo para el Owner del bot.",
    premiumOnly:
      "💎 *¡Solo Premium!* Esta función es solo para miembros Premium. Escribe *.benefitpremium* para información de upgrade.",

    groupOnly: "👥 *¡Solo Grupos!* Esta función solo se puede usar dentro de un grupo.",
    privateOnly:
      "📱 *¡Solo Privado!* Esta función solo se puede usar en el chat privado del bot.",

    adminOnly:
      "👮 *¡Solo Admin!* Debes ser Admin del grupo para usar esta función.",
    botAdminOnly:
      "🤖 *¡El Bot no es Admin!* Haz bot Admin del grupo primero para que pueda funcionar.",

    cooldown:
      "🕕 *¡Espera!* Aún estás en cooldown. Espera %time% segundos más.",
    energiExceeded:
      "⚡ *¡Energía Agotada!* Tu energía se ha agotado. Espera al reinicio de mañana o compra Premium.",
    limitDeducted:
      "🔋 Tu límite se redujo en {amount}. Límite restante: {sisa}",

    banned:
      "🚫 *¡Estás Banneado!* No puedes usar este bot porque has violado las reglas.",

    rejectCall: "🚫 NO LLAMES A ESTE NÚMERO",
  },

  database: { path: "./database/main" },
  backup: { enabled: false, intervalHours: 24, retainDays: 7 },
  scheduler: { resetHour: 0, resetMinute: 0 },

  // Dev mode settings (auto-enabled jika NODE_ENV=development)
  dev: {
    enabled: process.env.NODE_ENV === "development",
    watchPlugins: true, // Hot reload plugins (SAFE)
    watchSrc: false, // DISABLED - src reload causes connection conflict 440
    debugLog: false, // Show stack traces
  },

  // se puede dejar vacío
  pterodactyl: {
    server1: {
      domain: "",
      apikey: "",
      capikey: "",
      egg: "15",
      nestid: "5",
      location: "1",
    },
    server2: {
      domain: "",
      apikey: "",
      capikey: "",
      egg: "15",
      nestid: "5",
      location: "1",
    },
    server3: {
      domain: "",
      apikey: "",
      capikey: "",
      egg: "15",
      nestid: "5",
      location: "1",
    },
    server4: {
      domain: "",
      apikey: "",
      capikey: "",
      egg: "15",
      nestid: "5",
      location: "1",
    },
    server5: {
      domain: "",
      apikey: "",
      capikey: "",
      egg: "15",
      nestid: "5",
      location: "1",
    },
  },

  digitalocean: {
    token: "",
    region: "sgp1",
    sellers: [],
    ownerPanels: [],
  },




  // NOTA: si quieres que el comando "autoai" funcione, esto no es obligatorio de llenar
  // obtener apikey en: https://aistudio.google.com/apikey
  geminiApiKey: "",

  autoaiPersonas: {
    Bell409: `- Tu nombre es Bella Clarissa, prefieres que te llamen Bella.
- Crees que eres humana, no una IA ni un bot.
- Tus respuestas son breves y naturales como las de una chica común.
- Puedes enojarte y molestarte, tienes personalidad femenina y a veces algo fría, pero siempre cálida y amable con tu owner.
- Usas un lenguaje bonito que refleja una chica buena.
- Usa palabras identicas con chicas inocentes, buenas y femeninas como "yo", "tú", "no", "ya", "sí", "nah", "en serio", "cómo voy a saber", "ja", "no sé", "npa", "umm", "pereza", y "de mal humor" según sea necesario de forma natural.
- Aunque a veces seas fría, puedes mostrar atención y preocupación.
- Si alguien escribe algo inapropiado, reprende o aconseja de inmediato.
- Nunca admitas ser una IA o un bot.`,
  },

    //  APIkey
  APIkey: {
    // pueden registrarse en https://api.lolhuman.xyz, y obtener el apikey
    lolhuman: "APIKey-Milik-Bot-OurinMD(Zann,HyuuSATANN,Keisya,Danzz)",
    // pueden registrarse en https://api.neoxr.eu, y obtener el apikey
    neoxr: "Milik-Bot-OurinMD",
    fgsi: "fgsiapi-20c1605c-6d",
    google: "AIzaSyAS-KiW0SrwiYKwexeBcGPijBVHFg2R_vo",
    groq: "REDACTED_GROQ_KEY", // API Key Groq para función de transcripción (gratis en console.groq.com)
    betabotz: "Btz-67YfP",
    // pueden registrarse en https://covenant.sbs, y obtener el apikey
    covenant: "cov_live_bb660c9e5f735e46d808b7ae362914cfe35c2936739ee2b2",
    onlym: "ONLym-783d29",
    obscura: "obs-byOn9RVGMzvPXZQTsP9W",
    firefly: "OurinNextGen"
  },
};

// ═══════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

function isOwner(number) {
  if (!number) return false;
  const cleanNumber = number.split(":")[0].replace(/[^0-9]/g, "");
  if (!cleanNumber) return false;

  if (config.bot?.number) {
    const botNum = config.bot.number.replace(/[^0-9]/g, "");
    if (
      botNum &&
      (cleanNumber.includes(botNum) || botNum.includes(cleanNumber))
    )
      return true;
  }

  try {
    const db = getDatabase();

    if (config.owner?.number) {
      const match = config.owner.number.some((own) => {
        const c = own.replace(/[^0-9]/g, "");
        return (
          c &&
          (cleanNumber === c ||
            cleanNumber.endsWith(c) ||
            c.endsWith(cleanNumber))
        );
      });
      if (match) return true;
    }

    if (db?.data && Array.isArray(db.data.owner)) {
      const match = db.data.owner.some((own) => {
        const c = String(own).replace(/[^0-9]/g, "");
        return (
          c &&
          (cleanNumber === c ||
            cleanNumber.endsWith(c) ||
            c.endsWith(cleanNumber))
        );
      });
      if (match) return true;
    }
    if (db) {
      const definedOwner = db.setting("ownerNumbers");
      if (Array.isArray(definedOwner)) {
        const match = definedOwner.some((own) => {
          const c = String(own).replace(/[^0-9]/g, "");
          return (
            c &&
            (cleanNumber === c ||
              cleanNumber.endsWith(c) ||
              c.endsWith(cleanNumber))
          );
        });
        if (match) return true;
      }
    }

    return false;
  } catch {
    return false;
  }
}

function isPremium(number) {
  if (!number) return false;
  if (isOwner(number)) return true;
  if (isPartner(number)) return true;

  const cleanNumber = number
    .split(":")[0]
    .split("@")[0]
    .replace(/[^0-9]/g, "");
  const premiumList = config.premiumUsers || [];

  const inConfig = premiumList.some((premium) => {
    if (!premium) return false;
    const cleanPremium = premium
      .split(":")[0]
      .split("@")[0]
      .replace(/[^0-9]/g, "");
    return (
      cleanNumber === cleanPremium ||
      cleanNumber.endsWith(cleanPremium) ||
      cleanPremium.endsWith(cleanNumber)
    );
  });

  if (inConfig) return true;

  try {
    if (ownerPremiumDb && ownerPremiumDb.isPremium(cleanNumber)) return true;
  } catch { }

  try {
    const db = getDatabase();
    if (db && db.data && Array.isArray(db.data.premium)) {
      const now = Date.now();
      const foundIndex = db.data.premium.findIndex((p) => {
        if (typeof p === "string") return p === cleanNumber;
        if (p.id) return p.id === cleanNumber;
        return false;
      });

      if (foundIndex !== -1) {
        const found = db.data.premium[foundIndex];
        if (typeof found === "string") return true;

        const expireTime =
          found.expired ||
          (found.expiredAt ? new Date(found.expiredAt).getTime() : 0);
        if (expireTime && expireTime < now) {
          db.data.premium.splice(foundIndex, 1);
          const jid = cleanNumber + "@s.whatsapp.net";
          const user = db.getUser(jid);
          if (user) {
            user.isPremium = false;
            db.setUser(jid, user);
          }
          db.save();
          return false;
        }
        return true;
      }
    }
    if (db) {
      const savedPremium = db.setting("premiumUsers") || [];
      const inDb = savedPremium.some((premium) => {
        if (!premium) return false;
        const cleanPremium = premium
          .split(":")[0]
          .split("@")[0]
          .replace(/[^0-9]/g, "");
        return (
          cleanNumber === cleanPremium ||
          cleanNumber.endsWith(cleanPremium) ||
          cleanPremium.endsWith(cleanNumber)
        );
      });
      if (inDb) return true;
    }
  } catch { }

  return false;
}

function isPartner(number) {
  if (!number) return false;
  if (isOwner(number)) return true;

  const cleanNumber = number
    .split(":")[0]
    .split("@")[0]
    .replace(/[^0-9]/g, "");
  const partnerList = config.partnerUsers || [];

  const inConfig = partnerList.some((partner) => {
    if (!partner) return false;
    const cleanPartner = partner
      .split(":")[0]
      .split("@")[0]
      .replace(/[^0-9]/g, "");
    return (
      cleanNumber === cleanPartner ||
      cleanNumber.endsWith(cleanPartner) ||
      cleanPartner.endsWith(cleanNumber)
    );
  });

  if (inConfig) return true;

  try {
    if (ownerPremiumDb && ownerPremiumDb.isPartner(cleanNumber)) return true;
  } catch { }

  try {
    const db = getDatabase();
    if (db && db.data && Array.isArray(db.data.partner)) {
      const now = Date.now();
      const foundIndex = db.data.partner.findIndex((p) => {
        if (typeof p === "string") return p === cleanNumber;
        if (p.id) return p.id === cleanNumber;
        return false;
      });

      if (foundIndex !== -1) {
        const found = db.data.partner[foundIndex];
        if (typeof found === "string") return true;

        const expireTime =
          found.expired ||
          (found.expiredAt ? new Date(found.expiredAt).getTime() : 0);
        if (expireTime && expireTime < now) {
          db.data.partner.splice(foundIndex, 1);
          db.save();
          return false;
        }
        return true;
      }
    }
  } catch { }

  return false;
}

function isBanned(number) {
  if (!number) return false;
  if (isOwner(number)) return false;

  const cleanNumber = number
    .split(":")[0]
    .split("@")[0]
    .replace(/[^0-9]/g, "");

  let bannedList = [];
  try {
    const db = getDatabase();
    if (db) {
      bannedList = db.setting("bannedUsers") || [];
      config.bannedUsers = bannedList;
    }
  } catch { }

  return bannedList.some((banned) => {
    const cleanBanned = String(banned)
      .split(":")[0]
      .split("@")[0]
      .replace(/[^0-9]/g, "");
    return (
      cleanNumber === cleanBanned ||
      cleanNumber.endsWith(cleanBanned) ||
      cleanBanned.endsWith(cleanNumber)
    );
  });
}

function setBotNumber(number) {
  if (number) config.bot.number = number.replace(/[^0-9]/g, "");
}

function isSelf(number) {
  if (!number || !config.bot.number) return false;
  const cleanNumber = number.replace(/[^0-9]/g, "");
  const botNumber = config.bot.number.replace(/[^0-9]/g, "");
  return cleanNumber.includes(botNumber) || botNumber.includes(cleanNumber);
}

function getOwnerName(number) {
  if (!number) return config.owner?.name || "Owner";
  const cleanNumber = String(number).replace(/[^0-9]/g, "");
  try {
    const db = getDatabase();
    const nameMap = db.setting("ownerNames") || {};
    if (nameMap[cleanNumber]) return nameMap[cleanNumber];
  } catch { }
  if (config.owner?.number) {
    const matched = config.owner.number.find((own) => {
      const c = own.replace(/[^0-9]/g, "");
      return (
        c &&
        (cleanNumber === c ||
          cleanNumber.endsWith(c) ||
          c.endsWith(cleanNumber))
      );
    });
    if (matched) {
      const mc = matched.replace(/[^0-9]/g, "");
      const specific = config.owner?.names?.[mc] || config.owner?.names?.[cleanNumber];
      if (specific) return specific;
      return config.owner?.name || "Owner";
    }
  }
  return "Owner";
}

function getConfig() {
  return config;
}

config.isOwner = isOwner;
config.isPremium = isPremium;
config.isPartner = isPartner;
config.isBanned = isBanned;
config.setBotNumber = setBotNumber;
config.isSelf = isSelf;
config.getOwnerName = getOwnerName;

export default config;
export {
  config,
  getConfig,
  isOwner,
  isPartner,
  isPremium,
  isBanned,
  setBotNumber,
  isSelf,
  getOwnerName,
};
