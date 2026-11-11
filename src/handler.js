import { smsg } from "../lib/simple.js";
import { setBotLang, getBotLang } from "../lib/i18n.js";
import { format } from "util";
import { fileURLToPath } from "url";
import path, { join } from "path";
import fs from "fs";
import chalk from "chalk";
import fetch from "node-fetch";
import ws from "ws";
import { proto } from "@whiskeysockets/baileys";
const isNumber = x => typeof x === "number" && !isNaN(x);
const delay = ms => isNumber(ms) && new Promise(resolve => setTimeout(resolve, ms));
const printModule = await import("../lib/print.js").then(m => m.default).catch(() => null);

const prefixCache = new Map();
const groupCaches = new WeakMap();
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
    let normalized = normalizeJid(jid, conn);
    if (!normalized) return "";
    if (normalized.endsWith("@lid")) {
        const mapped = global.__shadowLidCache?.get(normalized);
        if (mapped && !mapped.endsWith("@lid")) {
            normalized = normalizeJid(mapped, conn);
        } else {
            return "";
        }
    }
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
    if (!a || !b) return false;
    const na = normalizeJid(a, conn);
    const nb = normalizeJid(b, conn);
    if (!na || !nb) return false;
    if (na === nb) return true;

    const mappedA = na.endsWith("@lid") ? (global.__shadowLidCache?.get(na) || na) : na;
    const mappedB = nb.endsWith("@lid") ? (global.__shadowLidCache?.get(nb) || nb) : nb;
    if (mappedA === mappedB) return true;

    const aa = jidNumber(mappedA, conn) || jidNumber(na, conn);
    const bb = jidNumber(mappedB, conn) || jidNumber(nb, conn);
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

async function getGroupMetadataCached(conn, jid, forceFresh = false) {
    if (!jid?.endsWith("@g.us")) return { participants: [] };
    let groupMetadataCache = groupCaches.get(conn);
    if (!groupMetadataCache) { groupMetadataCache = new Map(); groupCaches.set(conn, groupMetadataCache); }
    const now = Date.now();
    const cached = groupMetadataCache.get(jid);
    if (!forceFresh && cached && now - cached.ts < GROUP_METADATA_TTL) return cached.data;

    const stored = conn?.chats?.[jid]?.metadata;
    let safeMetadata = null;
    try {
        const metadata = await conn.groupMetadata(jid);
        if (metadata?.participants?.length) {
            safeMetadata = metadata;
        }
    } catch {}

    if (!safeMetadata) {
        safeMetadata = cached?.data || stored || { id: jid, participants: [] };
    }

    if (safeMetadata?.participants?.length) {
        if (!conn.chats) conn.chats = {};
        if (!conn.chats[jid]) conn.chats[jid] = { id: jid };
        conn.chats[jid].metadata = safeMetadata;
        groupMetadataCache.set(jid, { ts: now, data: safeMetadata });
    }
    return safeMetadata;
}

function isAdminParticipant(participant) {
    if (!participant) return false;
    const admin = participant.admin;
    return admin === "admin" || admin === "superadmin" || admin === "creator" || admin === true || participant.isAdmin === true || participant.isSuperAdmin === true;
}

