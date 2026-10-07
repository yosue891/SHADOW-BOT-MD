import { proto } from "../../WAProto/index.js";
export declare const JS_KEYWORDS: Set<string>;
export declare const PYTHON_KEYWORDS: Set<string>;
export declare const GO_KEYWORDS: Set<string>;
export declare const LUA_KEYWORDS: Set<string>;
export declare const BASH_KEYWORDS: Set<string>;
export declare const LANGUAGE_KEYWORDS: Record<string, Set<string>>;
export declare enum CodeHighlightType {
  DEFAULT = 0,
  KEYWORD = 1,
  METHOD = 2,
  STRING = 3,
  NUMBER = 4,
  COMMENT = 5,
}
export declare enum RichSubMessageType {
  UNKNOWN = 0,
  GRID_IMAGE = 1,
  TEXT = 2,
  INLINE_IMAGE = 3,
  TABLE = 4,
  CODE = 5,
  DYNAMIC = 6,
  MAP = 7,
  LATEX = 8,
  CONTENT_ITEMS = 9,
}
export interface RichMessageOptions {
  headerText?: string;
  footer?: string;
  title?: string;
  language?: string;
}
export interface CodeBlockOptions extends RichMessageOptions {
  language?: string;
}
export interface LatexExpression {
  latexExpression: string;
  url: string;
  width: number;
  height: number;
  fontHeight?: number;
  imageTopPadding?: number;
  imageLeadingPadding?: number;
  imageBottomPadding?: number;
  imageTrailingPadding?: number;
}
export interface LatexOptions extends RichMessageOptions {
  text?: string;
  expressions: LatexExpression[];
}
export interface LatexImageOptions extends RichMessageOptions {
  text?: string;
  expressions: {
    latexExpression: string;
  }[];
}
export type LatexRenderFn = (latex: string) => Promise<{
  buffer: Buffer;
  width: number;
  height: number;
}>;
export type MediaUploadFn = (
  imageBuffer: Buffer,
  mediaType: string,
) => Promise<{
  url: string;
  directPath: string;
}>;
export interface UnifiedResponseOptions {
  data: Buffer | Uint8Array;
  headerText?: string;
  footer?: string;
}
export interface CapturedUnifiedResponse {
  unifiedResponse: {
    data: Uint8Array;
  };
  submessages: any[];
  contextInfo: any;
}
export interface QuotedMessage {
  key: {
    id?: string | null;
    participant?: string | null;
    remoteJid?: string | null;
    fromMe?: boolean | null;
  };
  sender?: string;
  message?: proto.IMessage | null;
}
interface CodeToken {
  highlightType: number;
  codeContent: string;
}
export declare const tokenizeCode: (
  codeStr: string,
  language?: string,
) => CodeToken[];
export declare const buildRichContextInfo: (
  quoted?: QuotedMessage | null,
) => Record<string, any>;
export declare const buildBotForwardedMessage: (
  submessages: any[],
  contextInfo: Record<string, any>,
  unifiedResponse?: {
    data: Buffer | Uint8Array;
  } | null,
) => any;
export declare const generateTableContent: (
  title: string,
  headers: string[],
  rows: string[][],
  quoted?: QuotedMessage | null,
  options?: RichMessageOptions,
) => {
  message: any;
  messageId: string;
};
export declare const generateListContent: (
  title: string,
  items: (string | string[])[],
  quoted?: QuotedMessage | null,
  options?: RichMessageOptions,
) => {
  message: any;
  messageId: string;
};
export declare const generateCodeBlockContent: (
  code: string,
  quoted?: QuotedMessage | null,
  options?: CodeBlockOptions,
) => {
  message: any;
  messageId: string;
};
export declare const generateLatexContent: (
  quoted: QuotedMessage | null | undefined,
  options: LatexOptions,
) => {
  message: any;
  messageId: string;
};
export declare const generateLatexImageContent: (
  quoted: QuotedMessage | null | undefined,
  options: LatexImageOptions,
  uploadFn: MediaUploadFn,
  renderLatexToPng: LatexRenderFn,
) => Promise<{
  message: any;
  messageId: string;
}>;
export declare const generateLatexInlineImageContent: (
  quoted: QuotedMessage | null | undefined,
  options: LatexImageOptions,
  uploadFn: MediaUploadFn,
  renderLatexToPng: LatexRenderFn,
) => Promise<{
  message: any;
  messageId: string;
}>;
export declare const captureUnifiedResponse: (
  msg: proto.IMessage,
) => CapturedUnifiedResponse | null;
export declare const generateUnifiedResponseContent: (
  quoted: QuotedMessage | null | undefined,
  captured: CapturedUnifiedResponse,
) => {
  message: any;
  messageId: string;
};
export declare const generateRichMessageContent: (
  submessages: any[],
  quoted?: QuotedMessage | null,
) => {
  message: any;
  messageId: string;
};
export interface CodeBlockV2Options extends RichMessageOptions {
  language?: string;
  text?: string;
}
interface UnifiedCodeToken {
  content: string;
  type: "DEFAULT" | "KEYWORD" | "METHOD" | "STR" | "NUMBER" | "COMMENT";
}
interface TokenizeCodeV2Result {
  codeBlock: CodeToken[];
  unified_codeBlock: UnifiedCodeToken[];
}
export declare const tokenizeCodeV2: (
  code: string,
  language?: string,
) => TokenizeCodeV2Result;
interface UnifiedTableRow {
  is_header: boolean;
  cells: string[];
}
interface TableMetadataV2Result {
  title: string;
  rows: {
    items: string[];
    isHeading?: boolean;
  }[];
  unified_rows: UnifiedTableRow[];
}
export declare const toTableMetadataV2: (
  arr: string[],
) => TableMetadataV2Result;
export interface TableV2Options extends RichMessageOptions {
  text?: string;
}
export declare const generateTableContentV2: (
  table: string[],
  quoted?: QuotedMessage | null,
  options?: TableV2Options,
) => {
  message: any;
  messageId: string;
};
export declare const generateCodeBlockContentV2: (
  code: string,
  quoted?: QuotedMessage | null,
  options?: CodeBlockV2Options,
) => {
  message: any;
  messageId: string;
};
export interface Citation {
  sourceQuery?: string;
  faviconCdnUrl?: string;
  citationNumber?: number;
  sourceTitle?: string;
}
export interface Proof {
  version?: number;
  useCase?: number;
  signature?: string;
  certificateChain?: string[];
}
export interface LinkMessageOptions extends RichMessageOptions {
  botJid?: string;
  forwardingScore?: number;
  citations?: Citation[];
  proofs?: Proof[];
}
export interface LinkV2MessageOptions extends RichMessageOptions {
  searchEngine?: string;
}
export declare const generateLinkContent: (
  text: string,
  links: (string | { url: string; displayName?: string })[],
  quoted?: QuotedMessage | null,
  options?: LinkMessageOptions,
) => {
  message: any;
  messageId: string;
};
export declare const generateLinkContentV2: (
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
  quoted?: QuotedMessage | null,
  options?: LinkV2MessageOptions,
) => {
  message: any;
  messageId: string;
};
export {};
//# sourceMappingURL=rich-messages.d.ts.map
