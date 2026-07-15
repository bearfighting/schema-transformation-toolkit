# Examples

Reference examples for current end-to-end flows.

These examples are intentionally concrete rather than exhaustive.
They are best read as:

- a quick tour of the currently supported happy paths
- a way to compare how the same IR semantics render into different targets
- a companion to the package READMEs, not a replacement for support or failure matrices

## Start Here

- [json-to-typescript.md](json-to-typescript.md): the most familiar current flow and a good first pass through the shared IR semantics

## By Source Input

- [json-to-typescript.md](json-to-typescript.md): examples starting from JSON samples
- [json-to-json-schema.md](json-to-json-schema.md): examples starting from JSON samples
- [typescript-to-json-schema.md](typescript-to-json-schema.md): examples starting from supported TypeScript schema declarations

## By Output Target

- [json-to-typescript.md](json-to-typescript.md): examples ending in TypeScript declarations
- [json-to-json-schema.md](json-to-json-schema.md): examples ending in JSON Schema Draft 2020-12
- [typescript-to-json-schema.md](typescript-to-json-schema.md): examples ending in JSON Schema Draft 2020-12

## By Complexity

- [json-to-typescript.md](json-to-typescript.md): best for simple objects, optional fields, tuples, and basic inference modes
- [json-to-json-schema.md](json-to-json-schema.md): best for seeing how JSON-oriented IR semantics render structurally in JSON Schema
- [typescript-to-json-schema.md](typescript-to-json-schema.md): best for reusable definitions, references, enum-like literals, and richer type composition

## Notes

- these documents show current supported behavior, not aspirational future behavior
- they focus on successful end-to-end flows, while tests and development docs track failure matrices and design tradeoffs
