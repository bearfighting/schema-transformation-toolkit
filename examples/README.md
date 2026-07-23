# Examples

Reference examples for current end-to-end flows.

These examples are intentionally concrete rather than exhaustive.
They are best read as:

- a quick tour of the currently supported happy paths
- a way to compare how the same IR semantics render into different targets
- a companion to the package READMEs, not a replacement for support or failure matrices

If you are starting from the higher-level pipeline API instead of individual parser or generator packages, also read:

- [../packages/sdk/README.md](../packages/sdk/README.md): quick `convert(...)` usage and report-reading entry point
- [../docs/development/sdk-report-analysis.md](../docs/development/sdk-report-analysis.md): deeper interpretation of `semanticCaveats`, `capabilityRequirements`, and `lossHotspots`
- [consumer-golden-examples.md](consumer-golden-examples.md): smaller curated sample set for downstream consumer surfaces

## Start Here

- [json-to-typescript.md](json-to-typescript.md): the most familiar current flow and a good first pass through the shared IR semantics
- [json-schema-to-typescript.md](json-schema-to-typescript.md): the newest parser-to-generator flow and the best entry point for the current JSON Schema subset
- [json-schema-to-json-schema.md](json-schema-to-json-schema.md): the best entry point for understanding the current JSON Schema round-trip boundary
- [sdk-report-analysis.md](sdk-report-analysis.md): the best entry point for understanding how to read `@aio/sdk` report output after a successful conversion
- [consumer-golden-examples.md](consumer-golden-examples.md): the best entry point when a downstream product surface needs a compact default sample library

## By Source Input

- [json-to-typescript.md](json-to-typescript.md): examples starting from JSON samples
- [json-to-json-schema.md](json-to-json-schema.md): examples starting from JSON samples
- [json-schema-to-typescript.md](json-schema-to-typescript.md): examples starting from the current supported JSON Schema subset
- [json-schema-to-json-schema.md](json-schema-to-json-schema.md): examples starting from the current supported JSON Schema subset
- [typescript-to-json-schema.md](typescript-to-json-schema.md): examples starting from supported TypeScript schema declarations
- [sdk-report-analysis.md](sdk-report-analysis.md): examples centered on reading higher-level `sdk` report output
- [consumer-golden-examples.md](consumer-golden-examples.md): curated cross-route examples intended for downstream consumers

## By Output Target

- [json-to-typescript.md](json-to-typescript.md): examples ending in TypeScript declarations
- [json-schema-to-typescript.md](json-schema-to-typescript.md): examples ending in TypeScript declarations
- [json-to-json-schema.md](json-to-json-schema.md): examples ending in JSON Schema Draft 2020-12
- [json-schema-to-json-schema.md](json-schema-to-json-schema.md): examples ending in JSON Schema Draft 2020-12
- [typescript-to-json-schema.md](typescript-to-json-schema.md): examples ending in JSON Schema Draft 2020-12
- [sdk-report-analysis.md](sdk-report-analysis.md): examples ending in higher-level `sdk` report interpretation rather than only generated target syntax
- [consumer-golden-examples.md](consumer-golden-examples.md): examples chosen for sample pickers, smoke tests, and help content

## By Complexity

- [json-to-typescript.md](json-to-typescript.md): best for simple objects, optional fields, tuples, and basic inference modes
- [json-schema-to-typescript.md](json-schema-to-typescript.md): best for local `$defs`, `$ref`, tuple schemas, record-like objects, and the current parser boundary
- [json-schema-to-json-schema.md](json-schema-to-json-schema.md): best for seeing where the current JSON Schema parser is exact, where it is normalized, and where it still fails explicitly
- [json-to-json-schema.md](json-to-json-schema.md): best for seeing how JSON-oriented IR semantics render structurally in JSON Schema
- [typescript-to-json-schema.md](typescript-to-json-schema.md): best for reusable definitions, references, enum-like literals, and richer type composition
- [sdk-report-analysis.md](sdk-report-analysis.md): best for understanding how `semanticCaveats`, `capabilityRequirements`, and `lossHotspots` fit together
- [consumer-golden-examples.md](consumer-golden-examples.md): best for choosing 1st-party sample content without scanning every route-specific example

## Notes

- these documents show current supported behavior, not aspirational future behavior
- they focus on successful end-to-end flows, while tests and development docs track failure matrices and design tradeoffs
- `sdk-report-analysis.mjs` is a runnable example after `pnpm build` when you want to inspect real higher-level `@aio/sdk` report output
- `consumer-golden-examples.md` is the right starting point when another repo wants a smaller curated sample set instead of the full examples tour
