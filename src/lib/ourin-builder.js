/**
 * Do not remove this watermark.
 *
 * NIXCODE - Advanced WhatsApp Interactive Message Builder
 * Built for creating buttons, carousels, native flows,
 * and AI rich response payloads using Baileys with
 * fluent chaining, flexible payload customization,
 * and scalable architecture for modern bot development.
 *
 * Runtime:
 * - Baileys: @whiskeysockets/baileys (latest)
 *
 * Created by Nixel
 * Contributors: ~ Ahmad tumbuh kembang
 *
 * WhatsApp: wa.me/6281234567890
 * Channel: https://whatsapp.com/channel/0029VbArz9fAO7RGy2915k3O
 *
 * Copyright (c) 2026 Nixel
 *
 * Permission is granted to use and modify this library
 * for personal or commercial projects.
 *
 * Reuploading, reselling, relicensing, or redistributing
 * this library as a standalone product is prohibited.
 *
 * Do not claim this project as your own original work.
 */

// Terima kasih buat bang nixel

const VERSION = '4.5';

import { generateWAMessageFromContent, prepareWAMessageMedia } from 'ourin';
import crypto from 'crypto';
import sharp from 'sharp';

function extractIE(text, { extract = true, hyperlink = true, citation = true, latex = true } = {}) {
    if (!extract) {
        return {
            text,
            ie: [],
        };
    }
    let ie = [],
        result = '',
        last = 0,
        citation_index = 1,
        hyperlink_index = 0,
        latex_index = 0,
        stack = [];
    for (let i = 0; i < text.length; i++) {
        if (text[i] == '[' && text[i - 1] != '\\') {
            stack.push(i);
        } else if (text[i] == ']' && (text[i + 1] == '(' || text[i + 1] == '<')) {
            let start = stack.pop();
            if (start == null) continue;
            let open = text[i + 1],
                close = open == '(' ? ')' : '>',
                type = open == '(' ? 'link' : 'latex',
                end = i + 2,
                depth = 1;
            while (end < text.length && depth) {
                if (text[end] == open && text[end - 1] != '\\') depth++;
                else if (text[end] == close && text[end - 1] != '\\') depth--;
                end++;
            }
            if (depth) continue;
            let raw = text.slice(start + 1, i).trim(),
                url = text.slice(i + 2, end - 1).trim(),
                key,
                tag,
                data;
            if (type == 'latex') {
                if (!latex) continue;
                let [txt = '', width = null, height = null, font_height = null, padding = null] = raw.split('|');
                key = `\u004E\u0049\u0058\u0045\u004C_LATEX_${latex_index++}`;
                tag = `{{${key}}}${txt || 'image'}{{/${key}}}`;
                data = {
                    type: 'latex',
                    ie: {
                        key,
                        text: txt,
                        url,
                        width,
                        height,
                        font_height,
                        padding,
                    },
                };
            } else if (raw) {
                if (!hyperlink) continue;
                key = `\u004E\u0049\u0058\u0045\u004C_HYPERLINK_${hyperlink_index++}`;
                tag = `{{${key}}}${url}{{/${key}}}`;
                data = {
                    type: 'hyperlink',
                    ie: {
                        key,
                        text: raw,
                        url,
                    },
                };
            } else {
                if (!citation) continue;
                key = `\u004E\u0049\u0058\u0045\u004C_CITATION_${citation_index - 1}`;
                tag = `{{${key}}}${url}{{/${key}}}`;
                data = {
                    type: 'citation',
                    ie: {
                        reference_id: citation_index++,
                        key,
                        text: '',
                        url,
                    },
                };
            }
            result += text.slice(last, start) + tag;
            last = end;
            ie.push(data);
            i = end - 1;
        }
    }
    result += text.slice(last);
    return {
        text: result,
        ie,
    };
}

class BaseBuilder {
    constructor() {
        this._title = '';
        this._subtitle = '';
        this._body = '';
        this._footer = '';
        this._contextInfo = {};
        this._extraPayload = {};
    }

    setTitle(title) {
        if (typeof title !== 'string') {
            throw new TypeError('Title must be a string');
        }
        this._title = title;
        return this;
    }

    setSubtitle(subtitle) {
        if (typeof subtitle !== 'string') {
            throw new TypeError('Subtitle must be a string');
        }
        this._subtitle = subtitle;
        return this;
    }

    setBody(body) {
        if (typeof body !== 'string') {
            throw new TypeError('Body must be a string');
        }
        this._body = body;
        return this;
    }

    setFooter(footer) {
        if (typeof footer !== 'string') {
            throw new TypeError('Footer must be a string');
        }
        this._footer = footer;
        return this;
    }

