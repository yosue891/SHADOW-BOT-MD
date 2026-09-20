import { promises as fs } from 'fs';
import fetch from 'node-fetch';

// Función para cargar los personajes desde el JSON
async function loadCharacters() {
    const data = await fs.readFile("./lib/characters.json", "utf-8");
    return JSON.parse(data);
}

// Aplanar la estructura de personajes
function flattenCharacters(data) {
    return Object.values(data).flatMap(series => Array.isArray(series.characters) ? series.characters : []);
}

// Obtener el nombre de la serie/anime
function getSeriesNameByCharacter(data, charId) {
    const seriesEntry = Object.entries(data).find(([, seriesData]) => 
        Array.isArray(seriesData.characters) && seriesData.characters.some(char => char.id === charId)
    );
    return seriesEntry?.[1]?.["name"] || "Desconocido";
}

// Formatear tiempo transcurrido
function formatElapsed(milliseconds) {
    if (!milliseconds || milliseconds <= 0) {
        return '—';
    }
    const seconds = Math.floor(milliseconds / 1000);
    const weeks = Math.floor(seconds / 604800);
    const days = Math.floor((seconds % 604800) / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    const timeString = [];
    if (weeks > 0) timeString.push(weeks + 'w');
    if (days > 0) timeString.push(days + 'd');
    if (hours > 0) timeString.push(hours + 'h');
    if (minutes > 0) timeString.push(minutes + 'm');
    if (secs > 0) timeString.push(secs + 's');
    
    return timeString.join(" ");
}

// Buscar imágenes en APIs (Safebooru, Danbooru, etc.)
async function buscarImagenDelirius(query) {
    const tag = String(query).trim().toLowerCase().replace(/\s+/g, '_');
    const apis = [
        `https://safebooru.org/index.php?page=dapi&s=post&q=index&json=1&tags=${tag}`,
        `https://danbooru.donmai.us/posts.json?tags=${tag}`,
        `${global.APIs.delirius.url}/search/gelbooru?query=${tag}`
    ];

    for (const url of apis) {
        try {
            const response = await fetch(url, {
                headers: { 'User-Agent': 'Mozilla/5.0', 'Accept': 'application/json' }
            });
            const contentType = response.headers.get("content-type") || '';
            if (!response.ok || !contentType.includes("json")) continue;

            const json = await response.json();
            const data = Array.isArray(json) ? json : (json?.["post"] || json?.["data"] || []);
            
            const images = data.map(item => 
                item?.["file_url"] || item?.["large_file_url"] || item?.["image"] || item?.['media_asset']?.["variants"]?.[0]?.["url"]
            ).filter(url => typeof url === "string" && /\.(jpe?g|png)$/.test(url));

            if (images.length) return images;
        } catch {}
    }
    return [];
}

let handler = async (m, { conn, args, usedPrefix, command }) => {
    // --- SECCIÓN DE VERIFICACIÓN ELIMINADA ---

    try {
        // Verificar si el grupo tiene activado el modo gacha
        if (!global.db.data.chats?.[m.chat]?.["gacha"] && m.isGroup) {
            return m.reply(`ꕥ Los comandos de *Gacha* están desactivados en este grupo.\n\nUn *administrador* puede activarlos con el comando:\n» *${usedPrefix}gacha on*`);
        }

        // Verificar si se ingresó un nombre
        if (!args.length) {
            return m.reply(`❀ Por favor, proporciona el nombre de un personaje.\n> Ejemplo » *${usedPrefix + command} Yuki Suou*`);
        }

        // Cargar y buscar personaje
        const allCharactersData = await loadCharacters();
        const flatChars = flattenCharacters(allCharactersData);
        const searchQuery = args.join(" ").toLowerCase().trim();

        // Lógica de búsqueda (Exacta -> Incluye -> Tags)
        const character = flatChars.find(c => String(c.name).toLowerCase() === searchQuery) ||
                          flatChars.find(c => String(c.name).toLowerCase().includes(searchQuery) || (Array.isArray(c.tags) && c.tags.some(t => t.toLowerCase().includes(searchQuery)))) ||
                          flatChars.find(c => searchQuery.split(" ").some(q => String(c.name).toLowerCase().includes(q) || (Array.isArray(c.tags) && c.tags.some(t => t.toLowerCase().includes(q)))));

        if (!character) {
            return m.reply(`ꕥ No se encontró el personaje *${searchQuery}*.`);
        }

        const dbData = global.db.data;

        switch (command) {
            case "charinfo":
            case "winfo":
            case "waifuinfo": {
                if (!dbData.characters) dbData.characters = {};
                if (!dbData.characters[character.id]) dbData.characters[character.id] = {};

                const charData = dbData.characters[character.id];
                charData.name ??= character.name;
                charData.value = typeof charData.value === 'number' ? charData.value : Number(character.value || 100);
                charData.votes = typeof charData.votes === "number" ? charData.votes : 0;

                const seriesName = getSeriesNameByCharacter(allCharactersData, character.id);
                
                // Buscar dueño actual
                const ownerEntry = Object.entries(dbData.users).find(([, userData]) => Array.isArray(userData.characters) && userData.characters.includes(character.id));
                
                let ownerName = "desconocido";
                if (ownerEntry) {
                    ownerName = ownerEntry[0] ? (dbData.users[ownerEntry[0]]?.name?.trim() || (await conn.getName(ownerEntry[0]))?.trim() || ownerEntry[0].split('@')[0]) : "desconocido";
                }

                const claimDate = charData.user && charData.claimedAt 
                    ? `\nⴵ Fecha de reclamo » *${new Date(charData.claimedAt).toLocaleDateString("es-VE", { weekday: "long", day: "numeric", month: 'long', year: 'numeric' })}*` 
                    : '';
                
                const lastVote = typeof charData.lastVotedAt === "number" ? `hace *${formatElapsed(Date.now() - charData.lastVotedAt)}*` : "*Nunca*";
                
                // Calcular ranking
                const sortedChars = Object.values(dbData.characters).filter(c => typeof c.value === "number").sort((a, b) => b.value - a.value);
                const rank = sortedChars.findIndex(c => c.name === character.name) + 1 || '—';

                const infoText = `❀ Nombre » *${charData.name}*\n⚥ Género » *${character.gender || 'Desconocido'}*\n✰ Valor » *${charData.value.toLocaleString()}*\n♡ Estado » ${ownerEntry ? "Reclamado por *" + ownerName + '*' : '*Libre*'} ${claimDate}\n❖ Fuente » *${seriesName}*\n❏ Puesto » *#${rank}*\nⴵ Último voto » ${lastVote}`;
                
                await m.reply(infoText.trim());
                break;
            }

            case "charimage":
            case "waifuimage":
            case 'cimage':
            case "wimage": {
                const tag = Array.isArray(character.tags) ? character.tags[0] : null;
                if (!tag) return m.reply(`ꕥ El personaje *${character.name}* no tiene un tag válido para buscar imágenes.`);

                const images = await buscarImagenDelirius(tag);
                const randomImage = images[Math.floor(Math.random() * images.length)];

                if (!randomImage) return m.reply(`ꕥ No se encontraron imágenes para *${character.name}* con el tag *${tag}*.`);

                const seriesName = getSeriesNameByCharacter(allCharactersData, character.id);
                const caption = `❀ Nombre » *${character.name}*\n⚥ Género » *${character.gender || "Desconocido"}*\n❖ Fuente » *${seriesName}*`;
                
                await conn.sendFile(m.chat, randomImage, `${character.name}.jpg`, caption, m);
                break;
            }

            case "charvideo":
            case 'waifuvideo':
            case "cvideo":
            case "wvideo": {
                const tag = Array.isArray(character.tags) ? character.tags[0] : null;
                if (!tag) return m.reply(`ꕥ El personaje ${character.name} no tiene un tag válido para buscar videos.`);

                const formattedTag = String(tag).trim().toLowerCase().replace(/\s+/g, '_');
                const videoApis = [
                    `${global.APIs.delirius.url}/search/gelbooru?query=${formattedTag}`,
                    `https://safebooru.org/index.php?page=dapi&s=post&q=index&json=1&tags=${formattedTag}`,
                    `https://danbooru.donmai.us/posts.json?tags=${formattedTag}`
                ];

                let videos = [];
                for (const url of videoApis) {
                    try {
                        const response = await fetch(url, { headers: { 'User-Agent': "Mozilla/5.0", 'Accept': "application/json" } });
                        const contentType = response.headers.get("content-type") || '';
                        if (!response.ok || !contentType.includes("json")) continue;

                        const json = await response.json();
                        const data = Array.isArray(json) ? json : (json?.["post"] || json?.['data'] || []);
                        
                        videos = data.map(item => 
                            item?.["file_url"] || item?.['large_file_url'] || item?.["image"] || item?.['media_asset']?.["variants"]?.[0]?.["url"]
                        ).filter(url => typeof url === "string" && /\.(gif|mp4)$/.test(url));

                        if (videos.length) break;
                    } catch {}
                }

                if (!videos.length) return m.reply(`ꕥ No se encontraron videos para ${character.name}.`);

                const randomVideo = videos[Math.floor(Math.random() * videos.length)];
                const seriesName = getSeriesNameByCharacter(allCharactersData, character.id);
                const caption = `❀ Nombre » *${character.name}*\n⚥ Género » *${character.gender || "Desconocido"}*\n❖ Fuente » *${seriesName}*`;
                
                await conn.sendFile(m.chat, randomVideo, `${character.name}.${randomVideo.endsWith(".mp4") ? "mp4" : 'gif'}`, caption, m);
                break;
            }
        }
    } catch (e) {
        await m.reply(`⚠︎ Se ha producido un problema.\n> Usa *${usedPrefix}report* para informarlo.\n\n${e.message}`);
        console.error(e);
    }
};

handler.help = ["winfo", "wimage", "waifuvideo"];
handler.tags = ["gacha"];
handler.command = ['charinfo', 'winfo', "waifuinfo", "charimage", "waifuimage", "cimage", 'wimage', "charvideo", "waifuvideo", "cvideo", "wvideo"];
handler.group = true;

export default handler;
