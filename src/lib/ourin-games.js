import {
  getRandomItem,
  createSession,
  getSession,
  endSession,
  checkAnswerAdvanced,
  getHint,
  hasActiveSession,
  setSessionTimer,
  getRemainingTime,
  formatRemainingTime,
  isSurrender,
  isReplyToGame,
  getRandomReward,
  getProgressiveHint,
} from "./ourin-game-data.js";
import { getDatabase } from "./ourin-database.js";
import { addExpWithLevelCheck } from "./ourin-level.js";
import {
  getGameContextInfo,
  sendGamePreview,
  checkFastAnswer,
} from "./ourin-context.js";
let fetchBuffer;
try {
  fetchBuffer = (await import("./ourin-utils.js")).fetchBuffer;
} catch {}

const WIN_MESSAGES = [
  "🌟 *¡GG WP! ¡Cerebro brillante!*",
  "✨ *¡Súper genial! ¡Eres muy listo!*",
  "🎉 *¡INCREÍBLE! ¡Respuesta perfecta!*",
  "💫 *¡ÉPICO! ¡No tiene rival!*",
  "🏆 *¡BRUTAL! ¡Tu cerebro es como Google!*",
  "🔥 *¡LEGENDARIO! ¡Respondes sin esfuerzo!*",
];

const TIMEOUT_MESSAGES = [
  "⏱️ *¡Uy, se te pasó el tiempo!*",
  "⏱️ *¡TIEMPO AGOTADO!*",
  "⏱️ *¡Muy lento, el tiempo se acabó!*",
];

const SURRENDER_MESSAGES = [
  "🏳️ *Bueno, me rindo...*",
  "🏳️ *¡ME RINDO!*",
  "🏳️ *Qué lástima, me rindo...*",
];

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

class OurinGames {
  constructor() {
    this.registry = new Map();
  }

  register(gameType, cfg) {
    const defaults = {
      dataFile: `${gameType}.json`,
      questionField: "soal",
      answerField: "jawaban",
      emoji: "🎮",
      title: gameType.toUpperCase(),
      description: `Game ${gameType}`,
      timeout: 60000,
      cooldown: 5,
      hasImage: false,
      imageField: "img",
      alias: [],
      hintCount: 2,
    };
    this.registry.set(gameType, { ...defaults, ...cfg, gameType });
  }

  get(gameType) {
    return this.registry.get(gameType);
  }

