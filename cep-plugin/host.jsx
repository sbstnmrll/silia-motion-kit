// Host-side ExtendScript for the Silia AE MCP bridge (runs in After Effects' engine).
// All real work is executed dynamically: the panel asks the engine to $.evalFile()
// each claimed command file. This file only provides a liveness probe.

function aeMcpPing() {
  return "pong";
}