    setContextInfo(obj) {
        if (typeof obj !== 'object' || obj === null || Array.isArray(obj)) {
            throw new TypeError('ContextInfo must be a plain object');
        }

        this._contextInfo = obj;
        return this;
    }

    addPayload(obj) {
        if (typeof obj !== 'object' || obj === null || Array.isArray(obj)) {
            throw new TypeError('Payload must be a plain object');
        }

        Object.assign(this._extraPayload, obj);

        return this;
    }

    static async resize(buffer, x, y, fit = 'cover') {
        return await sharp(buffer)
            .resize(x, y, {
                fit,
                position: 'center',
                background: { r: 0, g: 0, b: 0, alpha: 0 },
            })
            .png()
            .toBuffer();
    }

    static async fetchBuffer(url, options = {}, config = {}) {
        try {
            let response = await fetch(url, options);
            if (!response.ok) throw Error(`HTTP ${response.status}`);
            return Buffer.from(await response.arrayBuffer());
        } catch (error) {
            if (config.silent) return Buffer.alloc(0);
            throw error;
        }
    }
}

class Button extends BaseBuilder {
    #client;

    constructor(client) {
        super();
        if (!client) {
            throw new Error('Socket is required');
        }
        this.#client = client;

        this._buttons = [];
        this._data;
        this._currentSelectionIndex = -1;
        this._currentSectionIndex = -1;
        this._params = {};
    }

    setVideo(path, options = {}) {
        if (!path) throw new Error('Url or buffer needed');
        Buffer.isBuffer(path) ? (this._data = { video: path, ...options }) : (this._data = { video: { url: path }, ...options });
        return this;
    }

    setImage(path, options = {}) {
        if (!path) throw new Error('Url or buffer needed');
        Buffer.isBuffer(path) ? (this._data = { image: path, ...options }) : (this._data = { image: { url: path }, ...options });
        return this;
    }

    setDocument(path, options = {}) {
        if (!path) throw new Error('Url or buffer needed');
        Buffer.isBuffer(path) ? (this._data = { document: path, ...options }) : (this._data = { document: { url: path }, ...options });
        return this;
    }

    setMedia(obj) {
        if (typeof obj !== 'object' || obj === null || Array.isArray(obj)) {
            throw new TypeError('Media must be a plain object');
        }

        this._data = obj;
        return this;
    }

    clearButtons() {
        this._buttons = [];
        return this;
    }

    setParams(obj) {
        this._params = obj;
        return this;
    }

    addButton(name, params) {
        this._buttons.push({
            name,
            buttonParamsJson: typeof params === 'string' ? params : JSON.stringify(params),
        });

        return this;
    }

    makeRow(header = '', title = '', description = '', id = '') {
        if (this._currentSelectionIndex === -1 || this._currentSectionIndex === -1) {
            throw new Error('You need to create a selection and a section first');
        }
        const buttonParams = JSON.parse(this._buttons[this._currentSelectionIndex].buttonParamsJson);
        buttonParams.sections[this._currentSectionIndex].rows.push({ header, title, description, id });
        this._buttons[this._currentSelectionIndex].buttonParamsJson = JSON.stringify(buttonParams);
        return this;
    }

    makeSection(title = '', highlight_label = '') {
        if (this._currentSelectionIndex === -1) {
            throw new Error('You need to create a selection first');
        }
        const buttonParams = JSON.parse(this._buttons[this._currentSelectionIndex].buttonParamsJson);
        buttonParams.sections.push({ title, highlight_label, rows: [] });
        this._currentSectionIndex = buttonParams.sections.length - 1;
        this._buttons[this._currentSelectionIndex].buttonParamsJson = JSON.stringify(buttonParams);
        return this;
    }

    addSelection(title, options = {}) {
        this._buttons.push({ ...options, name: 'single_select', buttonParamsJson: JSON.stringify({ title, sections: [] }) });
        this._currentSelectionIndex = this._buttons.length - 1;
        this._currentSectionIndex = -1;
        return this;
    }

    addReply(display_text = '', id = '', options = {}) {
        this._buttons.push({
            name: 'quick_reply',
            buttonParamsJson: JSON.stringify({
                display_text,
                id,
                ...options,
            }),
        });
        return this;
    }

    addCall(display_text = '', id = '', options = {}) {
        this._buttons.push({
            name: 'cta_call',
            buttonParamsJson: JSON.stringify({
                display_text,
                id,
                ...options,
            }),
        });
        return this;
    }

    addReminder(display_text = '', id = '', options = {}) {
        this._buttons.push({
            name: 'cta_reminder',
            buttonParamsJson: JSON.stringify({
                display_text,
                id,
                ...options,
            }),
        });
        return this;
    }

