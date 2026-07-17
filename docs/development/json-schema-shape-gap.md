# JSON Schema Shape Gap

## Purpose

This document records the current semantic gap between JSON Schema and the repository's current `Shape IR v0`.

It exists to make four things explicit:

- which JSON Schema semantics round-trip cleanly today
- which semantics are accepted but normalized into broader shared shape meaning
- which semantics currently fail explicitly
- which gaps are likely future `Constraint IR` pressure versus shape-local or target-local concerns

This document is intentionally about the current repository boundary, not the full JSON Schema specification.

## Current Context

Today:

- `@aio/core` provides `Shape IR v0`
- the JSON Schema parser targets only the subset that can map into that shared shape model
- the JSON Schema generator renders from shared shape semantics and a small set of target-local options

That means JSON Schema support is currently:

- a shape-oriented interoperability layer
- not a full JSON Schema platform
- not yet a shape-plus-constraint architecture

## Gap Categories

Use these categories when discussing JSON Schema behavior in the current codebase.

### 1. Exact Round-Trip

The source schema maps into current shared shape semantics and the generator can render equivalent JSON Schema again without meaningful semantic loss.

### 2. Accepted With Normalization

The source schema is accepted, but some JSON Schema surface distinction is intentionally lowered into broader shared shape meaning.

This is acceptable only when:

- the lowered meaning is still truthful
- the distinction is outside current shared shape semantics
- diagnostics make the loss visible

### 3. Explicit Failure

The source schema contains semantics that the current shared shape model cannot represent safely, so the parser fails instead of silently approximating them.

### 4. Future Constraint Pressure

The source schema contains semantics that probably should not be forced into `Shape IR`, but may become a future `Constraint IR` concern if the same pressure appears across multiple sources or targets.

## Current Exact Round-Trip Subset

The current generator-aligned subset round-trips cleanly through:

`JSON Schema -> Shape IR v0 -> JSON Schema`

This includes:

- scalar `type` values: `string`, `integer`, `number`, `boolean`
- `type: "null"`
- `const` with string, number, or boolean values
- ordinary object `properties`
- object `required`
- arrays with `items: <schema>`
- tuples expressed as `prefixItems + minItems + items: false`
- typed records through `additionalProperties: <schema>`
- document-local `$defs`
- document-local `$ref` into `#/$defs/...`
- root `$ref`

This subset is the practical current contract for JSON Schema interoperability.

## Accepted With Normalization

These behaviors are already intentionally accepted by the current implementation.

### `oneOf` And `anyOf` Collapse Into Shared Union Semantics

Current parser behavior:

- `oneOf` and `anyOf` both become `SchemaUnionNode`
- the parser emits `json-schema-union-composition-lowered`

Meaning:

- current `Shape IR v0` preserves the existence of alternatives
- it does not preserve the JSON Schema distinction between exclusive and non-exclusive composition

Classification:

- not a `Shape IR` gap by itself
- possible future `Constraint IR` or target-capability concern

### Boolean `true` Schemas Lower Into `unknown`

Current parser behavior:

- `true` becomes `SchemaUnknownNode`
- the parser emits `json-schema-true-schema-lowered`

Current generator behavior:

- `SchemaUnknownNode` renders back to `true`
- the generator may emit `wide-unknown-schema` warnings when the shape is wider than the original source evidence

Meaning:

- the shared shape model can preserve only “widest allowed shape”, not full source intent or evidence

Classification:

- accepted shared widening
- not enough by itself to justify a separate shape concept

### Nullable Property Forms Normalize Into Field Nullability

Current parser behavior:

- `type: ["T", "null"]` for supported scalar `T` inside object properties normalizes into `field.nullable: true`
- `oneOf: [T, null]` and `anyOf: [T, null]` in supported property positions also normalize into field nullability
- the parser emits `json-schema-nullable-property-normalized`

Meaning:

- current `Shape IR v0` treats field nullability as structural metadata rather than preserving raw JSON Schema composition syntax

Classification:

- shape-preserving normalization
- not a constraint concern

### Metadata-Only Root Schemas Lower Into `unknown`

Current parser behavior:

- a root schema object with no current supported structural keywords lowers to `unknown`

Meaning:

- current `Shape IR v0` has no place for annotation-only or metadata-only documents

Classification:

- mostly outside shape
- likely future constraint or annotation-layer pressure if preservation becomes important

### Arrays Without `items` Lower To `array<unknown>`

Current parser behavior:

- `{ "type": "array" }` becomes an array whose element type is `unknown`

Meaning:

- the parser preserves “this is an array” but cannot infer a narrower element shape

Classification:

- accepted shared widening
- consistent with current `unknown` semantics

### `additionalProperties: true` Records Lower To `Record<string, unknown>`

Current parser behavior:

- object schemas with only `additionalProperties: true` become record-of-unknown

Current generator behavior:

- they render back to `additionalProperties: true`
- the generator may emit `wide-unknown-schema` diagnostics when the unknown branch is rendered as `true`

Meaning:

- current shape semantics preserve record-ness
- they do not preserve any stronger source-side explanation for the value type

