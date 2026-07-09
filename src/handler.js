import { smsg } from "../lib/simple.js";
import { format } from "util";
import { fileURLToPath } from "url";
import path, { join } from "path";
import fs, { unwatchFile, watchFile } from "fs";
import chalk from "chalk";
import fetch from "node-fetch";
import ws from "ws";
import { proto } from "@whiskeysockets/baileys";
const isNumber = x => typeof x === "number" && !isNaN(x);
const delay = ms => isNumber(ms) && new Promise(resolve => setTimeout(resolve, ms));
const printModule = await import("../lib/print.js").then(m => m.default).catch(() => null);

const prefixCache = new Map();
const groupMetadataCache = global.__shadowGroupMetadataCache || (global.__shadowGroupMetadataCache = new Map());
const GROUP_METADATA_TTL = 30 * 1000;

function normalizeJid(jid, conn) {
    if (!jid) return "";
    if (typeof jid === "object") jid = jid.phoneNumber || jid.jid || jid.id || jid.lid || "";
    if (typeof jid !== "string") jid = String(jid || "");
    if (!jid) return "";
    try {
        jid = conn?.decodeJid?.(jid) || jid;
    } catch { }
    return jid.trim().replace(/:\d+@/, "@").toLowerCase();
}

function jidNumber(jid, conn) {
    const normalized = normalizeJid(jid, conn);
    if (!normalized || normalized.endsWith("@lid")) return "";
    return normalized.split("@")[0].replace(/\D/g, "");
}

function rawNumber(value) {
    const raw = Array.isArray(value) ? value[0] : value;
    return String(raw || "").replace(/\D/g, "");
}

function identityNumbers(jids, conn) {
    return new Set((jids || []).map(jid => jidNumber(jid, conn)).filter(Boolean));
}

function matchesNumberList(jids, list, conn) {
    const numbers = identityNumbers(jids, conn);
    return (list || []).some(entry => {
        const number = rawNumber(entry);
        return number && numbers.has(number);
    });
}

function participantIds(participant) {
    if (!participant) return [];
    return [
        participant.id,
        participant.jid,
        participant.lid,
        participant.phoneNumber,
        participant.pn,
        participant.phone
    ].filter(Boolean);
}

function messageIds(m) {
    return [
        m?.sender,
        m?.participant,
        m?.key?.participantAlt,
        m?.key?.remoteJidAlt,
        m?.key?.participant,
        m?.key?.remoteJid
    ].filter(Boolean);
}

function sameIdentity(a, b, conn) {
    const na = normalizeJid(a, conn);
    const nb = normalizeJid(b, conn);
    if (!na || !nb) return false;
    if (na === nb) return true;
    const aa = jidNumber(na, conn);
    const bb = jidNumber(nb, conn);
    return !!aa && !!bb && aa === bb;
}

function findParticipant(participants, candidates, conn) {
    if (!Array.isArray(participants) || !participants.length) return {};
    const cleanCandidates = (candidates || []).filter(Boolean);
    return participants.find(p => participantIds(p).some(id => cleanCandidates.some(candidate => sameIdentity(id, candidate, conn)))) || {};
}

function normalizeParticipant(participant, conn) {
    if (!participant) return participant;
    const id = participant.id || participant.jid || participant.phoneNumber || participant.lid || "";
    const phoneNumber = participant.phoneNumber || (!normalizeJid(id, conn).endsWith("@lid") ? id : undefined);
    return {
        ...participant,
        jid: participant.jid || phoneNumber || participant.id || participant.lid,
        phoneNumber
    };
}

async function getGroupMetadataCached(conn, jid) {
    if (!jid?.endsWith("@g.us")) return { participants: [] };
    const now = Date.now();
    const cached = groupMetadataCache.get(jid);
    if (cached && now - cached.ts < GROUP_METADATA_TTL) return cached.data;

    const stored = conn?.chats?.[jid]?.metadata;
    if (stored?.participants?.length) {
        groupMetadataCache.set(jid, { ts: now, data: stored });
        return stored;
    }

    const metadata = await conn.groupMetadata(jid).catch(() => stored || { id: jid, participants: [] });
    const safeMetadata = metadata || { id: jid, participants: [] };
    if (safeMetadata?.participants?.length) {
        if (!conn.chats[jid]) conn.chats[jid] = { id: jid };
        conn.chats[jid].metadata = safeMetadata;
    }
    groupMetadataCache.set(jid, { ts: now, data: safeMetadata });
    return safeMetadata;
}

function isAdminParticipant(participant) {
    return participant?.admin === "admin" || participant?.admin === "superadmin" || participant?.isAdmin === true || participant?.isSuperAdmin === true;
}

