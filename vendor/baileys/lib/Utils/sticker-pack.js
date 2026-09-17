/**
 * Default emojis assigned to stickers when none are provided.
 * Rotates through this list by sticker index.
 */
const DEFAULT_EMOJIS = [
  "😀",
  "😂",
  "😍",
  "🔥",
  "👍",
  "🎉",
  "😎",
  "🤩",
  "💯",
  "🥳",
];

/**
 * Normalize a single sticker entry.
 * Input can be:
 *   - Buffer
 *   - { url: string }
 *   - { sticker: Buffer | { url: string }, emojis?: string[], accessibilityLabel?: string }
 *
 * @param {Buffer | { url: string } | object} entry
 * @param {number} index
 * @returns {{ sticker: Buffer | { url: string }, emojis: string[], accessibilityLabel: string }}
 */
const normalizeSticker = (entry, index) => {
  if (
    Buffer.isBuffer(entry) ||
    (entry &&
      typeof entry === "object" &&
      "url" in entry &&
      !("sticker" in entry))
  ) {
    return {
      sticker: entry,
      emojis: [DEFAULT_EMOJIS[index % DEFAULT_EMOJIS.length]],
      accessibilityLabel: "",
    };
  }
  return {
    sticker: entry.sticker || entry.data,
    emojis: entry.emojis || [DEFAULT_EMOJIS[index % DEFAULT_EMOJIS.length]],
    accessibilityLabel: entry.accessibilityLabel || "",
  };
};

/**
 * Build a stickerPack message object ready to pass to sock.sendMessage.
 *
 * @param {object} options
 * @param {string} options.name - Pack display name
 * @param {string} [options.publisher] - Pack publisher/author name
 * @param {string} [options.description] - Pack description
 * @param {string} [options.packId] - Custom pack ID (auto-generated if omitted)
 * @param {Array<Buffer | { url: string } | { sticker: Buffer | { url: string }, emojis?: string[] }>} options.stickers
 *   List of stickers — accepts raw buffers, URL objects, or full sticker descriptor objects.
 * @param {Buffer | { url: string }} [options.cover]
 *   Tray/cover image. Defaults to the first sticker if omitted.
 * @param {object} [options.contextInfo] - Optional context info (mentions, forwarding, etc.)
 * @returns {{ stickerPack: object }}
 *
 * @example
 * // With buffers
 * await sock.sendMessage(jid, makeStickerPack({
 *     name: 'My Pack',
 *     stickers: [buf1, buf2, buf3]
 * }));
 *
 * @example
 * // With URLs
 * await sock.sendMessage(jid, makeStickerPack({
 *     name: 'Anime Pack',
 *     publisher: 'Ourin AI',
 *     stickers: [
 *         { url: 'https://example.com/s1.webp', emojis: ['😀'] },
 *         { url: 'https://example.com/s2.webp' }
 *     ],
 *     cover: { url: 'https://example.com/cover.jpg' }
 * }));
 */
export const makeStickerPack = ({
  name,
  publisher = "Ourin AI",
  description = "",
  packId,
  stickers = [],
  cover,
  contextInfo,
} = {}) => {
  if (!name) throw new Error("makeStickerPack: name is required");
  if (!stickers.length)
    throw new Error("makeStickerPack: at least one sticker is required");

  const normalizedStickers = stickers.map(normalizeSticker);
  const resolvedCover = cover ?? normalizedStickers[0].sticker;

  return {
    stickerPack: {
      name,
      publisher,
      description,
      ...(packId ? { packId } : {}),
      stickers: normalizedStickers,
      cover: resolvedCover,
    },
    ...(contextInfo ? { contextInfo } : {}),
  };
};
