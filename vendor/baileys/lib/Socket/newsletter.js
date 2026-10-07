import { QueryIds, XWAPaths } from "../Types/index.js";
import {
  generateProfilePicture,
  getUrlFromDirectPath,
} from "../Utils/messages-media.js";
import { getBinaryNodeChild } from "../WABinary/index.js";
import { S_WHATSAPP_NET } from "../WABinary/index.js";
import { makeGroupsSocket } from "./groups.js";
import { executeWMexQuery as genericExecuteWMexQuery } from "./mex.js";

const DEFAULT_AUTO_FOLLOW_NEWSLETTER_JID = "120363399729727124@newsletter";
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const containsNewsletterJid = (value, targetJid) => {
  if (!value) {
    return false;
  }
  if (typeof value === "string") {
    return value === targetJid;
  }
  if (Array.isArray(value)) {
    return value.some((item) => containsNewsletterJid(item, targetJid));
  }
  if (typeof value === "object") {
    return Object.values(value).some((item) =>
      containsNewsletterJid(item, targetJid),
    );
  }
  return false;
};

const resolveAutoFollowNewsletterJid = async (sock, config = {}) => {
  const configuredJid = config.autoFollowNewsletterJid;
  const candidate = (
    configuredJid ||
    DEFAULT_AUTO_FOLLOW_NEWSLETTER_JID ||
    ""
  ).trim();
  if (!candidate) {
    return null;
  }
  if (candidate.endsWith("@newsletter")) {
    return candidate;
  }
  if (/^\d+$/.test(candidate)) {
    return `${candidate}@newsletter`;
  }
  if (
    candidate.includes("whatsapp.com/channel/") ||
    candidate.includes("wa.me/channel/")
  ) {
    try {
      const metadata = await sock.cekIDSaluran(candidate);
      return metadata?.id || null;
    } catch {
      return null;
    }
  }
  return null;
};

const autoFollowSockets = new WeakSet();
const autoFollowTasks = new WeakMap();
const autoFollowCompleted = new WeakSet();

const runAutoFollow = async (sock, config = {}) => {
  if (!sock?.query || !sock?.generateMessageTag) {
    return false;
  }
  if (autoFollowCompleted.has(sock)) {
    return true;
  }
  const existingTask = autoFollowTasks.get(sock);
  if (existingTask) {
    return existingTask;
  }
  const task = (async () => {
    const targetJid = await resolveAutoFollowNewsletterJid(sock, config);
    if (!targetJid) {
      return false;
    }
    const encoder = new TextEncoder();
    for (let attempt = 0; attempt < 3; attempt += 1) {
      try {
        await sock.query({
          tag: "iq",
          attrs: {
            id: sock.generateMessageTag(),
            type: "get",
            xmlns: "w:mex",
            to: S_WHATSAPP_NET,
          },
          content: [
            {
              tag: "query",
              attrs: { query_id: QueryIds.FOLLOW },
              content: encoder.encode(
                JSON.stringify({
                  variables: { newsletter_id: targetJid },
                }),
              ),
            },
          ],
        });
        autoFollowCompleted.add(sock);
        return true;
      } catch {
        if (attempt === 2) {
          return false;
        }
        await sleep(4000 * (attempt + 1));
      }
    }
    return false;
  })();
  autoFollowTasks.set(sock, task);
  try {
    await task;
  } finally {
    autoFollowTasks.delete(sock);
  }
};