    addCancelReminder(display_text = '', id = '', options = {}) {
        this._buttons.push({
            name: 'cta_cancel_reminder',
            buttonParamsJson: JSON.stringify({
                display_text,
                id,
                ...options,
            }),
        });
        return this;
    }

    addAddress(display_text = '', id = '', options = {}) {
        this._buttons.push({
            name: 'address_message',
            buttonParamsJson: JSON.stringify({
                display_text,
                id,
                ...options,
            }),
        });
        return this;
    }

    addLocation(options = {}) {
        this._buttons.push({
            name: 'send_location',
            buttonParamsJson: JSON.stringify(options),
        });
        return this;
    }

    addUrl(display_text = '', url = '', webview_interaction = false, options = {}) {
        this._buttons.push({
            ...options,
            name: 'cta_url',
            buttonParamsJson: JSON.stringify({
                display_text,
                url,
                webview_interaction,
                ...options,
            }),
        });
        return this;
    }

    addCopy(display_text = '', copy_code = '', options = {}) {
        this._buttons.push({
            name: 'cta_copy',
            buttonParamsJson: JSON.stringify({
                display_text,
                copy_code,
                ...options,
            }),
        });
        return this;
    }

    static paramsList = {
        limited_time_offer: {
            text: 'string',
            url: 'string',
            copy_code: 'string',
            expiration_time: 'number',
        },
        bottom_sheet: {
            in_thread_buttons_limit: 'number',
            divider_indices: ['number'],
            list_title: 'string',
            button_title: 'string',
        },
        tap_target_configuration: {
            title: 'string',
            description: 'string',
            canonical_url: 'string',
            domain: 'string',
            buttonIndex: 'number',
        },
    };

    async toCard() {
        return {
            body: {
                text: this._body,
            },
            footer: {
                text: this._footer,
            },
            header: {
                title: this._title,
                subtitle: this._subtitle,
                hasMediaAttachment: !!this._data,
                ...(this._data
                    ? await prepareWAMessageMedia(this._data, { upload: this.#client.waUploadToServer }).catch((e) => {
                        if (String(e).includes('Invalid media type')) return this._data;
                        throw e;
                    })
                    : {}),
            },
            nativeFlowMessage: {
                messageParamsJson: JSON.stringify(this._params),
                buttons: this._buttons,
            },
        };
    }

    async build(jid, { ...options } = {}) {
        const message = await this.toCard();

        return generateWAMessageFromContent(
            jid,
            {
                ...this._extraPayload,
                interactiveMessage: {
                    ...message,
                    contextInfo: this._contextInfo,
                },
            },
            { ...options }
        );
    }

    async send(jid, { ...options } = {}) {
        const msg = await this.build(jid, options);

        await this.#client.relayMessage(msg.key.remoteJid, msg.message, {
            messageId: msg.key.id,
            additionalNodes: [
                {
                    tag: 'biz',
                    attrs: {},
                    content: [
                        {
                            tag: 'interactive',
                            attrs: { type: 'native_flow', v: '1' },
                            content: [{ tag: 'native_flow', attrs: { v: '9', name: 'mixed' } }],
                        },
                    ],
                },
            ],
            ...options,
        });
        return msg;
    }
}

class ButtonV2 extends BaseBuilder {
    #client;

    constructor(client) {
        super();
        if (!client) {
            throw new Error('Socket is required');
        }

        this.#client = client;
        this._image;
        this._data;
        this._buttons = [];
    }

    addButton(displayText = '', buttonId = crypto.randomUUID()) {
        this._buttons.push({
            buttonId,
            buttonText: { displayText },
            type: 1,
        });
        return this;
    }

    addRawButton(obj) {
        if (typeof obj !== 'object' || obj === null || Array.isArray(obj)) {
            throw new TypeError('Buttons must be a plain object');
        }

        this._buttons.push(obj);
        return this;
    }

    setThumbnail(path) {
        if (!path) throw new Error('Url or buffer needed');
        this._image = path;
        return this;
    }

    setMedia(obj) {
        if (typeof obj !== 'object' || obj === null || Array.isArray(obj)) {
            throw new TypeError('Media must be a plain object');
        }

        this._data = obj;
        return this;
    }

