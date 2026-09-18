import axios from "axios";
let _sharp = null;
async function getSharp() {
  if (!_sharp) _sharp = (await import("sharp")).default;
  return _sharp;
}

const LATEX_BG = "#1a1a2e";
const LATEX_FG = "#ffffff";
const LATEX_PADDING = 20;
const LATEX_DPI = 200;

const renderLatexToPng = async (latex, options = {}) => {
  const { bgColor = LATEX_BG, dpi = LATEX_DPI } = options;

  const url = `https://latex.codecogs.com/png.image?\\dpi{${dpi}}\\bg{${bgColor.replace("#", "")}} ${encodeURIComponent(latex)}`;

  const res = await axios.get(url, { responseType: "arraybuffer" });

  const buffer = Buffer.from(res.data);
  const metadata = await (await getSharp())(buffer).metadata();

  return {
    buffer,
    width: metadata.width || 500,
    height: metadata.height || 150,
  };
};

const createMediaUploadFn = async (sock) => {
  const { prepareWAMessageMedia } = await import("ourin");
  return async (imageBuffer, mediaType) => {
    const media = await prepareWAMessageMedia(
      { image: imageBuffer },
      { upload: sock.waUploadToServer },
    );
    const imgMsg = media?.imageMessage;
    const url = imgMsg?.url || "";
    const directPath = imgMsg?.directPath || "";
    return { url, directPath };
  };
};

export {
  renderLatexToPng,
  createMediaUploadFn,
  LATEX_BG,
  LATEX_FG,
  LATEX_PADDING,
  LATEX_DPI,
};