export async function handler(chatUpdate) {
    this.msgqueque = this.msgqueque || [];
    this.uptime = this.uptime || Date.now();
    if (!chatUpdate || !this.user?.id) return;
    const messages = Array.isArray(chatUpdate.messages) ? chatUpdate.messages.filter(Boolean) : [];
    if (!messages.length) return;

    const hasStub = messages.some(msg => msg?.messageStubType || msg?.messageStubParameters);
    if (chatUpdate.type === "append" && !chatUpdate.isSynthetic && !hasStub) return;

    // WhatsApp can deliver several messages in one upsert. Processing only the
    // last one silently drops commands sent in the same batch.
    if (messages.length > 1) {
        for (const message of messages) {
            await handler.call(this, { ...chatUpdate, messages: [message] });
        }
        return;
    }
    await this.pushMessage?.(chatUpdate.messages)?.catch?.(console.error);
    let m = messages[0];
    if (!m) return;
    if (global.db.data == null) await global.loadDatabase();
    if (typeof getBotLang === 'function' && typeof setBotLang === 'function') {
        const rawBotJid = this.user?.jid || this.user?.id || '';
        const cleanBotJid = String(rawBotJid).replace(/:\d+@/, '@');
        const dbLang =
            global.db.data?.settings?.[rawBotJid]?.botLang ||
            global.db.data?.settings?.[cleanBotJid]?.botLang ||
            global.db.data?.settings?.botLang;
        const currentLang = getBotLang();
        if (dbLang && dbLang !== currentLang) {
            setBotLang(dbLang);
        } else if (currentLang && currentLang !== 'es' && !dbLang) {
            if (global.db.data?.settings) {
                global.db.data.settings.botLang = currentLang;
                if (rawBotJid) {
                    if (!global.db.data.settings[rawBotJid]) global.db.data.settings[rawBotJid] = {};
                    global.db.data.settings[rawBotJid].botLang = currentLang;
                }
            }
        }
    }
    m = smsg(this, m) || m;
    if (!m || !m.sender || !m.chat || m.chat === "status@broadcast" || m.chat.endsWith("@newsletter")) return;

    let prefixRegex = global.prefix;
    let usedPrefix = global.prefix || "";
    const senderNumber = (this.user.jid || this.user.id || '').split('@')[0].replace(/:\d+$/, '');
    if (!prefixCache.has(senderNumber)) {
        prefixCache.set(senderNumber, global.prefix);
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
        sGoodbye: "",
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

    const nuevoNombre = m.pushName || (typeof this.getName === "function" ? await this.getName(m.sender).catch?.(() => "") : "");
    if (typeof nuevoNombre === "string" && nuevoNombre.trim() && nuevoNombre !== user.name) {
        user.name = nuevoNombre;
    }

    const conn = this;
    let groupMetadata = m.isGroup ? await getGroupMetadataCached(this, m.chat) : { participants: [] };
    let participants = m.isGroup ? (groupMetadata.participants || []).map(p => normalizeParticipant(p, this)) : [];

    const senderCandidates = messageIds(m);
    const botLid = this.user?.lid || this.authState?.creds?.me?.lid;
    if (!this.user?.lid && botLid) {
        if (!this.user) this.user = {};
        this.user.lid = botLid;
    }
    const rawBotNum = (this.user?.jid || this.user?.id || this.authState?.creds?.me?.id || "").split("@")[0].split(":")[0].replace(/\D/g, "");
    const botCandidates = [
        this.user?.jid,
        this.user?.id,
        this.user?.lid,
        this.authState?.creds?.me?.lid,
        this.authState?.creds?.me?.id,
        this.authState?.creds?.me?.jid,
        this.user?.phoneNumber,
        this.user?.pn,
        rawBotNum ? `${rawBotNum}@s.whatsapp.net` : null,
        rawBotNum ? `${rawBotNum}@c.us` : null
    ].filter(Boolean);
    let userGroup = m.isGroup ? findParticipant(participants, senderCandidates, this) : {};
    let botGroup = m.isGroup ? findParticipant(participants, botCandidates, this) : {};

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
        const allBotSockets = [global.conn, ...(Array.isArray(global.conns) ? global.conns : [])].filter(Boolean);
        const primaryBotConn = allBotSockets.find(sock => {
            const socketState = sock?.ws?.socket?.readyState ?? sock?.ws?.readyState;
            return sameIdentity(sock?.user?.jid || sock?.user?.id, chat.primaryBot, sock) && socketState !== ws.CLOSED;
        });
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

    let isRAdmin = userGroup?.admin === "superadmin" || userGroup?.isSuperAdmin === true;
    let isAdmin = isAdminParticipant(userGroup);
    let isBotAdmin = isAdminParticipant(botGroup);

    // Modo administrador: bloquear cualquier interacción de miembros no autorizados
    // antes de ejecutar plugins, respuestas automáticas o comandos.
    // Los eventos del sistema (stub messages como unirse o salir) nunca deben ser bloqueados.
    if (m.isGroup && chat.modoadmin && !m.messageStubType && !isOwner && !isAdmin && !isMods && !isROwner) {
        return;
    }

    const __dirname = path.join(path.dirname(fileURLToPath(import.meta.url)), "../plugins");
    let commandHandled = false;
    for (const name in global.plugins) {
        const plugin = global.plugins[name];
        if (!plugin || plugin.disabled) continue;

        const pluginPrefix = plugin.customPrefix || prefixRegex || conn.prefix || global.prefix;
        const match = ((pluginPrefix instanceof RegExp
            ? (pluginPrefix.lastIndex = 0, [[pluginPrefix.exec(m.text), pluginPrefix]])
            : Array.isArray(pluginPrefix)
            ? pluginPrefix.map(p => {
                const regex = p instanceof RegExp ? p : new RegExp(p.replace(/[.*+?^${}()|\[\]\\]/g, '\\$1'));
                regex.lastIndex = 0;
                return [regex.exec(m.text), p];
            })
            : typeof pluginPrefix === "string"
            ? [[new RegExp(pluginPrefix.replace(/[.*+?^${}()|\[\]\\]/g, '\\$&')).exec(m.text), new RegExp(pluginPrefix)]]
            : [[[], new RegExp]]).find(p => p[0]) || [null, null]);

        if (typeof plugin.all === "function") {
            try {
                await plugin.all.call(this, m, { chatUpdate, __dirname, __filename: join(__dirname, name), user, chat, settings });
            } catch (err) {
                console.error(`Error en plugin all (${name}):`, err);
            }
        }

        if (!opts["restrict"] && plugin.tags?.includes("admin")) continue;

        if (typeof plugin.before === "function") {
            try {
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
                    __filename: join(__dirname, name),
                    chat,
                    settings
                })) continue;
            } catch (err) {
                console.error(`Error en plugin before (${name}):`, err);
                continue;
            }
        }

        if (commandHandled) continue;
        usedPrefix = (match[0] || "")[0];
        if (!usedPrefix) continue;

        const noPrefix = m.text.replace(usedPrefix, "");
        let [command, ...args] = noPrefix.trim().split(" ").filter(v => v);
        args = args || [];
        const text = args.join(" ");
        command = (command || "").toLowerCase();
        const isAccept = plugin.command instanceof RegExp
            ? (plugin.command.lastIndex = 0, plugin.command.test(command))
            : Array.isArray(plugin.command)
            ? plugin.command.some(cmd => cmd instanceof RegExp
                ? (cmd.lastIndex = 0, cmd.test(command))
                : cmd === command)
            : typeof plugin.command === "string"
            ? plugin.command === command
            : false;

        if (!isAccept) continue;
        global.comando = command;

        if (chat.isBanned && !isMods && name !== "group-banchat.js") {
            if (!chat.primaryBot || sameIdentity(chat.primaryBot, this.user?.jid || this.user?.id, this)) {
                await this.reply(m.chat, `🎃🦇 *[ 𝐒𝐇𝐀𝐃𝐎𝐖 𝐆𝐀𝐑𝐃𝐄𝐍 • 𝐇𝐀𝐋𝐋𝐎𝐖𝐄𝐄𝐍 ]*\n> ☾ El bot *${settings.botname}* descansa en la cripta de este grupo.\n\n> ✦ Un *administrador* puede despertarlo con:\n> » *${usedPrefix}bot on* 🕯️`, m);
                return;
            }
        }

        if (user.banned && !isMods && m.text) {
            if (!chat.primaryBot || sameIdentity(chat.primaryBot, this.user?.jid || this.user?.id, this)) {
                await this.reply(m.chat, `🎃⚰️ *[ 𝐒𝐇𝐀𝐃𝐎𝐖 𝐆𝐀𝐑𝐃𝐄𝐍 • 𝐇𝐀𝐋𝐋𝐎𝐖𝐄𝐄𝐍 ]*\n> ☾ Tu alma ha sido desterrada, no puedes usar rituales en este bot.\n\n> ● *Razón ›* ${user.bannedReason}\n\n> 🦇 Si tienes pruebas de que es una confusión, contacta a un líder de la noche.`, m);
                return;
            }
        }

        if (chat.modoadmin && !isOwner && m.isGroup && !isAdmin && (plugin.botAdmin || plugin.admin || plugin.group)) return;

        if (plugin.rowner && !isROwner) {
            await global.dfail("rowner", m, this);
            continue;
        }
        if (plugin.owner && !isOwner) {
            await global.dfail("owner", m, this);
            continue;
        }
        if (plugin.mods && !isMods) {
            await global.dfail("mods", m, this);
            continue;
        }
        if (plugin.premium && !isPrems) {
            await global.dfail("premium", m, this);
            continue;
        }
        if (plugin.group && !m.isGroup) {
            await global.dfail("group", m, this);
            continue;
        }

        if (plugin.admin && !isAdmin && m.isGroup) {
            try {
                const freshMeta = await getGroupMetadataCached(this, m.chat, true);
                if (freshMeta?.participants?.length) {
                    groupMetadata = freshMeta;
                    participants = freshMeta.participants.map(p => normalizeParticipant(p, this));
                    userGroup = findParticipant(participants, senderCandidates, this);
                    if (isAdminParticipant(userGroup)) {
                        isAdmin = true;
                        isRAdmin = userGroup?.admin === "superadmin" || userGroup?.isSuperAdmin === true;
                    }
                }
            } catch {}
        }

        if (plugin.admin && !isAdmin) {
            await global.dfail("admin", m, this);
            continue;
        }
        
        if (plugin.botAdmin && !isBotAdmin && m.isGroup) {
            try {
                const freshMeta = await getGroupMetadataCached(this, m.chat, true);
                if (freshMeta?.participants?.length) {
                    groupMetadata = freshMeta;
                    participants = freshMeta.participants.map(p => normalizeParticipant(p, this));
                    botGroup = findParticipant(participants, botCandidates, this);
                    if (isAdminParticipant(botGroup)) {
                        isBotAdmin = true;
                    }
                }
            } catch {}
        }

        if (plugin.botAdmin && !isBotAdmin) {
            await global.dfail("botAdmin", m, this);
            continue;
        }
        if (plugin.private && m.isGroup) {
            await global.dfail("private", m, this);
            continue;
        }

        if (plugin.coin && isNumber(plugin.coin) && plugin.coin > 0) {
            if (user.coin < plugin.coin) {
                await this.reply(m.chat, `> 🎃 🪙 *[ 𝐒𝐇𝐀𝐃𝐎𝐖 𝐆𝐀𝐑𝐃𝐄𝐍 • 𝐇𝐀𝐋𝐋𝐎𝐖𝐄𝐄𝐍 ]*\n> ☾ No posees suficientes *${global.currency}* para este ritual.\n> » Necesitas: *${plugin.coin}* | Tu cofre: *${user.coin}* 🦇`, m);
                continue;
            }
            user.coin -= plugin.coin;
            await this.reply(m.chat, `> 🎃 🪙 *[ 𝐒𝐇𝐀𝐃𝐎𝐖 𝐆𝐀𝐑𝐃𝐄𝐍 ]* Se ofrendaron *${plugin.coin} ${global.currency}* por invocar *${usedPrefix}${command}*.\n> » *_Saldo restante: ${user.coin} ${global.currency}._* 🦇`, m);
        }

        commandHandled = true;
        m.isCommand = true;
        m.exp += plugin.exp ? parseInt(plugin.exp) : 10;

        const audioCommands = new Set(['play', 'playch', 'ytmp3', 'ytmp4', 'playvid', 'ytv', 'yt', 'spotify', 'spdl', 'audivd', 'cancion', 'canción', 'say', 'decir', 'tiktoks', 'tiktoksearch', 'ttss', 'ptvsearch', 'ptvtt', 'ttptv', 'shazam', 'whatmusic']);
        try {
            if (this.sendPresenceUpdate) {
                await this.sendPresenceUpdate(audioCommands.has(command) ? 'recording' : 'composing', m.chat);
            }
            if (this.readMessages && m.key) {
                await this.readMessages([m.key]);
            }
        } catch (e) {
            console.error('Error en presencia/lectura:', e);
        }

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
                __filename: join(__dirname, name),
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
                    __filename: join(__dirname, name),
                    chat,
                    settings
                });
            }

            if (isAccept) user.commands = (user.commands || 0) + 1;
        } catch (err) {
            m.error = err;
            console.error(err);
            try {
                await this.reply(m.chat, `🎃🦇 *[ 𝐒𝐇𝐀𝐃𝐎𝐖 𝐆𝐀𝐑𝐃𝐄𝐍 • 𝐇𝐀𝐋𝐋𝐎𝐖𝐄𝐄𝐍 ]*\n> ☾ Una perturbación en las sombras impidió invocar *${usedPrefix}${command}*.\n> 🕸️ Detalle: ${err?.message || 'Fallo interno en el aquelarre.'}`, m);
            } catch (replyError) {
                console.error('No se pudo enviar el error del comando:', replyError);
            }
        }
    }

    if (m.sender && user) user.exp += m.exp;
    if (!opts["noprint"] && m.isCommand) await printModule?.(m, this).catch(err => console.warn(err));
}

