// QR codes: drawn with qrcode-generator, read from the camera with the browser's BarcodeDetector
// where it exists, otherwise with jsQR (vendor/, loaded only then).
import qrcode from '../../vendor/qrcode.mjs';

export function qrSvg(text) {
  const qr = qrcode(0, 'L');
  qr.addData(text);
  qr.make();
  return qr.createSvgTag({ cellSize: 4, margin: 16, scalable: true });
}

// The camera needs a secure page (https or localhost).
export const canScan = () => Boolean(window.isSecureContext && navigator.mediaDevices?.getUserMedia);

// Reads QR codes from the back camera into `video` until stop() is called; onCode gets each text.
export async function scan(video, onCode) {
  const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false });
  video.srcObject = stream;
  video.setAttribute('playsinline', '');
  video.muted = true;
  await video.play();
  const read = await reader();
  let running = true;
  const loop = async () => {
    if (!running) return;
    const text = await read(video).catch(() => null);
    if (text && running) onCode(text);
    if (running) setTimeout(loop, 200);
  };
  loop();
  return () => {
    running = false;
    for (const track of stream.getTracks()) track.stop();
    video.srcObject = null;
  };
}

async function reader() {
  if ('BarcodeDetector' in window && (await BarcodeDetector.getSupportedFormats()).includes('qr_code')) {
    const detector = new BarcodeDetector({ formats: ['qr_code'] });
    return async (video) => (await detector.detect(video))[0]?.rawValue ?? null;
  }
  await loadScript(new URL('../../vendor/jsQR.js', import.meta.url).href);
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  return async (video) => {
    if (!video.videoWidth) return null;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0);
    const image = ctx.getImageData(0, 0, canvas.width, canvas.height);
    return window.jsQR(image.data, image.width, image.height, { inversionAttempts: 'dontInvert' })?.data ?? null;
  };
}

function loadScript(src) {
  if (window.jsQR) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const script = Object.assign(document.createElement('script'), { src, onload: resolve, onerror: reject });
    document.head.append(script);
  });
}
