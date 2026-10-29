import type {
  Effect,
  SourceType,
  InkMode,
  HalftoneShape,
  HalftoneColorMode,
  HalftoneInfluencePoint,
  CorpusColorMode,
  CorpusRenderStyle,
  CorpusCharSet,
  ScatterPoint,
} from './types';
import type { EffectAnimation } from './animation/types';

// Shared mutable application state — centralised here so modules can import
// a single object rather than passing values through function arguments.

export const state = {
  // Which effect is currently active
  currentEffect: null as Effect | null,

  // The loaded image or video element used as input
  currentSource: null as HTMLImageElement | HTMLVideoElement | null,

  // Whether the source is an image or a video
  sourceType: null as SourceType | null,

  // Debounce timer handle for render scheduling
  renderTimer: null as ReturnType<typeof setTimeout> | null,

  // Whether the landing parallax loop should be running
  landingActive: true,

  // Ink effect mode
  inkMode: 'stipple' as InkMode,

  // Halftone dot shape
  halftoneShape: 'circle' as HalftoneShape,

  // Halftone colour mode
  halftoneColorMode: 'image' as HalftoneColorMode,

  // Halftone grid angle in degrees
  halftoneAngle: 0,

  // Whether influence-zone placement mode is active
  halftoneInfluencePlacing: false,

  // Placed influence zone points
  halftoneInfluencePoints: [] as HalftoneInfluencePoint[],

  // Counter for unique influence point IDs
  halftoneInfluenceNextId: 0,

  // Corpus colour mode
  corpusColorMode: 'image' as CorpusColorMode,

  // Corpus render style
  corpusRenderStyle: 'mosaic' as CorpusRenderStyle,

  // Corpus character set source
  corpusCharSet: 'hex' as CorpusCharSet,

  // Whether scatter-point placement mode is active
  corpusScatterOn: false,

  // Placed scatter points
  corpusScatterPoints: [] as ScatterPoint[],

  // Counter for generating unique scatter-point IDs
  corpusScatterNextId: 0,

  // Drag state for moving scatter points
  corpusDrag: null as { idx: number } | null,

  // Animation per effect, keyed by effect name
  animations: {
    corpus:   { durationMs: 3000, fps: 30, sliders: [] },
    halftone: { durationMs: 3000, fps: 30, sliders: [] },
    ink:      { durationMs: 3000, fps: 30, sliders: [] },
  } as Record<'corpus' | 'halftone' | 'ink', EffectAnimation>,

  // Whether an export is in progress (suppresses background fill for transparency)
  exportingTransparent: false,

  // Whether the timeline panel is open
  animPanelOpen: false,

  // Whether preview playback is running
  animPlaying: false,
};
