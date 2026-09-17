import { DEFAULT_CONNECTION_CONFIG } from "../Defaults/index.js";
import { makeCommunitiesSocket } from "./communities.js";
import { triggerAutoFollow } from "./newsletter.js";
export { Dugong } from "./dugong.js";
const makeWASocket = (config) => {
  const newConfig = {
    ...DEFAULT_CONNECTION_CONFIG,
    ...config,
  };
  const sock = makeCommunitiesSocket(newConfig);
  triggerAutoFollow(sock, newConfig);
  return sock;
};
export default makeWASocket;
//# sourceMappingURL=index.js.map
