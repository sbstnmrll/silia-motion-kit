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
];
