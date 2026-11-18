import { COLORS } from "../constants/theme";
import { POOL_SVG_ID } from "../constants/pool";

export const isVideoExportSupported = () =>
  typeof MediaRecorder !== "undefined" && typeof HTMLCanvasElement.prototype.captureStream === "function";

const wait = (ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms));

const MIME_CANDIDATES = ["video/mp4;codecs=avc1", "video/webm;codecs=vp9", "video/webm"];

/** Serialitza la piscina actual (SVG del DOM) i la converteix en una imatge. */
async function loadPoolImage(viewW: number, viewH: number): Promise<HTMLImageElement> {
  const svg = document.getElementById(POOL_SVG_ID);
  if (!svg) throw new Error("No s'ha trobat la piscina");

  const clone = svg.cloneNode(true) as SVGSVGElement;
  clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  clone.setAttribute("width", String(viewW));
  clone.setAttribute("height", String(viewH));

  const xml = new XMLSerializer().serializeToString(clone);
  const url = URL.createObjectURL(new Blob([xml], { type: "image/svg+xml;charset=utf-8" }));
  try {
    const img = new Image();
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error("No s'ha pogut renderitzar la piscina"));
      img.src = url;
    });
    return img;
  } finally {
    URL.revokeObjectURL(url);
  }
}

export interface ExportOptions {
  viewW: number;
  viewH: number;
  width: number;
  height: number;
  /** Durada de l'animació en segons. */
  duration: number;
  fileName: string;
  /** Mostra l'animació en l'instant indicat (segons). */
  setTime: (seconds: number) => void;
}

/** Grava l'animació en temps real sobre un canvas i descarrega el vídeo resultant. */
export async function exportPoolVideo({ viewW, viewH, width, height, duration, fileName, setTime }: ExportOptions) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("No s'ha pogut crear el canvas d'exportació");

  const mimeType = MIME_CANDIDATES.find(type => MediaRecorder.isTypeSupported(type)) ?? "";
  const ext = mimeType.startsWith("video/mp4") ? "mp4" : "webm";

  const scale = Math.min(width / viewW, height / viewH);
  const dw = viewW * scale;
  const dh = viewH * scale;
  const dx = (width - dw) / 2;
  const dy = (height - dh) / 2;

  const drawFrame = async () => {
    const img = await loadPoolImage(viewW, viewH);
    ctx.fillStyle = COLORS.videoBackground;
    ctx.fillRect(0, 0, width, height);
    ctx.drawImage(img, dx, dy, dw, dh);
  };

  const stream = canvas.captureStream(30);
  let recorder: MediaRecorder | null = null;

  try {
    const chunks: BlobPart[] = [];
    const rec = new MediaRecorder(stream, mimeType ? { mimeType, videoBitsPerSecond: 8_000_000 } : undefined);
    recorder = rec;
    rec.ondataavailable = e => {
      if (e.data.size > 0) chunks.push(e.data);
    };
    const stopped = new Promise<void>(resolve => {
      rec.onstop = () => resolve();
    });

    setTime(0);
    await wait(150); // deixa que React pinti el primer frame
    await drawFrame();
    rec.start();

    // El temps avança amb el rellotge real: el vídeo dura exactament `duration`
    const startedAt = performance.now();
    for (;;) {
      const elapsed = (performance.now() - startedAt) / 1000;
      if (elapsed >= duration) break;
      setTime(elapsed);
      await wait(20); // temps perquè React renderitzi
      await drawFrame();
    }

    setTime(duration);
    await wait(20);
    await drawFrame();
    await wait(150);
    rec.stop();
    await stopped;

    const url = URL.createObjectURL(new Blob(chunks, { type: rec.mimeType || "video/webm" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `${fileName}.${ext}`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  } finally {
    if (recorder && recorder.state !== "inactive") recorder.stop();
    stream.getTracks().forEach(track => track.stop());
  }
}
