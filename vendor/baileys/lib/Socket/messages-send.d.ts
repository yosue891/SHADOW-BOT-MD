import { Boom } from "@hapi/boom";
import { proto } from "../../WAProto/index.js";
import type {
  AnyMessageContent,
  MediaConnInfo,
  MessageReceiptType,
  MessageRelayOptions,
  MiscMessageGenerationOptions,
  SocketConfig,
  WAMessage,
  WAMessageKey,
} from "../Types/index.js";
import { MessageRetryManager } from "../Utils/index.js";
import {
  type RichMessageOptions,
  type CodeBlockOptions,
  type CodeBlockV2Options,
  type TableV2Options,
  type LinkMessageOptions,
  type LinkV2MessageOptions,
  type LatexOptions,
  type LatexImageOptions,
  type LatexRenderFn,
  type MediaUploadFn,
  type CapturedUnifiedResponse,
} from "../Utils/rich-messages.js";
import { type BinaryNode, type JidWithDevice } from "../WABinary/index.js";
import { USyncQuery } from "../WAUSync/index.js";
import { Dugong } from "./dugong.js";
export declare const makeMessagesSocket: (config: SocketConfig) => {
  getPrivacyTokens: (jids: string[]) => Promise<any>;
  assertSessions: (jids: string[], force?: boolean) => Promise<boolean>;
  relayMessage: (
    jid: string,
    message: proto.IMessage,
    {
      messageId: msgId,
      participant,
      additionalAttributes,
      additionalNodes,
      useUserDevicesCache,
      useCachedGroupMetadata,
      statusJidList,
    }: MessageRelayOptions,
  ) => Promise<string>;
  sendReceipt: (
    jid: string,
    participant: string | undefined,
    messageIds: string[],
    type: MessageReceiptType,
  ) => Promise<void>;
  sendReceipts: (
    keys: WAMessageKey[],
    type: MessageReceiptType,
  ) => Promise<void>;
  ourin: Dugong;
  readMessages: (keys: WAMessageKey[]) => Promise<void>;
  refreshMediaConn: (forceGet?: boolean) => Promise<MediaConnInfo>;
  waUploadToServer: import("../Types/index.js").WAMediaUploadFunction;
  fetchPrivacySettings: (force?: boolean) => Promise<{
    [_: string]: string;
  }>;
  sendPeerDataOperationMessage: (
    pdoMessage: proto.Message.IPeerDataOperationRequestMessage,
  ) => Promise<string>;
  createParticipantNodes: (
    recipientJids: string[],
    message: proto.IMessage,
    extraAttrs?: BinaryNode["attrs"],
    dsmMessage?: proto.IMessage,
  ) => Promise<{
    nodes: BinaryNode[];
    shouldIncludeDeviceIdentity: boolean;
  }>;
  getUSyncDevices: (
    jids: string[],
    useCache: boolean,
    ignoreZeroDevices: boolean,
  ) => Promise<
    (JidWithDevice & {
      jid: string;
    })[]
  >;
  messageRetryManager: MessageRetryManager | null;
  updateMemberLabel: (jid: string, memberLabel: string) => Promise<string>;
  updateMediaMessage: (message: WAMessage) => Promise<WAMessage>;
  sendStatusMention: (content: any, jids?: string[]) => Promise<WAMessage>;
  swgc: (
    jid: string,
    content: any,
    options?: Record<string, any>,
  ) => Promise<any>;
  sendPreview: (
    jid: string,
    preview: {
      caption?: string;
      text?: string;
      url?: string;
      matchedText?: string;
      title?: string;
      description?: string;
      image?: Buffer | string;
      jpegThumbnail?: Buffer;
      previewType?: number;
      thumbnailHeight?: number;
      thumbnailWidth?: number;
      inviteLinkGroupTypeV2?: string;
    },
    options?: {
      quoted?: any;
      contextInfo?: any;
    },
  ) => Promise<any>;
  sendTable: (
    jid: string,
    title: string,
    headers: string[],
    rows: string[][],
    quoted?: any,
    options?: RichMessageOptions,
  ) => Promise<{
    message: any;
    messageId: string;
  }>;
  sendTableV2: (
    jid: string,
    table: string[],
    quoted?: any,
    options?: TableV2Options,
  ) => Promise<{
    message: any;
    messageId: string;
  }>;
  sendList: (
    jid: string,
    title: string,
    items: (string | string[])[],
    quoted?: any,
    options?: RichMessageOptions,
  ) => Promise<{
    message: any;
    messageId: string;
  }>;
  sendCodeBlock: (
    jid: string,
    code: string,
    quoted?: any,
    options?: CodeBlockOptions,
  ) => Promise<{
    message: any;
    messageId: string;
  }>;
  sendCodeBlockV2: (
    jid: string,
    code: string,
    quoted?: any,
    options?: CodeBlockV2Options,
  ) => Promise<{
    message: any;
    messageId: string;
  }>;
  sendLink: (
    jid: string,
    text: string,
    links: (string | { url: string; displayName?: string })[],
    quoted?: any,
    options?: LinkMessageOptions,
  ) => Promise<{
    message: any;
    messageId: string;
  }>;
  sendLinkV2: (
    jid: string,
    text: string,
    links: (
      | string
      | {
          url: string;
          displayName?: string;
          sourceDisplayName?: string;
          sourceSubtitle?: string;
        }
    )[],
    quoted?: any,
    options?: LinkV2MessageOptions,
  ) => Promise<{
    message: any;
    messageId: string;
  }>;
  sendLatex: (
    jid: string,
    quoted: any,
    options: LatexOptions,
  ) => Promise<{
    message: any;
    messageId: string;
  }>;
  sendLatexImage: (
    jid: string,
    quoted: any,
    options: LatexImageOptions,
    renderLatexToPng: LatexRenderFn,
    uploadFn: MediaUploadFn,
  ) => Promise<{
    message: any;
    messageId: string;
  }>;
  sendLatexInlineImage: (
    jid: string,
    quoted: any,
    options: LatexImageOptions,
    renderLatexToPng: LatexRenderFn,
    uploadFn: MediaUploadFn,
  ) => Promise<{
    message: any;
    messageId: string;
  }>;
  captureUnifiedResponse: (
    msg: proto.IMessage,
  ) => CapturedUnifiedResponse | null;
  sendUnifiedResponse: (
    jid: string,
    quoted: any,
    captured: CapturedUnifiedResponse,
  ) => Promise<{
    message: any;
    messageId: string;
  }>;
  sendRichMessage: (
    jid: string,
    submessages: proto.IAIRichResponseSubMessage[],
    quoted?: any,
    options?: {},
  ) => Promise<{
    message: any;
    messageId: string;
  }>;
  sendMessage: (
    jid: string,
    content: AnyMessageContent,
    options?: MiscMessageGenerationOptions,
  ) => Promise<any>;
  newsletterFetchAllSubscribe: () => Promise<unknown>;
  newsletterMultipleFollow: (jids: string) => Promise<void>;
  newsletterAction: (jid: string, type: string) => Promise<void>;
  cekIDSaluran: (url: string) => Promise<{
    id: any;
    state: any;
    creation_time: number;
    name: any;
    description: any;
    invite: any;
    picture: string;
    preview: string;
    subscribers: number;
    verification: any;
    viewer_metadata: any;
  }>;
  newsletterCreate: (
    name: string,
    description?: string,
  ) => Promise<import("../Types/index.js").NewsletterMetadata>;
  newsletterUpdate: (
    jid: string,
    updates: import("../Types/index.js").NewsletterUpdate,
  ) => Promise<unknown>;
  newsletterSubscribers: (jid: string) => Promise<{
    subscribers: number;
  }>;
  newsletterMetadata: (
    type: "invite" | "jid",
    key: string,
  ) => Promise<import("../Types/index.js").NewsletterMetadata | null>;
  newsletterFollow: (jid: string) => Promise<unknown>;
  newsletterUnfollow: (jid: string) => Promise<unknown>;
  newsletterMute: (jid: string) => Promise<unknown>;
  newsletterUnmute: (jid: string) => Promise<unknown>;
  newsletterUpdateName: (jid: string, name: string) => Promise<unknown>;
  newsletterUpdateDescription: (
    jid: string,
    description: string,
  ) => Promise<unknown>;
  newsletterUpdatePicture: (
    jid: string,
    content: import("../Types/index.js").WAMediaUpload,
  ) => Promise<unknown>;
  newsletterRemovePicture: (jid: string) => Promise<unknown>;
  newsletterReactMessage: (
    jid: string,
    serverId: string,
    reaction?: string,
  ) => Promise<void>;
  newsletterFetchMessages: (
    jid: string,
    count: number,
    since: number,
    after: number,
  ) => Promise<any>;
  subscribeNewsletterUpdates: (jid: string) => Promise<{
    duration: string;
  } | null>;
  newsletterAdminCount: (jid: string) => Promise<number>;
  newsletterChangeOwner: (jid: string, newOwnerJid: string) => Promise<void>;
  newsletterDemote: (jid: string, userJid: string) => Promise<void>;
  newsletterDelete: (jid: string) => Promise<void>;
  groupMetadata: (
    jid: string,
  ) => Promise<import("../Types/index.js").GroupMetadata>;
  groupCreate: (
    subject: string,
    participants: string[],
  ) => Promise<import("../Types/index.js").GroupMetadata>;
  groupLeave: (id: string) => Promise<void>;
  groupUpdateSubject: (jid: string, subject: string) => Promise<void>;
  groupRequestParticipantsList: (jid: string) => Promise<
    {
      [key: string]: string;
    }[]
  >;
  groupRequestParticipantsUpdate: (
    jid: string,
    participants: string[],
    action: "approve" | "reject",
  ) => Promise<
    {
      status: string;
      jid: string | undefined;
    }[]
  >;
  groupParticipantsUpdate: (
    jid: string,
    participants: string[],
    action: import("../Types/index.js").ParticipantAction,
  ) => Promise<
    {
      status: string;
      jid: string | undefined;
      content: BinaryNode;
    }[]
  >;
  groupUpdateDescription: (jid: string, description?: string) => Promise<void>;
  groupInviteCode: (jid: string) => Promise<string | undefined>;
  groupRevokeInvite: (jid: string) => Promise<string | undefined>;
  groupAcceptInvite: (code: string) => Promise<string | undefined>;
  groupRevokeInviteV4: (
    groupJid: string,
    invitedJid: string,
  ) => Promise<boolean>;
  groupAcceptInviteV4: (
    key: string | WAMessageKey,
    inviteMessage: proto.Message.IGroupInviteMessage,
  ) => Promise<any>;
  groupGetInviteInfo: (
    code: string,
  ) => Promise<import("../Types/index.js").GroupMetadata>;
  groupToggleEphemeral: (
    jid: string,
    ephemeralExpiration: number,
  ) => Promise<void>;
  groupSettingUpdate: (
    jid: string,
    setting: "announcement" | "not_announcement" | "locked" | "unlocked",
  ) => Promise<void>;
  groupMemberAddMode: (
    jid: string,
    mode: "admin_add" | "all_member_add",
  ) => Promise<void>;
  groupJoinApprovalMode: (jid: string, mode: "on" | "off") => Promise<void>;
  groupFetchAllParticipating: () => Promise<{
    [_: string]: import("../Types/index.js").GroupMetadata;
  }>;
  createCallLink: (
    type: "audio" | "video",
    event?: {
      startTime: number;
    },
    timeoutMs?: number,
  ) => Promise<string | undefined>;
  getBotListV2: () => Promise<import("../Types/index.js").BotListInfo[]>;
  messageMutex: {
    mutex<T>(code: () => Promise<T> | T): Promise<T>;
  };
  receiptMutex: {
    mutex<T>(code: () => Promise<T> | T): Promise<T>;
  };
  appStatePatchMutex: {
    mutex<T>(code: () => Promise<T> | T): Promise<T>;
  };
  notificationMutex: {
    mutex<T>(code: () => Promise<T> | T): Promise<T>;
  };
  upsertMessage: (
    msg: WAMessage,
    type: import("../Types/index.js").MessageUpsertType,
  ) => Promise<void>;
  appPatch: (
    patchCreate: import("../Types/index.js").WAPatchCreate,
  ) => Promise<void>;
  sendPresenceUpdate: (
    type: import("../Types/index.js").WAPresence,
    toJid?: string,
  ) => Promise<void>;
  presenceSubscribe: (toJid: string) => Promise<void>;
  profilePictureUrl: (
    jid: string,
    type?: "preview" | "image",
    timeoutMs?: number,
  ) => Promise<string | undefined>;
  fetchBlocklist: () => Promise<(string | undefined)[]>;
  fetchStatus: (
    ...jids: string[]
  ) => Promise<
    import("../WAUSync/index.js").USyncQueryResultList[] | undefined
  >;
  fetchDisappearingDuration: (
    ...jids: string[]
  ) => Promise<
    import("../WAUSync/index.js").USyncQueryResultList[] | undefined
  >;
  updateProfilePicture: (
    jid: string,
    content: import("../Types/index.js").WAMediaUpload,
    dimensions?: {
      width: number;
      height: number;
    },
  ) => Promise<void>;
  removeProfilePicture: (jid: string) => Promise<void>;
  updateProfileStatus: (status: string) => Promise<void>;
  updateProfileName: (name: string) => Promise<void>;
  updateBlockStatus: (
    jid: string,
    action: "block" | "unblock",
  ) => Promise<void>;
  updateDisableLinkPreviewsPrivacy: (
    isPreviewsDisabled: boolean,
  ) => Promise<void>;
  updateCallPrivacy: (
    value: import("../Types/index.js").WAPrivacyCallValue,
  ) => Promise<void>;
  updateMessagesPrivacy: (
    value: import("../Types/index.js").WAPrivacyMessagesValue,
  ) => Promise<void>;
  updateLastSeenPrivacy: (
    value: import("../Types/index.js").WAPrivacyValue,
  ) => Promise<void>;
  updateOnlinePrivacy: (
    value: import("../Types/index.js").WAPrivacyOnlineValue,
  ) => Promise<void>;
  updateProfilePicturePrivacy: (
    value: import("../Types/index.js").WAPrivacyValue,
  ) => Promise<void>;
  updateStatusPrivacy: (
    value: import("../Types/index.js").WAPrivacyValue,
  ) => Promise<void>;
  updateReadReceiptsPrivacy: (
    value: import("../Types/index.js").WAReadReceiptsValue,
  ) => Promise<void>;
  updateGroupsAddPrivacy: (
    value: import("../Types/index.js").WAPrivacyGroupAddValue,
  ) => Promise<void>;
  updateDefaultDisappearingMode: (duration: number) => Promise<void>;
  getBusinessProfile: (
    jid: string,
  ) => Promise<import("../Types/index.js").WABusinessProfile | void>;
  resyncAppState: (
    collections: readonly (
      | "critical_unblock_low"
      | "regular_high"
      | "regular_low"
      | "critical_block"
      | "regular"
    )[],
    isInitialSync: boolean,
  ) => Promise<void>;
  chatModify: (
    mod: import("../Types/index.js").ChatModification,
    jid: string,
  ) => Promise<void>;
  cleanDirtyBits: (
    type: "account_sync" | "groups",
    fromTimestamp?: number | string,
  ) => Promise<void>;
  addOrEditContact: (
    jid: string,
    contact: proto.SyncActionValue.IContactAction,
  ) => Promise<void>;
  removeContact: (jid: string) => Promise<void>;
  addLabel: (
    jid: string,
    labels: import("../Types/Label.js").LabelActionBody,
  ) => Promise<void>;
  addChatLabel: (jid: string, labelId: string) => Promise<void>;
  removeChatLabel: (jid: string, labelId: string) => Promise<void>;
  addMessageLabel: (
    jid: string,
    messageId: string,
    labelId: string,
  ) => Promise<void>;
  removeMessageLabel: (
    jid: string,
    messageId: string,
    labelId: string,
  ) => Promise<void>;
  star: (
    jid: string,
    messages: {
      id: string;
      fromMe?: boolean;
    }[],
    star: boolean,
  ) => Promise<void>;
  addOrEditQuickReply: (
    quickReply: import("../Types/Bussines.js").QuickReplyAction,
  ) => Promise<void>;
  removeQuickReply: (timestamp: string) => Promise<void>;
  type: "md";
  ws: import("./Client/websocket.js").WebSocketClient;
  ev: import("../Types/index.js").BaileysEventEmitter & {
    process(
      handler: (
        events: Partial<import("../Types/index.js").BaileysEventMap>,
      ) => void | Promise<void>,
    ): () => void;
    buffer(): void;
    createBufferedFunction<A extends any[], T>(
      work: (...args: A) => Promise<T>,
    ): (...args: A) => Promise<T>;
    flush(): boolean;
    isBuffering(): boolean;
  };
  authState: {
    creds: import("../Types/index.js").AuthenticationCreds;
    keys: import("../Types/index.js").SignalKeyStoreWithTransaction;
  };
  signalRepository: import("../Types/index.js").SignalRepositoryWithLIDStore;
  user: import("../Types/index.js").Contact | undefined;
  generateMessageTag: () => string;
  query: (node: BinaryNode, timeoutMs?: number) => Promise<any>;
  waitForMessage: <T>(
    msgId: string,
    timeoutMs?: number | undefined,
  ) => Promise<T | undefined>;
  waitForSocketOpen: () => Promise<void>;
  sendRawMessage: (data: Uint8Array | Buffer) => Promise<void>;
  sendNode: (frame: BinaryNode) => Promise<void>;
  logout: (msg?: string) => Promise<void>;
  end: (error: Error | undefined) => Promise<void>;
  onUnexpectedError: (err: Error | Boom, msg: string) => void;
  uploadPreKeys: (count?: number, retryCount?: number) => Promise<void>;
  uploadPreKeysToServerIfRequired: () => Promise<void>;
  digestKeyBundle: () => Promise<void>;
  rotateSignedPreKey: () => Promise<void>;
  requestPairingCode: (
    phoneNumber: string,
    customPairingCode?: string,
  ) => Promise<string>;
  updateServerTimeOffset: ({ attrs }: BinaryNode) => void;
  sendUnifiedSession: () => Promise<void>;
  wamBuffer: import("../index.js").BinaryInfo;
  waitForConnectionUpdate: (
    check: (
      u: Partial<import("../Types/index.js").ConnectionState>,
    ) => Promise<boolean | undefined>,
    timeoutMs?: number,
  ) => Promise<void>;
  sendWAMBuffer: (wamBuffer: Buffer) => Promise<any>;
  executeUSyncQuery: (
    usyncQuery: USyncQuery,
  ) => Promise<import("../WAUSync/index.js").USyncQueryResult | undefined>;
  onWhatsApp: (...phoneNumber: string[]) => Promise<
    | {
        jid: string;
        exists: boolean;
      }[]
    | undefined
  >;
};
//# sourceMappingURL=messages-send.d.ts.map
