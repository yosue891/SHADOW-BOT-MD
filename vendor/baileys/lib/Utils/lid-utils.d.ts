import type { WASocket } from '../Socket/index.js';

export interface LidParticipant {
    id?: string;
    jid?: string;
    lid?: string;
    phoneNumber?: string;
    admin?: string | null;
}

export interface LidMessage {
    key: {
        participant?: string;
        remoteJid?: string;
    };
    participantPn?: string;
}

/**
 * Cek apakah JID adalah format LID
 */
export declare const isLid: (jid: string | undefined) => boolean;

/**
 * Cek apakah JID adalah hasil konversi LID yang salah
 */
export declare const isLidConverted: (jid: string | undefined) => boolean;

/**
 * Convert LID ke format JID standard @s.whatsapp.net
 */
export declare const lidToJid: (jid: string) => string;

/**
 * Versi lidToJid yang aman, mengembalikan null jika tidak bisa convert
 */
export declare const lidToJidSafe: (jid: string) => string | null;

/**
 * Extract nomor dari JID apapun (termasuk LID)
 */
export declare const extractNumber: (jid: string) => Promise<string>;

/**
 * Resolve LID atau LID-converted JID ke JID asli menggunakan group metadata
 */
export declare const resolveLidFromParticipants: (
    jid: string,
    participants?: LidParticipant[]
) => string;

/**
 * Resolve JID yang mungkin LID-converted ke JID asli
 * Menangani cache, group participants, dan deteksi LID yang salah
 */
export declare const resolveAnyLidToJid: (
    jid: string,
    participants?: LidParticipant[]
) => string;

/**
 * Convert array of JIDs, replacing any LIDs or LID-converted JIDs
 */
export declare const convertLidArray: (
    jids: string[],
    participants?: LidParticipant[]
) => string[];

/**
 * Decode JID dan kembalikan dalam format standard
 */
export declare const decodeAndNormalize: (jid: string) => string | null;

/**
 * Konversi participant JID dari message
 */
export declare const resolveParticipant: (
    msg: LidMessage,
    sock?: WASocket
) => Promise<string | null>;

/**
 * Helper untuk mendapatkan JID asli dari participant
 */
export declare const getParticipantJid: (participant: LidParticipant) => string;

/**
 * Convert semua participant IDs ke format yang bisa di-mention
 */
export declare const getParticipantJids: (participants?: LidParticipant[]) => string[];

/**
 * Cari participant berdasarkan nomor telepon
 */
export declare const findParticipantByNumber: (
    participants: LidParticipant[],
    targetJid: string
) => LidParticipant | null;

/**
 * Cache LID to JID mapping dari array participant
 */
export declare const cacheParticipantLids: (participants?: LidParticipant[]) => void;

/**
 * Get cached JID for a LID
 */
export declare const getCachedJid: (lid: string) => string | null;

/**
 * Normalize JID ke nomor telepon (tanpa suffix @s.whatsapp.net atau @lid)
 */
export declare const normalizeToPhoneNumber: (
    jid: string,
    participants?: LidParticipant[]
) => string;

/**
 * Simpan mapping LID-JID ke cache
 */
export declare const cacheLidJid: (lid: string, jid: string) => void;

/**
 * Resolve JID menggunakan sock.signalRepository o sock.store
 */
export declare const resolveFromSock: (
    jid: string,
    sock?: WASocket
) => Promise<string>;

/**
 * Get jumlah item di LID cache
 */
export declare const getLidCacheSize: () => number;

/**
 * Simpan cache ke disk secara manual
 */
export declare const savePersistentCache: () => void;