global.dfail = (type, m, conn) => {
    const msg = {
        rowner: `> 🎃 ⚰️ *[ 𝐒𝐇𝐀𝐃𝐎𝐖 𝐆𝐀𝐑𝐃𝐄𝐍 • 𝐇𝐀𝐋𝐋𝐎𝐖𝐄𝐄𝐍 ]*\n> ☾ El ritual *${global.comando}* está sellado solo para el Maestro Supremo de las sombras. 🦇`,
        owner: `> 🎃 ⚰️ *[ 𝐒𝐇𝐀𝐃𝐎𝐖 𝐆𝐀𝐑𝐃𝐄𝐍 • 𝐇𝐀𝐋𝐋𝐎𝐖𝐄𝐄𝐍 ]*\n> ☾ El comando *${global.comando}* solo puede ser ejecutado por los arquitectos de la sombra. 🦇`,
        mods: `> 🎃 🕯️ *[ 𝐒𝐇𝐀𝐃𝐎𝐖 𝐆𝐀𝐑𝐃𝐄𝐍 • 𝐇𝐀𝐋𝐋𝐎𝐖𝐄𝐄𝐍 ]*\n> ☾ El comando *${global.comando}* requiere el rango de Moderador del Aquelarre. 🕸️`,
        premium: `> 🎃 🩸 *[ 𝐒𝐇𝐀𝐃𝐎𝐖 𝐆𝐀𝐑𝐃𝐄𝐍 • 𝐇𝐀𝐋𝐋𝐎𝐖𝐄𝐄𝐍 ]*\n> ☾ El pacto de *${global.comando}* está reservado únicamente para usuarios con sello Premium. 🦇`,
        group: `> 🎃 🏰 *[ 𝐒𝐇𝐀𝐃𝐎𝐖 𝐆𝐀𝐑𝐃𝐄𝐍 • 𝐇𝐀𝐋𝐋𝐎𝐖𝐄𝐄𝐍 ]*\n> ☾ Este ritual *${global.comando}* solo puede manifestarse dentro de un Círculo de Sombras (Grupo). 🕸️`,
        private: `> 🎃 🌑 *[ 𝐒𝐇𝐀𝐃𝐎𝐖 𝐆𝐀𝐑𝐃𝐄𝐍 • 𝐇𝐀𝐋𝐋𝐎𝐖𝐄𝐄𝐍 ]*\n> ☾ Este susurro *${global.comando}* debe realizarse en las sombras del chat privado. 🦇`,
        admin: `> 🎃 ⚔️ *[ 𝐒𝐇𝐀𝐃𝐎𝐖 𝐆𝐀𝐑𝐃𝐄𝐍 • 𝐇𝐀𝐋𝐋𝐎𝐖𝐄𝐄𝐍 ]*\n> ☾ Solo los Administradores del aquelarre pueden invocar *${global.comando}*. 🕸️`,
        botAdmin: `> 🎃 💀 *[ 𝐒𝐇𝐀𝐃𝐎𝐖 𝐆𝐀𝐑𝐃𝐄𝐍 • 𝐇𝐀𝐋𝐋𝐎𝐖𝐄𝐄𝐍 ]*\n> ☾ Para desatar el poder de *${global.comando}*, la Sombra debe tener permisos de Administrador en el grupo. 🦇`,
        restrict: `> 🎃 🚫 *[ 𝐒𝐇𝐀𝐃𝐎𝐖 𝐆𝐀𝐑𝐃𝐄𝐍 • 𝐇𝐀𝐋𝐋𝐎𝐖𝐄𝐄𝐍 ]*\n> ☾ Esta técnica oscura se encuentra sellada actualmente por el pacto de Halloween. 🕯️`
    }[type];
    if (msg) return conn.reply(m.chat, msg, m).then(() => m.react('🎃'));
};