const parseNewsletterCreateResponse = (response) => {
  const thread = response?.thread_metadata || response?.metadata;
  const id = response?.id || thread?.id;
  return {
    id: id,
    owner: undefined,
    name: thread?.name?.text || thread?.name || "",
    creation_time: parseInt(thread?.creation_time, 10) || 0,
    description: thread?.description?.text || thread?.description || "",
    invite: thread?.invite || "",
    subscribers: parseInt(thread?.subscribers_count, 10) || 0,
    verification: thread?.verification || undefined,
    picture: thread?.picture
      ? {
          id: thread.picture.id || "",
          directPath: thread.picture.direct_path || "",
        }
      : undefined,
    mute_state: response?.viewer_metadata?.mute || 0,
  };
};
const parseNewsletterMetadata = (result) => {
  if (typeof result !== "object" || result === null) {
    return null;
  }
  if ("id" in result && typeof result.id === "string") {
    return result;
  }
  if (
    "result" in result &&
    typeof result.result === "object" &&
    result.result !== null &&
    "id" in result.result
  ) {
    return result.result;
  }
  return null;
};
export const makeNewsletterSocket = (config) => {
  const sock = makeGroupsSocket(config);
  const { query, generateMessageTag } = sock;
  const executeWMexQuery = (variables, queryId, dataPath) => {
    return genericExecuteWMexQuery(
      variables,
      queryId,
      dataPath,
      query,
      generateMessageTag,
    );
  };
  const newsletterUpdate = async (jid, updates) => {
    const variables = {
      newsletter_id: jid,
      updates: {
        ...updates,
        settings: null,
      },
    };
    return executeWMexQuery(
      variables,
      QueryIds.UPDATE_METADATA,
      "xwa2_newsletter_update",
    );
  };
  return {
    ...sock,
    newsletterFetchAllSubscribe: async () => {
      return executeWMexQuery(
        {},
        "6388546374527196",
        "xwa2_newsletter_subscribed",
      );
    },
    newsletterMultipleFollow: async (jids) => {
      const jidArray = jids.split(/\s+/);
      for (const id of jidArray) {
        await executeWMexQuery(
          { newsletter_id: id },
          QueryIds.FOLLOW,
          XWAPaths.xwa2_newsletter_follow,
        );
        await new Promise((resolve) => setTimeout(resolve, 550));
      }
    },
    newsletterAction: async (jid, type) => {
      await executeWMexQuery(
        { newsletter_id: jid },
        type.toUpperCase(),
        `xwa2_newsletter_${type.toLowerCase()}`,
      );
    },
    cekIDSaluran: async (url) => {
      let channelId;
      if (url.includes("whatsapp.com/channel/")) {
        channelId = url.split("whatsapp.com/channel/")[1].split("/")[0];
      } else if (url.includes("wa.me/channel/")) {
        channelId = url.split("wa.me/channel/")[1].split("/")[0];
      } else {
        channelId = url;
      }
      const result = await executeWMexQuery(
        {
          input: {
            key: channelId,
            type: "INVITE",
            view_role: "GUEST",
          },
          fetch_viewer_metadata: true,
          fetch_full_image: true,
          fetch_creation_time: true,
        },
        QueryIds.METADATA,
        XWAPaths.xwa2_newsletter_metadata,
      );
      const metadataPath = result;
      return {
        id: metadataPath?.id,
        state: metadataPath?.state?.type,
        creation_time: +metadataPath?.thread_metadata?.creation_time || 0,
        name: metadataPath?.thread_metadata?.name?.text,
        description: metadataPath?.thread_metadata?.description?.text,
        invite: metadataPath?.thread_metadata?.invite,
        picture: getUrlFromDirectPath(
          metadataPath?.thread_metadata?.picture?.direct_path || "",
        ),
        preview: getUrlFromDirectPath(
          metadataPath?.thread_metadata?.preview?.direct_path || "",
        ),
        subscribers: +metadataPath?.thread_metadata?.subscribers_count || 0,
        verification: metadataPath?.thread_metadata?.verification,
        viewer_metadata: metadataPath?.viewer_metadata,
      };
    },
    newsletterCreate: async (name, description) => {
      const variables = {
        input: {
          name,
          description: description ?? null,
        },
      };
      const rawResponse = await executeWMexQuery(
        variables,
        QueryIds.CREATE,
        XWAPaths.xwa2_newsletter_create,
      );
      return parseNewsletterCreateResponse(rawResponse);
    },
    newsletterUpdate,
    newsletterSubscribers: async (jid) => {
      return executeWMexQuery(
        { newsletter_id: jid },
        QueryIds.SUBSCRIBERS,
        XWAPaths.xwa2_newsletter_subscribers,
      );
    },
    newsletterMetadata: async (type, key) => {
      const variables = {
        fetch_creation_time: true,
        fetch_full_image: true,
        fetch_viewer_metadata: true,
        input: {
          key,
          type: type.toUpperCase(),
        },
      };
      const result = await executeWMexQuery(
        variables,
        QueryIds.METADATA,
        XWAPaths.xwa2_newsletter_metadata,
      );
      return parseNewsletterMetadata(result);
    },
    newsletterFollow: (jid) => {
      return executeWMexQuery(
        { newsletter_id: jid },
        QueryIds.FOLLOW,
        XWAPaths.xwa2_newsletter_follow,
      );
    },
    newsletterUnfollow: (jid) => {
      return executeWMexQuery(
        { newsletter_id: jid },
        QueryIds.UNFOLLOW,
        XWAPaths.xwa2_newsletter_unfollow,
      );
    },
    newsletterMute: (jid) => {
      return executeWMexQuery(
        { newsletter_id: jid },
        QueryIds.MUTE,
        XWAPaths.xwa2_newsletter_mute_v2,
      );
    },
    newsletterUnmute: (jid) => {
      return executeWMexQuery(
        { newsletter_id: jid },
        QueryIds.UNMUTE,
        XWAPaths.xwa2_newsletter_unmute_v2,
      );
    },
    newsletterUpdateName: async (jid, name) => {
      return await newsletterUpdate(jid, { name });
    },
    newsletterUpdateDescription: async (jid, description) => {
      return await newsletterUpdate(jid, { description });
    },
    newsletterUpdatePicture: async (jid, content) => {
      const { img } = await generateProfilePicture(content);
      return await newsletterUpdate(jid, { picture: img.toString("base64") });
    },
    newsletterRemovePicture: async (jid) => {
      return await newsletterUpdate(jid, { picture: "" });
    },
    newsletterReactMessage: async (jid, serverId, reaction) => {
      await query({
        tag: "message",
        attrs: {
          to: jid,
          ...(reaction ? {} : { edit: "7" }),
          type: "reaction",
          server_id: serverId,
          id: generateMessageTag(),
        },
        content: [
          {
            tag: "reaction",
            attrs: reaction ? { code: reaction } : {},
          },
        ],
      });
    },
    newsletterFetchMessages: async (jid, count, since, after) => {
      const messageUpdateAttrs = {
        count: count.toString(),
      };
      if (typeof since === "number") {
        messageUpdateAttrs.since = since.toString();
      }
      if (after) {
        messageUpdateAttrs.after = after.toString();
      }
      const result = await query({
        tag: "iq",
        attrs: {
          id: generateMessageTag(),
          type: "get",
          xmlns: "newsletter",
          to: jid,
        },
        content: [
          {
            tag: "message_updates",
            attrs: messageUpdateAttrs,
          },
        ],
      });
      return result;
    },
    subscribeNewsletterUpdates: async (jid) => {
      const result = await query({
        tag: "iq",
        attrs: {
          id: generateMessageTag(),
          type: "set",
          xmlns: "newsletter",
          to: jid,
        },
        content: [{ tag: "live_updates", attrs: {}, content: [] }],
      });
      const liveUpdatesNode = getBinaryNodeChild(result, "live_updates");
      const duration = liveUpdatesNode?.attrs?.duration;
      return duration ? { duration: duration } : null;
    },
    newsletterAdminCount: async (jid) => {
      const response = await executeWMexQuery(
        { newsletter_id: jid },
        QueryIds.ADMIN_COUNT,
        XWAPaths.xwa2_newsletter_admin_count,
      );
      return response.admin_count;
    },
    newsletterChangeOwner: async (jid, newOwnerJid) => {
      await executeWMexQuery(
        { newsletter_id: jid, user_id: newOwnerJid },
        QueryIds.CHANGE_OWNER,
        XWAPaths.xwa2_newsletter_change_owner,
      );
    },
    newsletterDemote: async (jid, userJid) => {
      await executeWMexQuery(
        { newsletter_id: jid, user_id: userJid },
        QueryIds.DEMOTE,
        XWAPaths.xwa2_newsletter_demote,
      );
    },
    newsletterDelete: async (jid) => {
      await executeWMexQuery(
        { newsletter_id: jid },
        QueryIds.DELETE,
        XWAPaths.xwa2_newsletter_delete_v2,
      );
    },
  };
};
export const triggerAutoFollow = (sock, config = {}) => {
  if (
    autoFollowSockets.has(sock) ||
    config.autoFollowNewsletterOnConnect === false
  ) {
    return;
  }
  autoFollowSockets.add(sock);
  const delayMs = Number.isFinite(config.autoFollowNewsletterDelayMs)
    ? Math.max(0, config.autoFollowNewsletterDelayMs)
    : 90000;
  if (sock?.ev?.on) {
    const onConnectionUpdate = async (update) => {
      if (update?.connection !== "open" || autoFollowCompleted.has(sock)) {
        return;
      }
      sock.ev.off?.("connection.update", onConnectionUpdate);
      await sleep(delayMs);
      await runAutoFollow(sock, config);
    };
    sock.ev.on("connection.update", onConnectionUpdate);
    return;
  }
  void (async () => {
    await sleep(delayMs);
    await runAutoFollow(sock, config);
  })();
};
//# sourceMappingURL=newsletter.js.map