    async build(jid, { ...options } = {}) {
        let _thumbnail = this._image ? await BaseBuilder.resize(Buffer.isBuffer(this._image) ? this._image : await BaseBuilder.fetchBuffer(this._image, {}, { silent: true }), 300, 300) : null;
        const msg = generateWAMessageFromContent(
            jid,
            {
                ...this._extraPayload,
                buttonsMessage: {
                    contentText: this._body,
                    footerText: this._footer,
                    ...(this._data
                        ? this._data
                        : {
                            headerType: 6,
                            locationMessage: {
                                degreesLatitude: 0,
                                degreesLongitude: 0,
                                name: this._title,
                                address: this._subtitle,
                                jpegThumbnail: _thumbnail,
                            },
                        }),
                    viewOnce: true,
                    contextInfo: this._contextInfo,
                    buttons: [...this._buttons],
                },
            },
            { ...options }
        );
        return msg;
    }

    async send(jid, { ...options } = {}) {
        if (this._buttons.length < 1) throw new Error('ButtonV2 requires at least one button');
        const msg = await this.build(jid, options);

        await this.#client.relayMessage(msg.key.remoteJid, msg.message, {
            messageId: msg.key.id,
            additionalNodes: [
                {
                    tag: 'biz',
                    attrs: {},
                    content: [
                        {
                            tag: 'interactive',
                            attrs: { type: 'native_flow', v: '1' },
                            content: [{ tag: 'native_flow', attrs: { v: '9', name: 'mixed' } }],
                        },
                    ],
                },
            ],
            ...options,
        });
        return msg;
    }
}

class Carousel extends BaseBuilder {
    #client;

    constructor(client) {
        super();
        if (!client) {
            throw new Error('Socket is required');
        }

        this.#client = client;
        this._cards = [];
    }

    addCard(card) {
        const cards = Array.isArray(card) ? card : [card];
        const baseIndex = this._cards.length;

        for (const [index, c] of cards.entries()) {
            if (!c?.header?.hasMediaAttachment) {
                throw new Error(`Card [${baseIndex + index}] must include an image or video in header`);
            }
        }

        this._cards.push(...cards);
        return this;
    }

    build(jid, { ...options } = {}) {
        return generateWAMessageFromContent(
            jid,
            {
                ...this._extraPayload,
                interactiveMessage: {
                    header: {
                        hasMediaAttachment: false,
                    },
                    body: { text: this._body },
                    footer: { text: this._footer },
                    contextInfo: this._contextInfo,
                    carouselMessage: {
                        cards: this._cards,
                    },
                },
            },
            { ...options }
        );
    }

    async send(jid, { ...options } = {}) {
        const msg = this.build(jid, options);

        await this.#client.relayMessage(msg.key.remoteJid, msg.message, {
            messageId: msg.key.id,
            additionalNodes: [
                {
                    tag: 'biz',
                    attrs: {},
                    content: [
                        {
                            tag: 'interactive',
                            attrs: { type: 'native_flow', v: '1' },
                            content: [{ tag: 'native_flow', attrs: { v: '9', name: 'mixed' } }],
                        },
                    ],
                },
            ],
            ...options,
        });
        return msg;
    }
}

class AIRich extends BaseBuilder {
    #client;

    constructor(client) {
        if (!client) {
            throw new Error('Socket is required');
        }

        super();
        this.#client = client;
        this._contextInfo = {};
        this._submessages = [];
        this._sections = [];
        this._richResponseSources = [];
    }

    static newLayout(name, data) {
        return {
            view_model: {
                [Array.isArray(data) ? 'primitives' : 'primitive']: data,
                __typename: `GenAI${name}LayoutViewModel`,
            },
        };
    }

    addSubmessage(submessage) {
        const items = Array.isArray(submessage) ? submessage : [submessage];

        for (const item of items) {
            if (typeof item !== 'object' || item === null || Array.isArray(item)) {
                throw new TypeError('Submessage must be a plain object or array of plain objects');
            }

            this._submessages.push(item);
        }

        return this;
    }

    addSection(section) {
        const items = Array.isArray(section) ? section : [section];

        for (const item of items) {
            if (typeof item !== 'object' || item === null || Array.isArray(item)) {
                throw new TypeError('Section must be a plain object or array of plain objects');
            }

            this._sections.push(item);
        }

        return this;
    }

