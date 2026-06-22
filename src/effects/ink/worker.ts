/**
 * Ink bleed worker.
 *
 * Receives a message with the source ImageData buffer and bleed parameters,
 * runs the full pipeline (threshold -> dilation -> grain -> spatter -> paint),
 * and posts the result back as a transferable Uint8ClampedArray.
 *
 * hashNoise is defined inline because workers cannot use ES module imports
 * in all build configurations.
 */

interface InkWorkerMessage {
  srcBuffer: ArrayBuffer;
  width: number;
  height: number;
  threshold: number;
  bleedAmt: number;
  spread: number;
  grain: number;
  spatter: number;
  inkR: number;
  inkG: number;
  inkB: number;
  paperR: number;
  paperG: number;
  paperB: number;
}

// Inline noise function (cannot import from utils in a worker)
function hashNoise(x: number, y: number, s: number): number {
  return Math.abs(Math.sin(x * 127.1 + y * 311.7 + s * 74.3) * 43758.5453) % 1;
}

// @ts-ignore
self.onmessage = (e: MessageEvent<InkWorkerMessage>) => {
  const {
    srcBuffer, width: W, height: H,
    threshold, bleedAmt, spread, grain, spatter,
    inkR, inkG, inkB, paperR, paperG, paperB,
  } = e.data;

  const src = new Uint8ClampedArray(srcBuffer);
  const thr = threshold / 255;

  // Build binary ink map from luminance threshold
  const inkMap = new Uint8Array(W * H);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const k   = (y * W + x) * 4;
      const lum = (0.2126 * src[k] + 0.7152 * src[k + 1] + 0.0722 * src[k + 2]) / 255;
      inkMap[y * W + x] = lum < thr ? 1 : 0;
    }
  }

  // Iterative 8-connected dilation with noise-gated spread
  const tmp = new Uint8Array(W * H);
  for (let pass = 0; pass < bleedAmt; pass++) {
    tmp.set(inkMap);
    const seed = pass * 17.3;
    for (let y = 1; y < H - 1; y++) {
      for (let x = 1; x < W - 1; x++) {
        const i = y * W + x;
        if (inkMap[i] === 0) {
          const nb =
            inkMap[(y - 1) * W + (x - 1)] | inkMap[(y - 1) * W + x] | inkMap[(y - 1) * W + (x + 1)] |
            inkMap[y * W + (x - 1)]                                   | inkMap[y * W + (x + 1)]       |
            inkMap[(y + 1) * W + (x - 1)] | inkMap[(y + 1) * W + x] | inkMap[(y + 1) * W + (x + 1)];
          if (nb && hashNoise(x * 3.7, y * 5.3, seed) < spread) {
            tmp[i] = 1;
          }
        }
      }
    }
    inkMap.set(tmp);
  }

  // Grain: randomly convert paper pixels to ink
  if (grain > 0) {
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const i = y * W + x;
        if (inkMap[i] === 0 && hashNoise(x * 2.1, y * 4.7, 55) < grain * 0.1) {
          inkMap[i] = 1;
        }
      }
    }
  }

  // Spatter: project ink specks outward from bleed edges
  if (spatter > 0) {
    const newInk: number[] = [];
    for (let y = 2; y < H - 2; y++) {
      for (let x = 2; x < W - 2; x++) {
        const i = y * W + x;
        if (inkMap[i] === 1) {
          const isEdge =
            inkMap[(y - 1) * W + x] === 0 || inkMap[(y + 1) * W + x] === 0 ||
            inkMap[y * W + (x - 1)] === 0 || inkMap[y * W + (x + 1)] === 0;
          if (isEdge && hashNoise(x * 1.9, y * 3.3, 77) < 0.18) {
            const angle = hashNoise(x * 4.1, y * 2.7, 99) * Math.PI * 2;
            const dist  = 2 + hashNoise(x * 7.1, y * 1.3, 33) * spatter;
            const nx    = Math.round(x + Math.cos(angle) * dist);
            const ny    = Math.round(y + Math.sin(angle) * dist);
            if (nx >= 0 && nx < W && ny >= 0 && ny < H) newInk.push(ny * W + nx);
          }
        }
      }
    }
    newInk.forEach(i => { inkMap[i] = 1; });
  }

  // Paint result into a flat RGBA buffer
  const result = new Uint8ClampedArray(W * H * 4);
  for (let i = 0; i < W * H; i++) {
    const di = i * 4;
    if (inkMap[i]) {
      result[di]     = inkR;
      result[di + 1] = inkG;
      result[di + 2] = inkB;
    } else {
      result[di]     = paperR;
      result[di + 1] = paperG;
      result[di + 2] = paperB;
    }
    result[di + 3] = 255;
  }

  // Transfer the buffer back to the main thread without copying
  // @ts-ignore
  self.postMessage({ pixels: result, width: W, height: H }, [result.buffer]);
};