export async function handler(chatUpdate) {
    this.msgqueque = this.msgqueque || [];
    this.uptime = this.uptime || Date.now();
    if (!chatUpdate) return;
    this.pushMessage(chatUpdate.messages).catch(console.error);
    let m = chatUpdate.messages[chatUpdate.messages.length - 1];
    if (!m) return;
    if (global.db.data == null) await global.loadDatabase();
    m = smsg(this, m) || m;
    if (!m) return;

    let prefixRegex = global.prefix;
    let usedPrefix = global.prefix || "";
    const senderNumber = (this.user.jid || this.user.id || '').split('@')[0].replace(/:\d+$/, '');
    if (!prefixCache.has(senderNumber)) {
        const botPath = path.join('./Sessions/SubBot', senderNumber);
        const configPath = path.join(botPath, 'config.json');
        try {
            if (fs.existsSync(configPath)) {
                const config = JSON.parse(fs.readFileSync(configPath));
                if (config.prefix) {
                    prefixRegex = config.prefix === 'multi'
                        ? /^[#$@*&?,;:+×!_\-.]/
                        : new RegExp(`^(${[...config.prefix].map(c => c.replace(/([.*+?^${}()|\[\]\\])/g, '\\$1')).join('|')})`);
                    prefixCache.set(senderNumber, prefixRegex);
                }
            }
        } catch (e) {
            console.error('🍁 Error cargando prefijo del subbot:', e);
        }
    } else {
        prefixRegex = prefixCache.get(senderNumber) || global.prefix;
    }

    m.exp = 0;
    m.coin = false;

    const user = global.db.data.users[m.sender] || (global.db.data.users[m.sender] = {
        name: m.name,
        exp: 0,
        coin: 0,
        bank: 0,
        level: 0,
        health: 100,
        genre: "",
        birth: "",
        marry: "",
        description: "",
        packstickers: null,
        premium: false,
        premiumTime: 0,
        banned: false,
        bannedReason: "",
        commands: 0,
        afk: -1,
        afkReason: "",
        warn: 0
    });

    const chat = global.db.data.chats[m.chat] || (global.db.data.chats[m.chat] = {
        isBanned: false,
        welcome: true,
        sWelcome: "",
        sBye: "",
        detect: true,
        primaryBot: null,
        modoadmin: false,
        antiLink: true,
        nsfw: false,
        economy: true,
        gacha: true
    });

    if (chat.isBanned) {
        const textLower = m.text?.toLowerCase() || '';
        if (
            !textLower.startsWith('.unbanchat') &&
            !textLower.startsWith('/unbanchat') &&
            !textLower.startsWith('!unbanchat') &&
            !textLower.startsWith('.desbanearbot') &&
            !textLower.startsWith('/desbanearbot') &&
            !textLower.startsWith('!desbanearbot')
        ) {
            return;
        }
    }

    const settings = global.db.data.settings[this.user.jid] || (global.db.data.settings[this.user.jid] = {
        self: false,
        restrict: true,
        jadibotmd: true,
        antiPrivate: false,
        gponly: false
    });

    if (typeof m.text !== "string") m.text = "";

    const nuevoNombre = m.pushName || await this.getName(m.sender);
    if (typeof nuevoNombre === "string" && nuevoNombre.trim() && nuevoNombre !== user.name) {
        user.name = nuevoNombre;
    }

    const conn = m.conn || global.conn;
    const groupMetadata = m.isGroup ? await getGroupMetadataCached(this, m.chat) : { participants: [] };
    const participants = m.isGroup ? (groupMetadata.participants || []).map(p => normalizeParticipant(p, this)) : [];

    const senderCandidates = messageIds(m);
    const botCandidates = [this.user?.jid, this.user?.id, this.user?.lid, this.user?.phoneNumber, this.user?.pn].filter(Boolean);
    const userGroup = m.isGroup ? findParticipant(participants, senderCandidates, this) : {};
    const botGroup = m.isGroup ? findParticipant(participants, botCandidates, this) : {};

    const senderIdentity = [...senderCandidates, ...participantIds(userGroup)];
    const isROwner = matchesNumberList(senderIdentity, global.owner, this);
    const isOwner = isROwner || m.fromMe;
    const isMods = isROwner || matchesNumberList(senderIdentity, global.mods, this);
    const isPrems = isROwner || matchesNumberList(senderIdentity, global.prems, this) || user.premium;

    if (opts["nyimak"]) return;
    if (!m.fromMe && !isMods && settings.self) return;
    if (!m.fromMe && !isMods && settings.gponly && !m.chat.endsWith("g.us") && !/code|p|ping|qr|estado|status|infobot|botinfo|report|reportar|invite|join|logout|suggest|help|menu/gim.test(m.text)) return;
    if (opts["swonly"] && m.chat !== "status@broadcast") return;
    if (m.isBaileys) return;

    const delPrimaryRegex = prefixRegex instanceof RegExp
        ? new RegExp(`${prefixRegex.source}delprimary\\b`, prefixRegex.flags)
        : /^delprimary\b/i;
    const isDelPrimaryCommand = typeof m.text === "string" && delPrimaryRegex.test(m.text);

    if (chat.primaryBot && !sameIdentity(chat.primaryBot, this.user.jid || this.user.id, this) && !isDelPrimaryCommand) {
        const primaryBotInGroup = participants.some(p => participantIds(p).some(id => sameIdentity(id, chat.primaryBot, this)));
        const primaryBotConn = (global.conns || []).find(sock => sameIdentity(sock?.user?.jid || sock?.user?.id, chat.primaryBot, sock) && sock.ws?.socket?.readyState !== ws.CLOSED);
        if (primaryBotConn && primaryBotInGroup) return;
        chat.primaryBot = null;
    }

    if (m.text && !(isMods || isPrems)) {
        this.msgqueque.push(m.id || m.key.id);
        if (this.msgqueque.length > 1) {
            await delay(500);
        }
        const quequeIndex = this.msgqueque.indexOf(m.id || m.key.id);
        if (quequeIndex !== -1) this.msgqueque.splice(quequeIndex, 1);
    }

    m.exp += Math.ceil(Math.random() * 10);

    const isRAdmin = userGroup?.admin === "superadmin" || userGroup?.isSuperAdmin === true;
    const isAdmin = isAdminParticipant(userGroup);
    const isBotAdmin = isAdminParticipant(botGroup);

    const ___dirname = path.join(path.dirname(fileURLToPath(import.meta.url)), "../plugins");
    for (const name in global.plugins) {
        const plugin = global.plugins[name];
        if (!plugin || plugin.disabled) continue;

        const pluginPrefix = plugin.customPrefix || prefixRegex || conn.prefix || global.prefix;
        const match = (pluginPrefix instanceof RegExp
            ? [[pluginPrefix.exec(m.text), pluginPrefix]]
            : Array.isArray(pluginPrefix)
            ? pluginPrefix.map(p => [p instanceof RegExp ? p : new RegExp(p.replace(/[.*+?^${}()|\[\]\\]/g, '\\$1')).exec(m.text), p])
            : typeof pluginPrefix === "string"
            ? [[new RegExp(pluginPrefix.replace(/[.*+?^${}()|\[\]\\]/g, '\\$&')).exec(m.text), new RegExp(pluginPrefix)]]
            : [[[], new RegExp]]).find(p => p[1]);

        if (typeof plugin.all === "function") {
            await plugin.all.call(this, m, { chatUpdate, __dirname, __filename: join(___dirname, name), user, chat, settings });
        }

        if (!opts["restrict"] && plugin.tags?.includes("admin")) continue;

        if (typeof plugin.before === "function") {
            if (await plugin.before.call(this, m, {
                match,
                conn: this,
                participants,
                groupMetadata,
                user: userGroup,
                bot: botGroup,
                isROwner,
                isOwner,
                isMods,
                isRAdmin,
                isAdmin,
                isBotAdmin,
                isPrems,
                chatUpdate,
                __dirname,
                __filename: join(___dirname, name),
                chat,
                settings
            })) continue;
        }

        usedPrefix = (match[0] || "")[0];
        if (!usedPrefix) continue;

        const noPrefix = m.text.replace(usedPrefix, "");
        let [command, ...args] = noPrefix.trim().split(" ").filter(v => v);
        args = args || [];
        const text = args.join(" ");
        command = (command || "").toLowerCase();
        const isAccept = plugin.command instanceof RegExp
            ? plugin.command.test(command)
            : Array.isArray(plugin.command)
            ? plugin.command.some(cmd => cmd instanceof RegExp ? cmd.test(command) : cmd === command)
            : typeof plugin.command === "string"
            ? plugin.command === command
            : false;

        if (!isAccept) continue;
        global.comando = command;

        if (chat.isBanned && !isMods && name !== "group-banchat.js") {
            if (!chat.primaryBot || chat.primaryBot === this.user.jid) {
                await this.reply(m.chat, `ꕥ El bot *${settings.botname}* está desactivado en este grupo\n\n> ✦ Un *administrador* puede activarlo con el comando:\n> » *${usedPrefix}bot on*`, m);
                return;
            }
        }

        if (user.banned && !isMods && m.text) {
            if (!chat.primaryBot || chat.primaryBot === this.user.jid) {
                await this.reply(m.chat, `ꕥ Estas baneado/a, no puedes usar comandos en este bot!\n\n> ● *Razón ›* ${user.bannedReason}\n\n> ● Si este Bot es cuenta oficial y tienes evidencia que respalde que este mensaje es un error, puedes exponer tu caso con un moderador.`, m);
                return;
            }
        }

        if (chat.modoadmin && !isOwner && m.isGroup && !isAdmin && (plugin.botAdmin || plugin.admin || plugin.group)) return;

        if (plugin.rowner && !isROwner) {
            global.dfail("rowner", m, this);
            continue;
        }
        if (plugin.owner && !isOwner) {
            global.dfail("owner", m, this);
            continue;
        }
        if (plugin.mods && !isMods) {
            global.dfail("mods", m, this);
            continue;
        }
        if (plugin.premium && !isPrems) {
            global.dfail("premium", m, this);
            continue;
        }
        if (plugin.group && !m.isGroup) {
            global.dfail("group", m, this);
            continue;
        }

        if (plugin.admin && !isAdmin) {
            global.dfail("admin", m, this);
            continue;
        }
        
        if (plugin.botAdmin && !isBotAdmin) {
            global.dfail("botAdmin", m, this);
            continue;
        }
        if (plugin.private && m.isGroup) {
            global.dfail("private", m, this);
            continue;
        }

        if (plugin.coin && isNumber(plugin.coin) && plugin.coin > 0) {
            if (user.coin < plugin.coin) {
                await this.reply(m.chat, `ꕥ No tienes suficientes *${global.currency}* para usar este comando. Necesitas ${plugin.coin} *${global.currency}*, pero tienes ${user.coin} *${global.currency}*.`, m);
                continue;
            }
            user.coin -= plugin.coin;
            await this.reply(m.chat, `> ꕥ Se cobraran ${plugin.coin} *${global.currency}* por usar el comando *${usedPrefix}${command}*.\n> » *_Saldo actual: ${user.coin} ${global.currency}._*`, m);
        }

        m.isCommand = true;
        m.exp += plugin.exp ? parseInt(plugin.exp) : 10;

        try {
            await plugin.call(this, m, {
                match,
                usedPrefix,
                noPrefix,
                args,
                command,
                text,
                conn: this,
                participants,
                groupMetadata,
                user: userGroup,
                bot: botGroup,
                isROwner,
                isOwner,
                isMods,
                isRAdmin,
                isAdmin,
                isBotAdmin,
                isPrems,
                chatUpdate,
                __dirname,
                __filename: join(___dirname, name),
                chat,
                settings
            });

            if (typeof plugin.after === "function") {
                await plugin.after.call(this, m, {
                    match,
                    usedPrefix,
                    noPrefix,
                    args,
                    command,
                    text,
                    conn: this,
                    participants,
                    groupMetadata,
                    user: userGroup,
                    bot: botGroup,
                    isROwner,
                    isOwner,
                    isMods,
                    isRAdmin,
                    isAdmin,
                    isBotAdmin,
                    isPrems,
                    chatUpdate,
                    __dirname,
                    __filename: join(___dirname, name),
                    chat,
                    settings
                });
            }

            if (isAccept) user.commands = (user.commands || 0) + 1;
        } catch (err) {
            m.error = err;
            console.error(err);
        }
    }

    if (m.sender && user) user.exp += m.exp;
    if (!opts["noprint"] && m.isCommand) await printModule?.(m, this).catch(err => console.warn(err));
}

global.dfail = (type, m, conn) => {
    const msg = {
        rowner: `> 〄 El comando *${global.comando}* solo puede ser usado por los creadores del bot.`,
        owner: `> 〄 El comando *${global.comando}* solo puede ser usado por los desarrolladores del bot.`,
        mods: `> 〄 El comando *${global.comando}* solo puede ser usado por los moderadores del bot.`,
        premium: `> 〄 El comando *${global.comando}* solo puede ser usado por los usuarios premium.`,
        group: `> 〄 El comando *${global.comando}* solo puede ser usado en grupos.`,
        private: `> 〄 El comando *${global.comando}* solo puede ser usado al chat privado del bot.`,
        admin: `> 〄 El comando *${global.comando}* solo puede ser usado por los administradores del grupo.`,
        botAdmin: `> 〄 Para ejecutar el comando *${global.comando}* debo ser administrador del grupo.`,
        restrict: `> 〄 Esta característica está desactivada.`
    }[type];
    if (msg) return conn.reply(m.chat, msg, m).then(() => m.react('✖️'));
};

let file = global.__filename(import.meta.url, true);
watchFile(file, async () => {
    unwatchFile(file);
    console.log(chalk.magenta("Se actualizó 'handler.js'"));
    import(`${file}?update=${Date.now()}`);
});
