import { Jimp } from 'jimp'
const BOARD_MAPS = [
    {
        map: "https://telegra.ph/file/46a0c38104f79cdbfe83f.jpg",
        name: "Classic",
        snakesLadders: {
            2: 38, 7: 14, 8: 31, 15: 26, 21: 42, 28: 84, 36: 44, 51: 67, 78: 98, 71: 91, 87: 94,
            16: 6, 46: 25, 49: 11, 62: 19, 64: 60, 74: 53, 89: 68, 92: 88, 95: 75, 99: 80
        },
        stabil_x: 20,
        stabil_y: 20
    }
];
const PLAYER_IMAGES = [
    "https://telegra.ph/file/30f92f923fb0484f0e4e0.png",
    "https://telegra.ph/file/6e07b5f30b24baedc7822.png",
    "https://telegra.ph/file/34f47137df0dc9aa9c15a.png",
    "https://telegra.ph/file/860b5df98963a1f14a91c.png"
];
const DICE_STICKERS = [
    "https://raw.githubusercontent.com/fgmods/fg-team/main/games/dados/1.webp",
    "https://raw.githubusercontent.com/fgmods/fg-team/main/games/dados/2.webp",
    "https://raw.githubusercontent.com/fgmods/fg-team/main/games/dados/3.webp",
    "https://raw.githubusercontent.com/fgmods/fg-team/main/games/dados/4.webp",
    "https://raw.githubusercontent.com/fgmods/fg-team/main/games/dados/5.webp",
    "https://raw.githubusercontent.com/fgmods/fg-team/main/games/dados/6.webp"
];

/**
 * Draw game board with player positions
 * @param {string} boardImageURL - URL of the board image
 * @param {number|null} user1 - Position of player 1 (1-100) or null
 * @param {number|null} user2 - Position of player 2 (1-100) or null
 * @param {number|null} user3 - Position of player 3 (1-100) or null
 * @param {number|null} user4 - Position of player 4 (1-100) or null
 * @param {number} stabil_x - X offset for calibration
 * @param {number} stabil_y - Y offset for calibration
 * @returns {Promise<Buffer|null>} PNG buffer or null on error
 */
async function drawBoard(boardImageURL, user1 = null, user2 = null, user3 = null, user4 = null, stabil_x = 20, stabil_y = 20) {
    try {
        const board = await Jimp.read(boardImageURL);
        const playerPositions = [user1, user2, user3, user4].map((pos, idx) => ({
            position: pos,
            index: idx
        })).filter(p => p.position !== null && p.position >= 1 && p.position <= 100);

        for (const player of playerPositions) {
            const position = player.position;
            const row = Math.floor((position - 1) / 10);
            const col = (row % 2 === 0) ? (position - 1) % 10 : 9 - (position - 1) % 10;
            const x = col * 60 + stabil_x;
            const y = (9 - row) * 60 + stabil_y;

            try {
                const playerImage = await Jimp.read(PLAYER_IMAGES[player.index]);
                playerImage.resize(50, 50);
                board.composite(playerImage, x - 4, y - 4, {
                    mode: Jimp.BLEND_SOURCE_OVER,
                    opacitySource: 1,
                    opacityDest: 1
                });
            } catch (e) {
                console.log(`[ULARTANGGA] Failed to load player ${player.index} image:`, e.message);
            }
        }

        return await board.getBufferAsync(Jimp.MIME_PNG);
    } catch (error) {
        console.error('[ULARTANGGA] Error drawing board:', error.message);
        return null;
    }
}

/**
 * Get random board map configuration
 * @returns {Object} Map configuration
 */
function getRandomMap() {
    return BOARD_MAPS[Math.floor(Math.random() * BOARD_MAPS.length)];
}

export { drawBoard, getRandomMap, BOARD_MAPS, PLAYER_IMAGES, DICE_STICKERS }