    addText(text, { hyperlink = true, citation = true, latex = true } = {}) {
        if (typeof text != 'string') {
            throw new TypeError('Text must be a string');
        }

        const extractedIE = extractIE(text, {
            hyperlink,
            citation,
            latex,
        });

        const inline_entities = extractedIE.ie.map(({ type, ie }) => {
            if (type == 'hyperlink') {
                return {
                    key: ie.key,
                    metadata: {
                        display_name: ie.text,
                        is_trusted: true,
                        url: ie.url,
                        __typename: 'GenAIInlineLinkItem',
                    },
                };
            }
            if (type == 'citation') {
                return {
                    key: ie.key,
                    metadata: {
                        reference_id: ie.reference_id,
                        reference_url: ie.url,
                        reference_title: ie.url,
                        reference_display_name: ie.url,
                        sources: [],
                        __typename: 'GenAISearchCitationItem',
                    },
                };
            }
            if (type == 'latex') {
                return {
                    key: ie.key,
                    metadata: {
                        latex_expression: ie.text,
                        latex_image: {
                            url: ie.url,
                            width: Number(ie.width) || 100,
                            height: Number(ie.height) || 100,
                        },
                        font_height: Number(ie.font_height) || 83.333333333333,
                        padding: Number(ie.padding) || 15,
                        __typename: 'GenAILatexItem',
                    },
                };
            }

            return {
                key: ie.key,
                metadata: {
                    latex_expression: ie.text,
                    latex_image: {
                        url: ie.url,
                        width,
                        height,
                    },
                    font_height: Number(ie.font_height) || 83.333333333333,
                    padding: Number(ie.padding) || 15,
                    __typename: 'GenAILatexItem',
                },
            };
        });

        this._submessages.push({
            messageType: 2,
            messageText: extractedIE.text,
        });

        this._sections.push(
            AIRich.newLayout('Single', {
                text: extractedIE.text,
                ...(inline_entities.length && {
                    inline_entities,
                }),
                __typename: 'GenAIMarkdownTextUXPrimitive',
            })
        );

        return this;
    }

    addCode(language, code) {
        if (typeof language !== 'string' || typeof code !== 'string') {
            throw new TypeError('Language and code must be a string');
        }

        const meta = AIRich.tokenizer(code, language);

        this._submessages.push({
            messageType: 5,
            codeMetadata: {
                codeLanguage: language,
                codeBlocks: meta.codeBlock,
            },
        });

        this._sections.push(
            AIRich.newLayout('Single', {
                language,
                code_blocks: meta.unified_codeBlock,
                __typename: 'GenAICodeUXPrimitive',
            })
        );

        return this;
    }

    addTable(table) {
        if (!Array.isArray(table)) {
            throw new TypeError('Table must be an array');
        }

        const meta = AIRich.toTableMetadata(table);

        this._submessages.push({
            messageType: 4,
            tableMetadata: {
                title: meta.title,
                rows: meta.rows,
            },
        });

        this._sections.push(
            AIRich.newLayout('Single', {
                rows: meta.unified_rows,
                __typename: 'GenATableUXPrimitive',
            })
        );

        return this;
    }

    addSource(sources = []) {
        if (!(Array.isArray(sources) && (sources.every((item) => typeof item === 'string') || sources.every((item) => Array.isArray(item) && item.every((v) => typeof v === 'string'))))) {
            throw new TypeError('Sources must be a string array or an array of string arrays');
        }

        if (sources.every((item) => typeof item === 'string')) {
            sources = [sources];
        }

        const source = sources.map(([profile_url, url, text]) => ({
            source_type: 'THIRD_PARTY',
            source_display_name: text ?? '',
            source_subtitle: 'AI',
            source_url: url ?? '',
            favicon: {
                url: profile_url ?? '',
                mime_type: 'image/jpeg',
                width: 16,
                height: 16,
            },
        }));

        this._sections.push(
            AIRich.newLayout('Single', {
                sources: source,
                __typename: 'GenAISearchResultPrimitive',
            })
        );

        return this;
    }

    addReels(reelsItems = []) {
        if (
            !(
                (reelsItems && typeof reelsItems === 'object' && !Array.isArray(reelsItems)) ||
                (Array.isArray(reelsItems) && reelsItems.every((item) => item && typeof item === 'object' && !Array.isArray(item)))
            )
        ) {
            throw new TypeError('Reels items must be an object or an array of objects');
        }

        if (!Array.isArray(reelsItems)) {
            reelsItems = [reelsItems];
        }

        this._submessages.push({
            messageType: 9,
            contentItemsMetadata: {
                contentType: 1,
                itemsMetadata: reelsItems.map((item) => ({
                    reelItem: {
                        title: item.username ?? '',
                        profileIconUrl: item.profileIconUrl ?? item.profile_url ?? '',
                        thumbnailUrl: item.thumbnailUrl ?? item.thumbnail ?? '',
                        videoUrl: item.videoUrl ?? item.url ?? '',
                    },
                })),
            },
        });

        reelsItems.forEach((item, idx) => {
            this._richResponseSources.push({
                provider: '\u004E\u0049\u0058\u0045\u004C',
                thumbnailCDNURL: item.thumbnailUrl ?? item.thumbnail ?? '',
                sourceProviderURL: item.videoUrl ?? item.url ?? '',
                sourceQuery: '',
                faviconCDNURL: item.profileIconUrl ?? item.profile_url ?? '',
                citationNumber: idx + 1,
                sourceTitle: item.username ?? '',
            });
        });

        this._sections.push(
            AIRich.newLayout(
                'HScroll',
                reelsItems.map((item) => ({
                    reels_url: item.videoUrl ?? item.url ?? '',
                    thumbnail_url: item.thumbnailUrl ?? item.thumbnail ?? '',
                    creator: item.username ?? item.title ?? '',
                    avatar_url: item.profileIconUrl ?? item.profile_url ?? '',
                    reels_title: item.reels_title ?? item.title ?? '',
                    likes_count: item.likes_count ?? item.like ?? 0,
                    shares_count: item.shares_count ?? item.share ?? 0,
                    view_count: item.view_count ?? item.view ?? 0,
                    reel_source: item.reel_source ?? item.source ?? 'IG',
                    is_verified: !!(item.is_verified || item.verified),
                    __typename: 'GenAIReelPrimitive',
                }))
            )
        );

        return this;
    }

