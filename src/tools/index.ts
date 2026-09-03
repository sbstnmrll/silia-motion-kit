import type { ToolModule } from "./types.js";
import { getProjectTools } from "./project.js";
import { getCompTools } from "./comps.js";
import { getLayerTools } from "./layers.js";
import { getPropertyTools } from "./properties.js";
import { getEffectTools } from "./effects.js";
import { getTextTools } from "./text.js";
import { getShapeTools } from "./shapes.js";
import { getRenderTools } from "./render.js";
import { getVisionTools } from "./vision.js";
import { getCheckpointTools } from "./checkpoint.js";
import { getLibraryTools, getPromotedLibraryTools } from "./library.js";
import { getMogrtTools } from "./mogrt.js";
import { getHandoffTools } from "./handoff.js";
import { getAudioTools } from "./audio.js";
import { getSiliaTools } from "./silia.js";
import { getSilia2Tools } from "./silia2.js";
import { getVersionTools } from "./versions.js";

/** Tool modules in registration order. Core (undo/batch), health and scripting are added by server.ts. */
export const TOOL_MODULES: ToolModule[] = [
  getProjectTools,
  getCompTools,
  getLayerTools,
  getPropertyTools,
  getEffectTools,
  getTextTools,
  getShapeTools,
  getRenderTools,
  getVisionTools,
  getCheckpointTools,
  getLibraryTools,
  getPromotedLibraryTools,
  getMogrtTools,
  getHandoffTools,
  getAudioTools,
  getSiliaTools,
  getSilia2Tools,
  getVersionTools,
];
