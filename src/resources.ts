// Thin re-export so server.ts keeps importing "./resources.js". The implementation
// lives in src/resources/ (index: AE live resources; motion: motion tokens; sdk: ExtendScript reference).
export { registerResources } from "./resources/index.js";