  createHandler(gameType) {
    const cfg = this.registry.get(gameType);
    if (!cfg) throw new Error(`Game "${gameType}" not registered`);

    const handler = async (m, { sock }) => {
      const chatId = m.chat;

      if (hasActiveSession(chatId)) {
        const session = getSession(chatId);
        if (session && session.gameType === gameType) {
          const remaining = getRemainingTime(chatId);
          const answer = session.question[cfg.answerField];
          let text = `⚠️ *¡Hay un juego en curso, responde primero!*\n\n`;
          if (cfg.questionField && session.question[cfg.questionField]) {
            text += `\`\`\`${session.question[cfg.questionField]}\`\`\`\n\n`;
          }
          text += `💡 Hint: *${getHint(answer, cfg.hintCount)}*\n`;
          text += `⏱️ Restante: *${formatRemainingTime(remaining)}*\n\n`;
          text += `_Responde directamente o escribe "rendirse"\nCada error, la pista aumentará_`;
          await m.reply(text);
          return;
        }
      }

      const question = getRandomItem(cfg.dataFile);
      if (!question) {
        await m.reply(
          "❌ *ᴅᴀᴛᴏs ɴᴏ ᴅɪsᴘᴏɴɪʙʟᴇs*\n\n> ¡Los datos del juego no están disponibles!",
        );
        return;
      }

      const answer = question[cfg.answerField];
      let sentMsg;

      if (cfg.hasImage && fetchBuffer) {
        let imageBuffer;
        try {
          imageBuffer = await fetchBuffer(question[cfg.imageField]);
        } catch {
          await m.reply("❌ *ᴇʀʀᴏʀ ᴀʟ ᴄᴀʀɢᴀʀ ɪᴍᴀᴄᴇɴ*\n\n> ¡Inténtalo de nuevo más tarde!");
          return;
        }

        let caption = `${cfg.emoji} *${cfg.title}*\n\n`;
        if (cfg.questionField && question[cfg.questionField]) {
          caption += `> ${question[cfg.questionField]}\n`;
        }
        caption += `💡 Hint: *${getHint(answer, cfg.hintCount)}*\n`;
        caption += `⏱️ Tiempo: *${cfg.timeout / 1000} segundos*\n`;
        caption += `🎁 Premio: *Límite, Monedas, EXP (aleatorio)*\n\n`;
        caption += `_Responde directamente o escribe "rendirse"\nCada error, la pista aumentará_`;

        sentMsg = await sock.sendMessage(
          chatId,
          {
            image: imageBuffer,
            caption,
            contextInfo: getGameContextInfo(),
          },
          { quoted: m },
        );
      } else {
        let text = `${cfg.emoji} *${cfg.title}*\n\n`;
        if (cfg.questionField && question[cfg.questionField]) {
          text += `\`\`\`${question[cfg.questionField]}\`\`\`\n\n`;
        }
        text += `💡 Hint: *${getHint(answer, cfg.hintCount)}*\n`;
        text += `⏱️ Tiempo: *${cfg.timeout / 1000} segundos*\n`;
        text += `🎁 Premio: *Límite, Monedas, EXP (aleatorio)*\n\n`;
        text += `_Responde directamente o escribe "rendirse"\nCada error, la pista aumentará_`;

        sentMsg = await sendGamePreview(
          sock,
          chatId,
          text,
          `${cfg.emoji} ${cfg.title}`,
          "¡Responde la pregunta!",
          { quoted: m },
        );
      }

      createSession(chatId, gameType, question, sentMsg.key, cfg.timeout);

      setSessionTimer(chatId, async () => {
        let text = `${pick(TIMEOUT_MESSAGES)}\n\n`;
        text += `Respuesta: *${answer}*\n\n`;
        text += `_Nadie pudo responder~_`;
        await m.reply(text);
      });
    };

    const answerHandler = async (m, sock) => {
      const chatId = m.chat;
      const session = getSession(chatId);

      if (!session || session.gameType !== gameType) return false;

      const userAnswer = (m.body || "").trim();
      if (!userAnswer || userAnswer.startsWith(".")) return false;

      if (isSurrender(userAnswer)) {
        endSession(chatId);
        const answer = session.question[cfg.answerField];
        let text = `${pick(SURRENDER_MESSAGES)}\n\n`;
        text += `Respuesta: *${answer}*\n\n`;
        text += `_@${m.sender.split("@")[0]} se rindió_`;
        await m.reply(text, { mentions: [m.sender] });
        return true;
      }

      if (!isReplyToGame(m, session)) return false;

      session.attempts++;

      const answer = session.question[cfg.answerField];
      const result = checkAnswerAdvanced(answer, userAnswer);

      if (result.status === "correct") {
        endSession(chatId);

        const db = getDatabase();
        const user = db.getUser(m.sender);

        let totalLimit = 0;
        let totalBalance = 0;
        let totalExp = 0;

        if (cfg.rewards === false || cfg.rewards === null) {
          // umm, maaf yak, kalau sc ini banyak kurangnya
        } else if (cfg.rewards) {
          totalLimit = cfg.rewards.limit || cfg.rewards.energi || 0;
          totalBalance = cfg.rewards.koin || cfg.rewards.balance || 0;
          totalExp = cfg.rewards.exp || 0;
        } else {
          const reward = getRandomReward();
          totalLimit = reward.limit;
          totalBalance = reward.koin;
          totalExp = reward.exp;
        }

        let bonusText = "";

        const fastResult = checkFastAnswer(session);
        if (
          fastResult.isFast &&
          cfg.rewards !== false &&
          cfg.rewards !== null
        ) {
          totalLimit += fastResult.bonus.limit;
          totalBalance += fastResult.bonus.koin;
          totalExp += fastResult.bonus.exp;
           bonusText = `\n\n${fastResult.praise}\n⚡ *BONUS RÁPIDO:* +${fastResult.bonus.limit} Límite, +${fastResult.bonus.koin} Monedas\n⏱️ Tiempo: *${(fastResult.elapsed / 1000).toFixed(1)}s*`;
        }

        if (totalLimit > 0) db.updateEnergi(m.sender, totalLimit);
        if (totalBalance > 0) db.updateKoin(m.sender, totalBalance);

        if (totalExp > 0) {
          if (!user.rpg) user.rpg = {};
          await addExpWithLevelCheck(sock, m, db, user, totalExp);
        }
        db.save();

        let text = `${pick(WIN_MESSAGES)}\n\n`;
        text += `Respuesta: *${answer}*\n`;
        text += `Ganador: *@${m.sender.split("@")[0]}*\n`;
        text += `Intentos: *${session.attempts}x*\n\n`;

        if (totalLimit > 0 || totalBalance > 0 || totalExp > 0) {
          let parts = [];
          if (totalLimit > 0) parts.push(`+${totalLimit} Límite`);
          if (totalBalance > 0) parts.push(`+${totalBalance} Monedas`);
          if (totalExp > 0) parts.push(`+${totalExp} EXP`);
          text += `🎁 ${parts.join(", ")}`;
        }
        text += bonusText;

        await m.reply(text, { mentions: [m.sender] });
        return true;
      }

      if (result.status === "close") {
        const remaining = getRemainingTime(chatId);
        const percent = Math.round(result.similarity * 100);
        await m.react("🔥");
        await m.reply(
          `🔥 *¡Casi!* Tu respuesta es *${percent}%* similar!\n_Tiempo restante: *${formatRemainingTime(remaining)}*_`,
        );
        return false;
      }

      const remaining = getRemainingTime(chatId);
      if (remaining > 0 && session.attempts < 10) {
        await m.react("❌");
        const hint = getProgressiveHint(answer, session.attempts);
        await m.reply(
          `❌ ¡Aún no es correcto! Pista: *${hint}*\n_Restante: *${formatRemainingTime(remaining)}*_`,
        );
      }

      return false;
    };

    return { handler, answerHandler };
  }

  createPlugin(gameType, overrides = {}) {
    const cfg = this.registry.get(gameType);
    if (!cfg) throw new Error(`Game "${gameType}" not registered`);

    const { handler, answerHandler } = this.createHandler(gameType);

    return {
      config: {
        name: gameType,
        alias: cfg.alias,
        category: "game",
        description: cfg.description,
        usage: `.${gameType}`,
        example: `.${gameType}`,
        isOwner: false,
        isPremium: false,
        isGroup: false,
        isPrivate: false,
        cooldown: cfg.cooldown,
        energi: 0,
        isEnabled: true,
        ...overrides,
      },
      handler,
      answerHandler,
    };
  }
}

const games = new OurinGames();

export { OurinGames, games };
