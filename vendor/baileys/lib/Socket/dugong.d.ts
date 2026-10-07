import { proto } from "../../WAProto/index.js";
export declare class Dugong {
  private relayMessage;
  private waUploadToServer;
  private config;
  private sock;
  constructor(
    waUploadToServer: any,
    relayMessageFn: any,
    config: any,
    sock: any,
  );
  detectType(content: any): string | null;
  handlePayment(
    content: any,
    quoted: any,
  ): Promise<{
    requestPaymentMessage: proto.Message.RequestPaymentMessage;
  }>;
  handleProduct(
    content: any,
    _jid: string,
    _quoted: any,
  ): Promise<{
    viewOnceMessage: {
      message: {
        interactiveMessage: {
          body: {
            text: any;
          };
          footer: {
            text: any;
          };
          header: {
            title: any;
            hasMediaAttachment: boolean;
            productMessage: {
              product: {
                productImage: any;
                productId: any;
                title: any;
                description: any;
                currencyCode: any;
                priceAmount1000: any;
                retailerId: any;
                url: any;
                productImageCount: number;
              };
              businessOwnerJid: string;
            };
          };
          nativeFlowMessage: {
            buttons: any;
          };
        };
      };
    };
  }>;
  handleInteractive(
    content: any,
    _jid: string,
    _quoted: any,
  ): Promise<{
    interactiveMessage: any;
  }>;
  handleInteractiveButtons(
    content: any,
    _jid: string,
    _quoted: any,
  ): Promise<{
    viewOnceMessage: {
      message: {
        messageContextInfo: {
          deviceListMetadata: {};
          deviceListMetadataVersion: number;
          messageSecret: Buffer;
        };
        interactiveMessage: {
          body: {
            text: any;
          };
          footer: {
            text: any;
          };
          header: any;
          nativeFlowMessage: {
            buttons: any;
          };
        };
      };
    };
  }>;
  handleCarousel(
    content: any,
    _jid: string,
    _quoted: any,
  ): Promise<{
    viewOnceMessage: {
      message: {
        messageContextInfo: {
          deviceListMetadata: {};
          deviceListMetadataVersion: number;
          messageSecret: Buffer;
        };
        interactiveMessage: any;
      };
    };
  }>;
  handleAlbum(
    content: any,
    jid: string,
    quoted: any,
  ): Promise<import("../index.js").WAMessage>;
  handleEvent(
    content: any,
    jid: string,
    quoted: any,
  ): Promise<import("../index.js").WAMessage>;
  handlePollResult(
    content: any,
    jid: string,
    quoted: any,
  ): Promise<import("../index.js").WAMessage>;
  handleGroupStory(content: any, jid: string, _quoted: any): Promise<any>;
  sendStatusWhatsApp(
    content: any,
    jids?: string[],
  ): Promise<import("../index.js").WAMessage>;
}
//# sourceMappingURL=dugong.d.ts.map