    addImage(imageUrl) {
        if (!(typeof imageUrl === 'string' || (Array.isArray(imageUrl) && imageUrl.every((v) => typeof v === 'string')))) {
            throw new TypeError('imageUrl must be a string or array of strings');
        }
        const imageUrls = Array.isArray(imageUrl)
            ? imageUrl.map((url) => ({
                imagePreviewUrl: url,
                imageHighResUrl: url,
                sourceUrl: String.fromCharCode(104, 116, 116, 112, 115, 58, 47, 47, 102, 105, 111, 114, 97, 46, 110, 105, 120, 101, 108, 46, 109, 121, 46, 105, 100, 47),
            }))
            : [
                {
                    imagePreviewUrl: imageUrl,
                    imageHighResUrl: imageUrl,
                    sourceUrl: String.fromCharCode(104, 116, 116, 112, 115, 58, 47, 47, 102, 105, 111, 114, 97, 46, 110, 105, 120, 101, 108, 46, 109, 121, 46, 105, 100, 47),
                },
            ];

        this._submessages.push({
            messageType: 1,
            gridImageMetadata: {
                gridImageUrl: {
                    imagePreviewUrl: Array.isArray(imageUrl) ? imageUrl[0] : imageUrl,
                },
                imageUrls,
            },
        });

        imageUrls.forEach(({ imagePreviewUrl }) => {
            this._sections.push(
                AIRich.newLayout('Single', {
                    media: {
                        url: imagePreviewUrl,
                        mime_type: 'image/png',
                    },
                    imagine_type: 'IMAGE',
                    status: {
                        status: 'READY',
                    },
                    __typename: 'GenAIImaginePrimitive',
                })
            );
        });

        return this;
    }

    addVideo(videoUrl) {
        if (!(typeof videoUrl === 'string' || (Array.isArray(videoUrl) && videoUrl.every((v) => typeof v === 'string')))) {
            throw new TypeError('videoUrl must be a string or array of strings');
        }

        const videoUrls = (Array.isArray(videoUrl) ? videoUrl : [videoUrl]).map((item) => {
            const [url, duration = 0] = item.split('|');

            return {
                videoPreviewUrl: url,
                videoHighResUrl: url,
                duration: Number(duration) || 0,
                sourceUrl: String.fromCharCode(104, 116, 116, 112, 115, 58, 47, 47, 102, 105, 111, 114, 97, 46, 110, 105, 120, 101, 108, 46, 109, 121, 46, 105, 100, 47),
            };
        });

        this._submessages.push({
            messageType: 2,
            messageText: '[ CANNOT_LOAD_VIDEO - \u004E\u0049\u0058\u0045\u004C ]',
        });

        videoUrls.forEach(({ videoPreviewUrl, duration = 0 }) => {
            this._sections.push(
                AIRich.newLayout('Single', {
                    media: {
                        url: videoPreviewUrl,
                        mime_type: 'video/mp4',
                        duration,
                    },
                    imagine_type: 'ANIMATE',
                    status: {
                        status: 'READY',
                    },
                    __typename: 'GenAIImaginePrimitive',
                })
            );
        });

        return this;
    }

