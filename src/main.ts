/**
 * Imprint — creative effects studio
 * Main entry point: imports all modules, exposes API on window, and
 * initialises the application.
 */

// Styles
import './styles/base.css';
import './styles/landing.css';
import './styles/workspace.css';

// Workspace and navigation
import {
  enterEffect,
  goToLanding,
  scheduleRender,
  exportImg,
  initWorkspace,
} from './workspace/index';

// File upload / drag-drop
import {
  triggerUpload,
  onFileInput,
  initUploader,
} from './workspace/uploader';

// Landing parallax
import { initLanding } from './landing/index';

// Landing card previews
import { initPreviews } from './landing/previews';

// Corpus sidebar controls
import {
  setRenderStyle,
  setCorpusColor,
  setCorpusCharSet,
  toggleCorpusScatter,
  clearCorpusScatter,
  initCorpusSidebar,
} from './effects/corpus/sidebar';

// Halftone sidebar controls
import { setHalftoneShape, setHalftoneColor, setHalftoneAngle, toggleHalftoneInfluence, clearHalftoneInfluence, onHalftoneCanvasClick } from './effects/halftone/sidebar';

// State and canvas utils
import { state } from './state';
import { mainCanvas } from './utils/canvas';

// Ink sidebar controls
import { setInkMode } from './effects/ink/sidebar';

// Animation system
import { initAnimation, togglePanel } from './animation/index';

// Expose functions that HTML onclick attributes call
declare global {
  interface Window {
    enterEffect:          typeof enterEffect;
    goToLanding:          typeof goToLanding;
    scheduleRender:       typeof scheduleRender;
    exportImg:            typeof exportImg;
    triggerUpload:        typeof triggerUpload;
    onFileInput:          typeof onFileInput;
    setRenderStyle:       typeof setRenderStyle;
    setCorpusColor:       typeof setCorpusColor;
    setCorpusCharSet:     typeof setCorpusCharSet;
    toggleCorpusScatter:  typeof toggleCorpusScatter;
    clearCorpusScatter:   typeof clearCorpusScatter;
    setHalftoneShape:     typeof setHalftoneShape;
    setHalftoneColor:     typeof setHalftoneColor;
    setHalftoneAngle:         typeof setHalftoneAngle;
    toggleHalftoneInfluence:  typeof toggleHalftoneInfluence;
    clearHalftoneInfluence:   typeof clearHalftoneInfluence;
    setInkMode:           typeof setInkMode;
    toggleAnimPanel:      typeof togglePanel;
  }
}

window.enterEffect         = enterEffect;
window.goToLanding         = goToLanding;
window.scheduleRender      = scheduleRender;
window.exportImg           = exportImg;
window.triggerUpload       = triggerUpload;
window.onFileInput         = onFileInput;
window.setRenderStyle      = setRenderStyle;
window.setCorpusColor      = setCorpusColor;
window.setCorpusCharSet    = setCorpusCharSet;
window.toggleCorpusScatter = toggleCorpusScatter;
window.clearCorpusScatter  = clearCorpusScatter;
window.setHalftoneShape    = setHalftoneShape;
window.setHalftoneColor    = setHalftoneColor;
window.setHalftoneAngle        = setHalftoneAngle;
window.toggleHalftoneInfluence = toggleHalftoneInfluence;
window.clearHalftoneInfluence  = clearHalftoneInfluence;
window.setInkMode          = setInkMode;
window.toggleAnimPanel = togglePanel;

// Initialise
initWorkspace();
initUploader();
initCorpusSidebar();
initLanding();
initPreviews();
initAnimation();

mainCanvas.addEventListener('click', (e: MouseEvent) => {
  if (state.currentEffect === 'halftone') onHalftoneCanvasClick(e);
});
