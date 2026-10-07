import type { StickerPackContent } from '../Types/Message.js';
export type MakeStickerPackOptions = StickerPackContent & {
  contextInfo?: any;
};
export declare const makeStickerPack: (
  options?: MakeStickerPackOptions,
) => {
  stickerPack: StickerPackContent;
  contextInfo?: any;
};