    addProduct(data = {}) {
        if (!((data && typeof data === 'object' && !Array.isArray(data)) || (Array.isArray(data) && data.every((item) => item && typeof item === 'object' && !Array.isArray(item))))) {
            throw new TypeError('Product items must be an object or an array of objects');
        }

        this._submessages.push({
            messageType: 2,
            messageText: '[ CANNOT_LOAD_PRODUCT - NIXEL ]',
        });

        const items = Array.isArray(data) ? data : [data];

        const product = items.map((item) => ({
            title: item.title,
            brand: item.brand,
            price: item.price,
            sale_price: item.sale_price,
            product_url: item.product_url ?? item.url,
            image: {
                url: item.image_url ?? item.image,
            },
            additional_images: [
                {
                    url: item.icon_url ?? item.icon,
                },
            ],
            __typename: 'GenAIProductItemCardPrimitive',
        }));

        this._sections.push(AIRich.newLayout(Array.isArray(data) ? 'HScroll' : 'Single', Array.isArray(data) ? product : product[0]));

        return this;
    }

    addPost(data = {}) {
        if (!((data && typeof data === 'object' && !Array.isArray(data)) || (Array.isArray(data) && data.every((item) => item && typeof item === 'object' && !Array.isArray(item))))) {
            throw new TypeError('Post items must be an object or an array of objects');
        }

        const posts = Array.isArray(data) ? data : [data];

        this._submessages.push({
            messageType: 2,
            messageText: '[ CANNOT_LOAD_POST - NIXEL ]',
        });

        const primitives = posts.map((p) => ({
            title: p.title ?? '',
            subtitle: p.subtitle ?? '',
            username: p.username ?? '',
            profile_picture_url: p.profile_picture_url ?? p.profile_url ?? '',
            is_verified: !!(p.is_verified || p.verified),
            thumbnail_url: p.thumbnail_url ?? p.thumbnail ?? '',
            post_caption: p.post_caption ?? p.caption ?? '',
            likes_count: p.likes_count ?? p.like ?? 0,
            comments_count: p.comments_count ?? p.comment ?? 0,
            shares_count: p.shares_count ?? p.share ?? 0,
            post_url: p.post_url ?? p.url ?? '',
            post_deeplink: p.post_deeplink ?? p.deeplink ?? '',
            source_app: p.source_app || p.source || 'INSTAGRAM',
            footer_label: p.footer_label ?? p.footer ?? '',
            footer_icon: p.footer_icon ?? p.icon ?? '',
            is_carousel: posts.length > 1,
            orientation: p.orientation ?? 'LANDSCAPE',
            post_type: p.post_type ?? 'VIDEO',
            __typename: 'GenAIPostPrimitive',
        }));

        this._sections.push(AIRich.newLayout('HScroll', primitives));

        return this;
    }

    addTip(text) {
        this._submessages.push({
            messageType: 2,
            messageText: text,
        });

        this._sections.push(
            AIRich.newLayout('Single', {
                text,
                __typename: 'GenAIMetadataTextPrimitive',
            })
        );

        return this;
    }

    addSuggest(suggestion) {
        if (!(typeof suggestion === 'string' || (Array.isArray(suggestion) && suggestion.every((v) => typeof v === 'string')))) {
            throw new TypeError('Suggestion must be a string or array of strings');
        }

        const suggest = Array.isArray(suggestion)
            ? suggestion.map((text) => ({
                prompt_text: text,
                prompt_type: 'SUGGESTED_PROMPT',
                __typename: 'GenAIFollowUpSuggestionPillPrimitive',
            }))
            : [
                {
                    prompt_text: suggestion,
                    prompt_type: 'SUGGESTED_PROMPT',
                    __typename: 'GenAIFollowUpSuggestionPillPrimitive',
                },
            ];

        this._sections.push(AIRich.newLayout('ActionRow', suggest));

        return this;
    }

    build({ forwarded = true, includesUnifiedResponse = true, includesSubmessages = true, quoted, quotedParticipant, ...options } = {}) {
        const forward = forwarded
            ? {
                forwardingScore: 1,
                isForwarded: true,
                forwardedAiBotMessageInfo: { botJid: '0@bot' },
                forwardOrigin: 4,
            }
            : {};

        const qObj = quoted
            ? {
                stanzaId: quoted?.key?.id || quoted?.id,
                participant: quotedParticipant || quoted?.key?.participant || quoted?.key?.remoteJid,
                quotedType: 0,
                quotedMessage: typeof quoted === 'object' && quoted !== null ? (quoted.message ?? quoted) : undefined,
            }
            : {};

        const sections = this._footer
            ? [
                ...this._sections,
                AIRich.newLayout('Single', {
                    text: this._footer,
                    __typename: 'GenAIMetadataTextPrimitive',
                }),
            ]
            : [...this._sections];

        return {
            messageContextInfo: {
                deviceListMetadata: {},
                deviceListMetadataVersion: 2,
                botMetadata: {
                    messageDisclaimerText: this._title,
                    richResponseSourcesMetadata: { sources: this._richResponseSources },
                },
            },
            ...this._extraPayload,
            botForwardedMessage: {
                message: {
                    richResponseMessage: {
                        messageType: 1,
                        submessages: includesSubmessages ? this._submessages : [],
                        unifiedResponse: {
                            data: includesUnifiedResponse ? Buffer.from(JSON.stringify({ response_id: crypto.randomUUID(), sections })).toString('base64') : '',
                        },
                        contextInfo: {
                            ...forward,
                            ...qObj,
                            ...this._contextInfo,
                        },
                    },
                },
            },
        };
    }