export async function participantsUpdate({ id, participants, action, author }) {
    if (!id || !Array.isArray(participants) || !participants.length) return;
    if (action !== 'add' && action !== 'remove' && action !== 'leave') return;

    // 27 = GROUP_PARTICIPANT_ADD, 28 = GROUP_PARTICIPANT_REMOVE, 32 = GROUP_PARTICIPANT_LEAVE
    const stubType = action === 'add' ? 27 : (action === 'leave' ? 32 : 28);

    const normalizedParticipants = participants.map(p => {
        if (!p) return '';
        if (typeof p === 'object') {
            return p.phoneNumber || p.id || p.jid || p.lid || '';
        }
        return String(p).trim();
    }).filter(p => p && p !== '[object Object]');

    if (!normalizedParticipants.length) return;

    const firstJid = normalizedParticipants[0];
    const cleanAuthor = typeof author === 'string' && author && author !== '[object Object]'
        ? author
        : (firstJid || id);

    const fakeMessage = {
        key: {
            remoteJid: id,
            fromMe: false,
            id: `STUB-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
            participant: cleanAuthor
        },
        messageStubType: stubType,
        messageStubParameters: normalizedParticipants,
        chat: id,
        isGroup: true,
        sender: cleanAuthor
    };

    await handler.call(this, {
        type: 'notify',
        isSynthetic: true,
        messages: [fakeMessage]
    });
}

