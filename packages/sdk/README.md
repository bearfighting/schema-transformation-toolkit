# `@aio/sdk`

`@aio/sdk` is the highest-level package in the repository.

Use it when you want to:

- convert between supported source and target formats
- inspect route planning at a higher level
- read aggregated diagnostics, semantic caveats, losses, and report analysis

## Main Entry Point

```ts
import { convert } from "@aio/sdk";

const result = convert({
  sourceFormat: "json-schema",
  targetFormat: "typescript",
  input: JSON.stringify({
    title: "User",
    type: "object",
    properties: {
      id: { type: "integer" },
      name: { type: "string" },
    },
    required: ["id", "name"],
  }),
});

if (!result.ok) {
  console.error(result.phase, result.code, result.message);
  console.error(result.diagnostics);
} else {
  console.log(result.output);
  console.log(result.report);
}
```

## How To Read `result.report`

The most important report fields are:

- `semanticCaveats`: user-facing successful-but-imperfect conversion caveats
- `losses`: declared route-level capability loss
- `preservedCapabilities`: capabilities preserved by the selected route
- `capabilityRequirements`: reachable shape features that the target needed to support
- `lossHotspots`: concrete use sites where widening or loss pressure appeared

Practical reading order:

1. start with `semanticCaveats` and `losses`
2. then inspect `capabilityRequirements` to understand reachable semantics
3. then inspect `lossHotspots` to understand concrete use-site pressure

Example:

```ts
if (result.ok) {
  for (const caveat of result.report?.semanticCaveats ?? []) {
    console.log("caveat", caveat.code, caveat.path);
  }

  for (const requirement of result.report?.capabilityRequirements ?? []) {
    console.log("feature", requirement.feature, requirement.path);
  }

  for (const hotspot of result.report?.lossHotspots ?? []) {
    console.log("hotspot", hotspot.code, hotspot.path, hotspot.referenceStack);
  }
}
```

## Supported High-Level Routes

Current public route planning covers:

- `json -> typescript`
- `json -> json-schema`
- `json-schema -> typescript`
- `json-schema -> json-schema`
- `typescript -> typescript`
- `typescript -> json-schema`

Use `planConversion(...)` or `describeConversionRouteCapabilities(...)` when you want route metadata without running a conversion.

## More Detail

For deeper report interpretation, see:

- [../../docs/development/sdk-report-analysis.md](../../docs/development/sdk-report-analysis.md)
- [../../docs/development/capabilities-and-loss.md](../../docs/development/capabilities-and-loss.md)
