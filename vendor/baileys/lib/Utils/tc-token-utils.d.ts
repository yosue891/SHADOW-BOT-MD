import type { SignalKeyStoreWithTransaction } from '../Types/index.js';
import type { BinaryNode } from '../WABinary/index.js';
type TcTokenParams = {
    jid: string;
    baseContent?: BinaryNode[];
    authState: {
        keys: SignalKeyStoreWithTransaction;
    };
};
export declare function buildTcTokenFromJid({ authState, jid, baseContent }: TcTokenParams): Promise<BinaryNode[] | undefined>;
export {};
//# sourceMappingURL=tc-token-utils.d.ts.map