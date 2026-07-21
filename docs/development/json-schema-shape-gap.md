# JSON Schema Shape Gap

This file summarizes the current semantic gap between JSON Schema and the repository's shared schema model.

Use it to answer:

- what JSON Schema semantics round-trip cleanly today
- what is accepted through truthful normalization
- what still fails explicitly
- which gaps look like future `Constraint IR` pressure versus format-local concerns

## Current Boundary

Current JSON Schema support is shape-oriented interoperability, not full-spec coverage.

Today:

- the parser targets the subset that can map safely into the current shared shape model
- the generator renders from shared shape semantics plus a small amount of target-local policy
- many validation and annotation keywords are not shape semantics and should not be forced into `Shape IR`

## Round-Trip Cleanly Today

The current practical `json-schema -> shape -> json-schema` subset includes:

- scalar `type` values: `string`, `integer`, `number`, `boolean`
- `type: "null"`
- scalar `const`
- ordinary object `properties`
- object `required`
- arrays with `items`
- tuples expressed through `prefixItems`
- typed records through `additionalProperties: <schema>`
- document-local `$defs`
- document-local `$ref`
- root `$ref`

## Accepted With Truthful Normalization

These cases are accepted, but lowered into broader shared semantics:

- `oneOf` and `anyOf` both lower into shared union semantics
- boolean `true` schemas lower into `unknown`
- supported nullable property forms lower into field nullability
- metadata-only root schemas lower into `unknown`
- arrays without `items` lower into `array<unknown>`
- `additionalProperties: true` lowers into `Record<string, unknown>`

These are acceptable only because the lowered meaning is still truthful.

## Explicit Failures Today

These cases still fail because the current shared model cannot represent them safely enough:

- boolean `false` schemas
- closed objects through `additionalProperties: false`
- mixed fixed properties plus typed `additionalProperties`
- unsupported validation keywords such as `allOf`, `not`, `if/then/else`, numeric constraints, string constraints, collection constraints, and most portable annotations
- compact `type: [...]` arrays outside the narrow nullable-property support
- external or non-local `$ref`
- unsupported drafts

## What The Gap Means

The remaining pressure falls into three buckets.

### Likely Shared-Shape Pressure

These are the strongest candidates for future shared-shape work, but still need cross-format evidence:

- mixed fixed properties plus typed extra-key semantics
- possibly an explicit impossible or never-schema concept

### Likely Future Constraint Or Annotation Pressure

These should stay out of `Shape IR` unless repeated evidence says otherwise:

- numeric constraints
- string constraints
- collection constraints
- portable annotations such as `description`, `default`, `examples`, `readOnly`, `writeOnly`
- composition distinctions such as preserving `oneOf` versus `anyOf`

### Likely Format-Local Or Resolution-Layer Pressure

These should not drive shared IR design directly:

- draft switching
- external `$ref`
- anchors and URI resolution
- other JSON Schema document-system details

## Generator-Side Notes

Some current JSON Schema generator behavior is target policy rather than parser loss:

- union output may use `oneOf` by default or `anyOf` through a target option
- object closure is currently a generator policy choice, not a settled shared semantic
- `unknown` renders as a wide schema and may need widening diagnostics

## Maintenance Rules

- treat this file as a boundary summary, not a feature wishlist
- classify each new JSON Schema pressure as shared-shape, constraint, or format-local before changing `@aio/core`
- keep examples representative and short