    async send(jid, { forwarded, includesUnifiedResponse, includesSubmessages, ...options } = {}) {
        const msg = this.build({ forwarded, includesUnifiedResponse, ...options });

        return await this.#client.relayMessage(jid, msg, { ...options });
    }

    static tokenizer(code, lang = 'javascript') {
        const keywordsMap = {
            javascript: new Set([
                'break',
                'case',
                'catch',
                'continue',
                'debugger',
                'delete',
                'do',
                'else',
                'finally',
                'for',
                'function',
                'if',
                'in',
                'instanceof',
                'new',
                'return',
                'switch',
                'this',
                'throw',
                'try',
                'typeof',
                'var',
                'void',
                'while',
                'with',
                'true',
                'false',
                'null',
                'undefined',
                'class',
                'const',
                'let',
                'super',
                'extends',
                'export',
                'import',
                'yield',
                'static',
                'constructor',
                'async',
                'await',
                'get',
                'set',
            ]),
        };

        const TYPE_MAP = {
            0: 'DEFAULT',
            1: 'KEYWORD',
            2: 'METHOD',
            3: 'STR',
            4: 'NUMBER',
            5: 'COMMENT',
        };

        const keywords = keywordsMap[lang] || new Set();
        const tokens = [];

        let i = 0;

        const push = (content, type) => {
            if (!content) return;
            const last = tokens[tokens.length - 1];
            if (last && last.highlightType === type) last.codeContent += content;
            else tokens.push({ codeContent: content, highlightType: type });
        };

        while (i < code.length) {
            const c = code[i];

            if (/\s/.test(c)) {
                let s = i;
                while (i < code.length && /\s/.test(code[i])) i++;
                push(code.slice(s, i), 0);
                continue;
            }

            if (c === '/' && code[i + 1] === '/') {
                let s = i;
                i += 2;
                while (i < code.length && code[i] !== '\n') i++;
                push(code.slice(s, i), 5);
                continue;
            }

            if (c === '"' || c === "'" || c === '`') {
                let s = i;
                const q = c;
                i++;
                while (i < code.length) {
                    if (code[i] === '\\' && i + 1 < code.length) i += 2;
                    else if (code[i] === q) {
                        i++;
                        break;
                    } else i++;
                }
                push(code.slice(s, i), 3);
                continue;
            }

            if (/[0-9]/.test(c)) {
                let s = i;
                while (i < code.length && /[0-9.]/.test(code[i])) i++;
                push(code.slice(s, i), 4);
                continue;
            }

            if (/[a-zA-Z_$]/.test(c)) {
                let s = i;
                while (i < code.length && /[a-zA-Z0-9_$]/.test(code[i])) i++;
                const word = code.slice(s, i);

                let type = 0;
                if (keywords.has(word)) type = 1;
                else {
                    let j = i;
                    while (j < code.length && /\s/.test(code[j])) j++;
                    if (code[j] === '(') type = 2;
                }

                push(word, type);
                continue;
            }

            push(c, 0);
            i++;
        }

        return {
            codeBlock: tokens,
            unified_codeBlock: tokens.map((t) => ({
                content: t.codeContent,
                type: TYPE_MAP[t.highlightType],
            })),
        };
    }

    static toTableMetadata(arr) {
        if (!Array.isArray(arr) || !arr.every((row) => Array.isArray(row) && row.every((cell) => typeof cell === 'string'))) {
            throw new TypeError('Table must be a nested array of strings');
        }

        const [header, ...rows] = arr;

        const maxLen = Math.max(header.length, ...rows.map((r) => r.length));

        const normalize = (r) => [...r, ...Array(maxLen - r.length).fill('')];

        const unified_rows = [
            {
                is_header: true,
                cells: normalize(header),
            },
            ...rows.map((r) => ({
                is_header: false,
                cells: normalize(r),
            })),
        ];

        const rowsMeta = unified_rows.map((r) => ({
            items: r.cells,
            ...(r.is_header ? { isHeading: true } : {}),
        }));

        return {
            title: '',
            rows: rowsMeta,
            unified_rows,
        };
    }
}

export { VERSION, Button, ButtonV2, Carousel, AIRich };