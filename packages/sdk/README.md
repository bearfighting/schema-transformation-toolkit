# `@aio/sdk`

`@aio/sdk` is the highest-level package in the repository.

It is the intended downstream consumer boundary for Stage 1 product surfaces.
Project-level readiness planning lives in [../../docs/development/consumer-surface-checklist.md](../../docs/development/consumer-surface-checklist.md), not in this package README.

Use it when you want to:

- convert between supported source and target formats
- inspect route planning at a higher level
- read aggregated diagnostics, semantic caveats, losses, and report analysis
- validate the public conversion result shape at runtime
- normalize raw diagnostics and caveats into a UI-facing model

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

## Stage 1 Contract

For downstream product surfaces, the intended Stage 1 contract is:

- call `convert(...)` for conversion execution
- validate cross-boundary payloads with `publicConvertResultSchema` when runtime checking is useful
- branch on `result.ok` for ordinary success or failure handling
- treat `result.phase` on failures as the current public failure taxonomy: `parse | generate`

The most stable result fields for consumers to build on are:

- failure: `code`, `message`, `phase`, `plan`, optional `diagnostics`
- success: `output`, `plan`, optional `report`
- report core: `semanticCaveats`, `losses`, `capabilityRequirements`, `lossHotspots`, `entrySelection`, `policyDecisions`
- diagnostic core: `severity`, `code`, `message`, optional `path`, optional `source`

The scenario-matrix tests in [../../tests/sdk/scenario-matrix.test.ts](../../tests/sdk/scenario-matrix.test.ts) exercise this contract through stable `success`, `caveat`, `unsupported`, `invalid-input`, route-planning, and `sourceRange`-bearing flows.

Consumers should not rely on:

- thrown exception strings for expected parse or generate failures
- undocumented `evidence` payload details remaining byte-for-byte stable
- lower-level parser or generator internals as part of this Stage 1 consumer boundary

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

## Consumer-Facing Helpers

`@aio/sdk` now also exposes two small consumer-facing helper layers.

### Public Contract Schemas

Use these when a downstream app or boundary layer wants runtime validation of the public `convert(...)` result shape rather than trusting TypeScript types alone.

Most important exports:

- `publicConvertResultSchema`
- `convertSuccessResultSchema`
- `convertFailureResultSchema`
- `conversionReportSchema`

Example:

```ts
import { convert, publicConvertResultSchema } from "@aio/sdk";

const result = convert({
  sourceFormat: "json",
  targetFormat: "typescript",
  input: '{"id":1}',
});

publicConvertResultSchema.parse(result);
```

### UI-Facing Diagnostics

Use `collectUserFacingDiagnostics(...)` when a downstream consumer should not need to understand the raw differences between:

- failure results
- `diagnostics`
- `semanticCaveats`
- `losses`

Example:

```ts
import { collectUserFacingDiagnostics, convert } from "@aio/sdk";

const result = convert({
  sourceFormat: "json-schema",
  targetFormat: "typescript",
  input: '{"type":"object"}',
});

const diagnostics = collectUserFacingDiagnostics(result);
```

Each returned item follows one stable presentation-oriented shape:

- `severity`
- `code`
- `title`
- `message`
- optional `path`
- optional `source`
- optional `sourceRange`
- optional `suggestion`
- optional `technicalDetails`

For Stage 1 consumers, the most stable expectations are:

- always branch on `severity`, `code`, `title`, and `message`
- use `path` and `source` when present for grouping or attribution
- use `sourceRange` when present for editor or inline-highlighting integrations
- treat `suggestion` as helpful copy, not as an exhaustive remediation taxonomy
- treat `technicalDetails` as drill-down data rather than as a primary rendering contract

### Capability Summaries

Use `describeFormatSupport(...)` or `listFormatSupports()` when a downstream app needs a small machine-readable support summary instead of scraping README prose.

Example:

```ts
import { describeFormatSupport, listFormatSupports } from "@aio/sdk";

const typeScriptSupport = describeFormatSupport("typescript");
const allSupports = listFormatSupports();
```

Each summary includes:

- optional parser support details
- optional generator support details
- shared shape kinds
- constraint families
- notable limitations
- experimental areas

For Stage 1 consumers, the most stable expectations are:

- use `listFormatSupports()` to drive format pickers without hard-coding format names
- use `describeFormatSupport(...)` for per-format help text, badges, and limitation copy
- rely on `format`, `parser`, `generator`, `sharedShapeKinds`, `constraintFamilies`, `notableLimitations`, and `experimentalAreas`
- treat limitation and experimental strings as concise support hints, not as a full public ontology

For route-level discovery, pair this with:

- `listConversionRoutes()`
- `planConversion(...)`
- `describeConversionRouteCapabilities(...)`

This layer is intentionally small.
It is meant to power honest badges, route copy, or help text, not to expose every internal capability rule directly.

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

For project-level readiness status and remaining downstream-consumer work, see:

- [../../docs/development/consumer-surface-checklist.md](../../docs/development/consumer-surface-checklist.md)
- [../../docs/development/progress.md](../../docs/development/progress.md)
- [../../docs/development/web-integration-notes.md](../../docs/development/web-integration-notes.md)
