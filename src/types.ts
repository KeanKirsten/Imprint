// Supported effect types
export type Effect = 'corpus' | 'halftone' | 'ink';

// Source media type
export type SourceType = 'image' | 'video';

// Ink render mode
export type InkMode = 'stipple' | 'bleed';

// Halftone dot shape
export type HalftoneShape = 'circle' | 'square' | 'cross';

// Halftone colour mode
export type HalftoneColorMode = 'image' | 'duotone' | 'single' | 'cmyk';

// Corpus colour mode
export type CorpusColorMode = 'image' | 'duotone' | 'gradient' | 'invert';

// Corpus render style
export type CorpusRenderStyle = 'mosaic' | 'threshold';

// Corpus character set
export type CorpusCharSet = 'hex' | 'binary' | 'base64' | 'custom';

// A scatter point placed on the canvas by the user
export interface ScatterPoint {
  x: number;
  y: number;
  id: number;
}

export interface HalftoneInfluencePoint {
  x: number;
  y: number;
  id: number;
}

// Message sent to the ink worker
export interface InkWorkerMessage {
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

// Message received back from the ink worker
export interface InkWorkerResult {
  pixels: Uint8ClampedArray;
  width: number;
  height: number;
}
