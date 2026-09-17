import { randomUUID, getRandomValues } from 'crypto';
import { proto } from '../../WAProto/index.js';
import { CodeHighlightType, RichSubMessageType } from '../Types/RichType.js';
import { LANGUAGE_KEYWORDS } from '../WABinary/language-keywords.js';

const LEXER_REGEX = /(\/\/[^\n]*|\/\*[\s\S]*?\*\/|"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|`(?:[^`\\]|\\.)*`|\b\d+\.?\d*\b|\b[a-zA-Z_$][\w$]*\b|\s+|[^\s\w$]+)/g;
const NOOP = new Set([]);

const tokenizeCode = (code, language = 'javascript') => {
    const keywords = LANGUAGE_KEYWORDS[language] || NOOP;
    const blocks = [];
    LEXER_REGEX.lastIndex = 0;
    let match;
    while ((match = LEXER_REGEX.exec(code)) !== null) {
        if (match[1]) {
            blocks.push({ highlightType: CodeHighlightType.COMMENT, codeContent: match[1] });
        } else if (match[2]) {
            blocks.push({ highlightType: CodeHighlightType.STRING, codeContent: match[2] });
        } else if (match[3]) {
            blocks.push({
                highlightType: keywords.has(match[3]) ? CodeHighlightType.KEYWORD : CodeHighlightType.METHOD,
                codeContent: match[3]
            });
        } else if (match[4]) {
            blocks.push({
                highlightType: keywords.has(match[4]) ? CodeHighlightType.KEYWORD : CodeHighlightType.DEFAULT,
                codeContent: match[4]
            });
        } else if (match[5]) {
            blocks.push({ highlightType: CodeHighlightType.NUMBER, codeContent: match[5] });
        } else {
            blocks.push({ highlightType: CodeHighlightType.DEFAULT, codeContent: match[6] });
        }
    }
    return blocks;
};

const toUnified = (submessages, uuid) => ({
    response_id: uuid || randomUUID(),
    sections: submessages.map(submessage => {
        switch (submessage.messageType) {
            case RichSubMessageType.CODE: {
                const codeMetadata = submessage.codeMetadata;
                return {
                    view_model: {
                        primitive: {
                            language: codeMetadata.codeLanguage,
                            code_blocks: codeMetadata.codeBlocks.map(block => ({
                                content: block.codeContent,
                                type: CodeHighlightType[block.highlightType]
                            })),
                            __typename: 'GenAICodeUXPrimitive'
                        },
                        __typename: 'GenAISingleLayoutViewModel'
                    }
                };
            }
            case RichSubMessageType.TABLE: {
                const tableMetadata = submessage.tableMetadata;
                return {
                    view_model: {
                        primitive: {
                            title: tableMetadata.title,
                            rows: tableMetadata.rows.map(row => ({
                                is_header: row.isHeading,
                                cells: row.items,
                                markdown_cells: row.items.map(item => ({ text: item }))
                            })),
                            __typename: 'GenATableUXPrimitive'
                        },
                        __typename: 'GenAISingleLayoutViewModel'
                    }
                };
            }
            case RichSubMessageType.TEXT:
                return {
                    view_model: {
                        primitive: {
                            text: submessage.messageText,
                            inline_entities: submessage.inlineEntities || [],
                            __typename: 'GenAIMarkdownTextUXPrimitive'
                        },
                        __typename: 'GenAISingleLayoutViewModel'
                    }
                };
        }
        return submessage;
    })
});

const botMetadataSignature = () => {
    const signature = new Uint8Array(64);
    getRandomValues(signature);
    return signature;
};

const botMetadataCertificate = (length = 685) => {
    const certificate = new Uint8Array(length);
    certificate[0] = 48;
    certificate[1] = 130;
    getRandomValues(certificate.subarray(2));
    return certificate;
};

const wrapToBotForwardedMessage = richResponseMessage => ({
    messageContextInfo: {
        botMetadata: {
            verificationMetadata: {
                proofs: [
                    {
                        certificateChain: [
                            botMetadataCertificate(),
                            botMetadataCertificate(892)
                        ],
                        version: 1,
                        useCase: 1,
                        signature: botMetadataSignature()
                    }
                ]
            }
        }
    },
    botForwardedMessage: {
        message: { richResponseMessage }
    }
});

const prepareRichResponseMessage = content => {
    const {
        alignment, code, contentText, disclaimerText, footerText, headerText,
        imageText, inlineImage, inlineVideo, items, language, latex, links,
        noHeading, posts, products, suggested, richResponse, table, tapLinkUrl, title
    } = content;

    let submessages = [];

    if (Array.isArray(richResponse)) {
        submessages = richResponse.map(submessage => {
            if (submessage.text) {
                return { messageType: RichSubMessageType.TEXT, messageText: submessage.text, inlineEntities: submessage.inlineEntities };
            } else if (submessage.code) {
                return {
                    messageType: RichSubMessageType.CODE,
                    codeMetadata: {
                        codeLanguage: submessage.language || 'javascript',
                        codeBlocks: typeof submessage.code === 'string'
                            ? tokenizeCode(submessage.code, submessage.language || 'javascript')
                            : submessage.code
                    }
                };
            } else if (submessage.table) {
                return {
                    messageType: RichSubMessageType.TABLE,
                    tableMetadata: { title: submessage.title, rows: submessage.table }
                };
            }
            return submessage;
        });
    } else {
        if (headerText) submessages.push({ messageType: RichSubMessageType.TEXT, messageText: headerText });
        if (contentText) submessages.push({ messageType: RichSubMessageType.TEXT, messageText: contentText });
        if (code) {
            const lang = language || 'javascript';
            submessages.push({
                messageType: RichSubMessageType.CODE,
                codeMetadata: { codeLanguage: lang, codeBlocks: tokenizeCode(code, lang) }
            });
        }
        if (links) {
            links.forEach((linkField, index) => {
                const prefix = 'SS_' + index;
                submessages.push({
                    messageType: RichSubMessageType.TEXT,
                    messageText: linkField.text + ` {{${prefix}}}1{{/${prefix}}} `,
                    inlineEntities: [{
                        key: prefix,
                        metadata: {
                            reference_id: index + 1,
                            reference_url: linkField.url || '',
                            reference_title: linkField.title || 'Reference',
                            reference_display_name: linkField.displayName || 'Source',
                            sources: [],
                            __typename: 'GenAISearchCitationItem'
                        }
                    }]
                });
            });
        }
        if (table) {
            submessages.push({
                messageType: RichSubMessageType.TABLE,
                tableMetadata: {
                    title,
                    rows: table.map((items, index) => ({ isHeading: !noHeading && index === 0, items }))
                }
            });
        }
        if (footerText) submessages.push({ messageType: RichSubMessageType.TEXT, messageText: footerText });
    }

    const uuid = randomUUID();
    const unified = toUnified(submessages, uuid);

    const richResponseMessage = proto.AIRichResponseMessage.create({
        submessages,
        messageType: proto.AIRichResponseMessageType.AI_RICH_RESPONSE_TYPE_STANDARD,
        unifiedResponse: { data: Buffer.from(JSON.stringify(unified)) },
        contextInfo: {
            isForwarded: true,
            forwardingScore: 1,
            forwardedAiBotMessageInfo: { botJid: '867051314767696@bot' },
            forwardOrigin: 4
        }
    });

    const message = wrapToBotForwardedMessage(richResponseMessage);
    const botMetadata = message.messageContextInfo.botMetadata;
    if (disclaimerText) botMetadata.messageDisclaimerText = disclaimerText;
    botMetadata.botResponseId = uuid;

    return message;
};

export {
    toUnified,
    prepareRichResponseMessage,
    botMetadataSignature,
    botMetadataCertificate,
    wrapToBotForwardedMessage
};
