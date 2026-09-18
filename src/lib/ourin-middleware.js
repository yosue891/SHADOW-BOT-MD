import config from "../../config.js";
import { getDatabase } from "./ourin-database.js";
function levenshtein(a, b) {
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;
  const matrix = [];
  for (let i = 0; i <= b.length; i++) matrix[i] = [i];
  for (let j = 0; j <= a.length; j++) matrix[0][j] = j;
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      const cost = a[j - 1] === b[i - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost,
      );
    }
  }
  return matrix[b.length][a.length];
}

function formatAfkDuration(ms) {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days} días ${hours % 24} horas`;
  if (hours > 0) return `${hours} horas ${minutes % 60} minutos`;
  if (minutes > 0) return `${minutes} minutos`;
  return `${seconds} segundos`;
}

function checkPermission(m, pluginConfig) {
  const db = getDatabase();
  const user = db.getUser(m.sender) || {};
  let hasAccess = false;
  if (user.access && m.command) {
    const accessFound = user.access.find(
      (a) => a.cmd === m.command.toLowerCase(),
    );
    if (accessFound) {
      if (accessFound.expired === null || accessFound.expired > Date.now()) {
        hasAccess = true;
      } else {
        user.access = user.access.filter(
          (a) => a.cmd !== m.command.toLowerCase(),
        );
        db.setUser(m.sender, user);
      }
    }
  }

  if (pluginConfig.isOwner && !m.isOwner && !hasAccess) {
    return {
      allowed: false,
      reason: config.messages?.ownerOnly || "🚫 ¡Solo Owner!",
    };
  }

  if (pluginConfig.isPartner && !m.isPartner && !m.isOwner && !hasAccess) {
    return { allowed: false, reason: "🤝 ¡Solo Partner!" };
  }

  if (
    pluginConfig.isPremium &&
    !m.isPremium &&
    !m.isOwner &&
    !m.isPartner &&
    !hasAccess
  ) {
    return {
      allowed: false,
      reason: config.messages?.premiumOnly || "💎 ¡Solo Premium!",
    };
  }

  if (pluginConfig.isGroup && !m.isGroup) {
    return {
      allowed: false,
      reason: config.messages?.groupOnly || "👥 ¡Solo Grupos!",
    };
  }

  if (pluginConfig.isPrivate && m.isGroup) {
    return {
      allowed: false,
      reason: config.messages?.privateOnly || "📱 ¡Solo chat privado!",
    };
  }

  if (
    pluginConfig.isAdmin &&
    m.isGroup &&
    !m.isAdmin &&
    !m.isOwner &&
    !hasAccess
  ) {
    return {
      allowed: false,
      reason: config.messages?.adminOnly || "👮 ¡Solo Admin del grupo!",
    };
  }

  if (pluginConfig.isBotAdmin && m.isGroup && !m.isBotAdmin) {
    /* El owner nunca queda bloqueado por este check: si el bot no es admin
     * de verdad, la propia llamada a la API (groupSettingUpdate) fallará y
     * lo reportará. Para el resto, diagnóstico en log. */
    if (!m.isOwner) {
      console.warn(
        `[middleware] "${m.command}" bloqueado: isBotAdmin=false | grupo=${m.chat} | members=${m.groupMembers?.length} | admins=${(m.groupAdmins || []).length} | bot=${m._botNumber || "?"} | metaErr=${m.groupMetadataError || "none"}`,
      );
      return {
        allowed: false,
        reason:
          config.messages?.botAdminOnly || "🤖 ¡El bot debe ser admin del grupo!",
      };
    }
  }

  return { allowed: true, reason: "" };
}

function checkMode(m, getActiveJadibots) {
  const db = getDatabase();
  const dbMode = db.setting("botMode");
  const mode = dbMode || config.config?.mode || config.mode || "public";

  const onlyGc = db.setting("onlyGc");
  const onlyPc = db.setting("onlyPc");
  const selfAdmin = db.setting("selfAdmin");
  const publicAdmin = db.setting("publicAdmin");
  const botAfk = db.setting("botAfk");

  if (botAfk && botAfk.active) {
    if (m.fromMe || m.isOwner) {
      return { allowed: true };
    }
    const duration = formatAfkDuration(Date.now() - botAfk.since);
    return {
      allowed: false,
      isAfk: true,
      afkMessage:
        `💤 *ʙᴏᴛ ᴇsᴛᴀ ᴀꜰᴋ*\n\n` +
        `╭┈┈⬡「 📋 *ɪɴꜰᴏ* 」\n` +
        `┃ 📝 ᴍᴏᴛɪᴠᴏ: \`${botAfk.reason || "AFK"}\`\n` +
        `┃ ⏱️ ᴅᴇsᴅᴇ: \`${duration}\` atrás\n` +
        `╰┈┈⬡\n\n` +
        `> El bot no puede recibir comandos en este momento\n` +
        `> Por favor espera a que el owner lo active de nuevo`,
    };
  }

  if (onlyGc && !m.isGroup && !m.isOwner) return { allowed: false };
  if (onlyPc && m.isGroup && !m.isOwner) return { allowed: false };

  const onlyThisGroup = db.setting("onlyThisGroup");
  if (onlyThisGroup && m.isGroup && !m.isOwner) {
    if (typeof onlyThisGroup === "string" && m.chat !== onlyThisGroup) {
      return { allowed: false };
    } else if (typeof onlyThisGroup === "object" && m.chat !== onlyThisGroup.jid) {
      return {
        allowed: false,
        isOnlyThisGroup: true,
        onlyThisGroupMessage:
          `🔒 *Acceso Denegado*\n\n` +
          `Lo sentimos, actualmente nuestro bot solo está disponible de forma exclusiva en el Grupo Principal (*${onlyThisGroup.name}*).\n\n` +
          `Por favor únete a nuestro grupo principal a través del siguiente enlace:\n` +
          `🔗 ${onlyThisGroup.link}\n\n` +
          `Una vez que te unas, podrás usar todas las funciones del bot. ¡Gracias!`
      };
    }
  }

  const selfGroups = db.setting("selfGroups") || [];
  if (m.isGroup && selfGroups.includes(m.chat)) {
    if (m.fromMe) return { allowed: true };
    if (m.isOwner) return { allowed: true };
    return { allowed: false, isSelfGroup: true };
  }

  const publicGroups = db.setting("publicGroups") || [];
  if (m.isGroup && publicGroups.includes(m.chat)) {
    return { allowed: true };
  }

  if (mode === "self") {
    if (m.fromMe) return { allowed: true };
    if (m.isOwner) return { allowed: true };

    const activeJadibots = getActiveJadibots();
    if (activeJadibots.length > 0) {
      let jadibotList = "";
      activeJadibots.forEach((jb, i) => {
        jadibotList += `┃ ${i + 1}. @${jb.id}\n`;
      });
      const mentions = activeJadibots.map((jb) => jb.id + "@s.whatsapp.net");
      return {
        allowed: false,
        hasJadibots: true,
        jadibotMessage:
          `🤖 *ᴍᴏᴅᴏ ᴘʀɪᴠᴀᴅᴏ*\n\n` +
          `El bot principal está en modo privado.\n` +
          `Puedes usar nuestros bots derivados:\n\n` +
          `╭┈┈⬡「 📱 *ʙᴏᴛ ᴅɪsᴘᴏɴɪʙʟᴇs* 」\n` +
          `${jadibotList}` +
          `╰┈┈⬡\n\n` +
          `> Elige uno de los bots de arriba para acceder a las funciones.`,
        jadibotMentions: mentions,
      };
    }

    return { allowed: false };
  }

  if (mode === "public") {
    const onlyAdmin = db.setting("onlyAdmin");

    if (onlyAdmin) {
      if (m.fromMe || m.isOwner) return { allowed: true };
      if (!m.isGroup) return { allowed: true };
      if (m.isGroup && m.isAdmin) return { allowed: true };
      return { allowed: false };
    }

    if (selfAdmin) {
      if (m.fromMe || m.isOwner) return { allowed: true };
      if (m.isGroup && m.isAdmin) return { allowed: true };
      return { allowed: false };
    }

    if (publicAdmin) {
      if (m.fromMe || m.isOwner) return { allowed: true };
      if (!m.isGroup) return { allowed: true };
      if (m.isGroup && m.isAdmin) return { allowed: true };
      return { allowed: false };
    }

    return { allowed: true };
  }

  return { allowed: true };
}

export { levenshtein, formatAfkDuration, checkPermission, checkMode };
