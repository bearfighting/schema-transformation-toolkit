# Capabilities And Semantic Loss

This document defines how parser, generator, and future transform layers should describe:

- what semantics they support
- what they normalize intentionally
- what they reject explicitly
- what they can render only with semantic widening or loss

Use [ir-boundaries.md](ir-boundaries.md) for semantic placement and [architecture-layering.md](architecture-layering.md) for routing.

## Core Rule

Use this rule throughout the repository:

> success means the produced result is still truthful

Success does not necessarily mean:

- source semantics were preserved exactly
- target syntax can express every distinction
- round-trip fidelity is lossless

If truth is preserved only through normalization, widening, or target-local lowering, that caveat should be visible.

## Terms

### Capability

A capability is a semantic feature a parser, generator, or transform can handle intentionally.

Examples:

- object fields
- tuples
- document-local references
- numeric constraints
- closed-object behavior

Capabilities should be semantic, not syntax-node inventories.

### Normalization

Normalization means multiple source forms lower into one shared meaning.

Examples:

- nullable property forms normalizing into field nullability
- nested unions normalizing into one flattened union

Normalization is acceptable when the shared result remains truthful.

### Semantic Loss

Semantic loss means some distinction is not preserved exactly in the produced result.

Examples:

- `oneOf` versus `anyOf` collapsing into one shared union meaning
- `unknown` rendering as JSON Schema `true`
- a target omitting a source-only annotation

Semantic loss does not automatically mean failure.
It means the loss must be surfaced consistently.

### Explicit Failure

Failure is required when the current layer cannot preserve truth safely enough to return success.

## Result Rules

### Return Success Without Diagnostics When

- the semantics are supported directly
- the result preserves intended meaning without meaningful caveat

### Return Success With Diagnostics When

- the layer intentionally normalizes source forms
- the layer widens semantics while remaining truthful
- the target cannot preserve some distinction exactly, but the output remains valid and useful

### Return Failure When

- the layer cannot preserve truth safely
- the current contract explicitly excludes the semantic
- success would silently approximate behavior too aggressively

## Capability States

Each capability should be classified in one of these states:

- supported
- supported with normalization
- supported with semantic loss
- unsupported
- intentionally deferred

## Suggested Capability Axes

Review should keep using semantic axes such as:

- scalar families
- literal values
- null
- object fields
- optional presence
- nullable value semantics
- arrays
- tuples
- records
- unions
- local references and definitions
- object closure
- impossible-schema semantics
- numeric constraints
- string constraints
- collection constraints
- portable annotations
- external reference resolution

## Diagnostics Discipline

Diagnostics are the main way to surface successful-but-imperfect conversions.

They should:

- describe semantic consequences, not implementation noise
- stay stable enough for tests and downstream tooling
- use logical `path` when a stable location exists
- keep `evidence` small and structured

They should not:

- substitute for missing IR semantics
- carry oversized raw parser traces
- hide truthfulness-sensitive widening behind silent success

## Traversal Policy For Analysis

Capability analysis and loss analysis do not always want the same reference-follow behavior.

When an analysis is asking "what reachable semantics must this target support?", it should usually use:

- `references: "follow"`
- `referenceVisits: "once-per-definition"`

When an analysis is asking "where can widening or loss happen for this concrete usage site?", it should usually use:

- `references: "follow"`
- `referenceVisits: "per-occurrence"`

The repository now has a small concrete example of this split in `packages/generators/typescript/src/analysis.ts`:

- capability requirements use once-per-definition
- target loss hotspots use per-occurrence

That does not mean every diagnostic must follow references.
Declaration-oriented generator diagnostics may still prefer structural or preserve-mode traversal when the target output is emitted once per definition rather than once per use site.

## Layer Rules

### Parser

Parser success means the source was lowered into a truthful shared representation.
Important normalization or loss should be surfaced.

Parser failure means the source could not be mapped safely into the current shared semantics.

### Generator

Generator success means the target output remains a truthful expression of the available shared semantics.
Target-local widening or omission should be surfaced.

Generator failure means the target cannot render the IR safely enough under the current contract.

### Transform

Transforms should follow the same rule:

- if they preserve truth, success is allowed
- if they normalize or widen, the caveat should be explicit
- if they cannot preserve truth, they should fail

## Current Repository Interpretation

Current examples already fit this model:

- JSON Schema parsing may succeed while lowering source distinctions into shared shape semantics
- TypeScript generation may succeed while widening `integer` into `number`
- `unknown` may render as a wider target form while still remaining truthful

The repository should keep those cases explicit rather than silently folding them into plain success.

## Testing Rule

Tests should verify:

- direct support paths
- accepted normalization paths
- success-with-loss or success-with-diagnostics paths
- explicit failure paths

Shared semantic fixtures are now the preferred place to express those expectations.

## Maintenance Rules

- keep this file about truthfulness and result semantics only
- keep capability definitions semantic rather than syntax-shaped
- if a successful conversion is only truthful because of widening or omission, surface that fact explicitly
