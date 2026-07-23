/* global console, process */

import { convert } from "../packages/sdk/dist/index.js";

const result = convert({
  sourceFormat: "json-schema",
  targetFormat: "typescript",
  input: JSON.stringify({
    title: "ExampleDocument",
    $defs: {
      Count: {
        type: "integer",
      },
      FallbackValue: true,
      FlexibleValue: {
        anyOf: [{ const: "open" }, { $ref: "#/$defs/FallbackValue" }],
      },
    },
    type: "object",
    properties: {
      id: { $ref: "#/$defs/Count" },
      value: { $ref: "#/$defs/FlexibleValue" },
    },
    required: ["id", "value"],
  }),
});

if (!result.ok) {
  console.error("Conversion failed");
  console.error(
    JSON.stringify(
      {
        phase: result.phase,
        code: result.code,
        message: result.message,
        diagnostics: result.diagnostics ?? [],
      },
      null,
      2,
    ),
  );
  process.exitCode = 1;
} else {
  console.log("# Output");
  console.log(result.output);
  console.log("");
  console.log("# Report");
  console.log(
    JSON.stringify(
      {
        semanticCaveats: result.report?.semanticCaveats ?? [],
        losses: result.report?.losses ?? [],
        capabilityRequirements: result.report?.capabilityRequirements ?? [],
        lossHotspots: result.report?.lossHotspots ?? [],
      },
      null,
      2,
    ),
  );
}