Classification:

- accepted shared widening

## Current Explicit Failures

These semantics fail today because the repository does not yet have a safe shared representation for them.

### Boolean `false` Schemas

Current behavior:

- parser failure code: `unsupported-json-schema-boolean-false`

Why:

- current `Shape IR v0` has no explicit impossible or never-schema concept

Likely classification:

- open question
- could become a future shared concept if repeated pressure appears across multiple surfaces

### Closed Objects Through `additionalProperties: false`

Current behavior:

- parser failure code: `unsupported-json-schema-closed-object`

Why:

- current object nodes do not distinguish open-versus-closed object semantics

Likely classification:

- current gray area between shape and constraints
- should not be promoted casually without cross-surface evidence

### Mixed Fixed Fields Plus Typed `additionalProperties`

Current behavior:

- parser failure code: `unsupported-json-schema-mixed-object-shape`

Why:

- current `Shape IR v0` has `object` and `record`, but no combined node that means “known properties plus typed extra keys”

Likely classification:

- plausible shared shape gap
- worth revisiting once more than one source or target needs it

### Unsupported Validation Keywords

Current behavior:

- parser failure code: `unsupported-json-schema-keyword`

Representative current failures include:

- `allOf`
- `not`
- `if`, `then`, `else`
- `dependentSchemas`
- `pattern`
- `format`
- `minLength`, `maxLength`
- `minimum`, `maximum`
- `exclusiveMinimum`, `exclusiveMaximum`
- `multipleOf`
- `maxItems`
- `uniqueItems`
- `minProperties`, `maxProperties`
- `description`, `examples`, `default`
- `deprecated`, `readOnly`, `writeOnly`
- `enum`

Why:

- most of these semantics are not structural shape
- several are likely future `Constraint IR` concerns
- some are portable annotations rather than pure validation

Likely classification:

- mostly future constraint pressure
- not a reason to expand `Shape IR` directly

### Compact `type: [...]` Arrays Outside Current Nullable Support

Current behavior:

- parser failure code: `unsupported-json-schema-type-array`

Why:

- current parser only lowers the narrow nullable scalar case safely
- broader `type` arrays would require more explicit union rules and compatibility decisions

Likely classification:

- mixed
- some cases are shape
- some cases are closer to JSON Schema-local surface syntax

### External Or Non-Local `$ref`

Current behavior:

- parser failure code: `unsupported-json-schema-ref`

Why:

- current repository only supports document-local references in shared shape semantics

Likely classification:

- not a shape-node problem by itself
- mostly document-system and resolution-layer work

### Unsupported Drafts

Current behavior:

- parser failure code: `unsupported-json-schema-draft`

Why:

- current parser is intentionally Draft 2020-12 only

Likely classification:

- JSON Schema-local compatibility concern
- not shared IR pressure

## Current Generator-Side Loss And Target Choices

Some current JSON Schema generator behavior is not parser loss, but target-side choice.

### Union Composition Choice

Current behavior:

- default output uses `oneOf`
- an option can switch to `anyOf`

Meaning:

- shared union semantics are stronger than generator surface choice
- the output keyword choice is currently target-local

### Object Closure Choice

Current behavior:

- default object generation omits `additionalProperties`
- an option can force `additionalProperties: false`

Meaning:

- current `Shape IR v0` does not decide object closure
- generator configuration is temporarily carrying that policy choice

This is a sign that object closure is not yet settled as shared semantics.

### Unknown Renders As Wide Schema

Current behavior:

- `unknown` renders as `true`
- diagnostics can warn that this is broader than the original evidence suggested

Meaning:

- current generator preserves correctness through widening
- it cannot preserve narrower intent without a richer shared model

## What This Suggests About Future IR Work

The current JSON Schema gap should be split into three buckets.

### Bucket A: Likely Shared Shape Gaps

These are the strongest current candidates for future shared shape work:

- mixed fixed-field plus typed-extra-key object semantics
- possibly an eventual impossible-schema or never-schema concept

These should still require evidence from more than JSON Schema alone.

### Bucket B: Likely Future Constraint IR

These should stay out of `Shape IR` unless strong counter-evidence appears:

- numeric constraints
- string constraints
- collection constraints
- portable annotations such as `description`, `default`, and `examples`
- composition distinctions like `oneOf` versus `anyOf` if the project later decides to preserve them semantically

### Bucket C: Likely Format-Local Or Resolution-Layer Concerns

These should not drive shared IR design directly:

- draft switching
- external `$ref`
- anchor and URI resolution behavior
- JSON Schema document-system compatibility details

## Recommended Next Step

Before introducing a real `Constraint IR`, the repository should make semantic loss more explicit in result contracts.

Recommended near-term work:

1. document capability and loss boundaries per parser and generator
2. keep parser warnings for accepted lowering cases stable and testable
3. expand generator-side loss reporting for shape-to-JSON Schema widening cases
4. classify every new JSON Schema pressure as shape, constraint, or format-local before changing `@aio/core`

This keeps future `Constraint IR` work grounded in implementation evidence instead of one-off feature pressure.
