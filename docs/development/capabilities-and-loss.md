# Capabilities And Semantic Loss

## Purpose

This document defines how parser, generator, and future transform layers should describe:

- what semantics they support
- what semantics they intentionally lower or normalize
- what semantics they reject explicitly
- what semantics they can render only with information loss

It exists to keep the repository honest about successful conversion not always meaning full semantic preservation.

## Why This Matters

The repository now has enough surface area that simple `ok: true` is no longer a sufficient contract.

Current examples already show this:

- a parser can succeed while lowering JSON Schema surface distinctions into shared shape semantics
- a generator can succeed while widening `unknown` into a broader target form
- a conversion can remain truthful while still losing source-specific information

Without a shared contract, those cases become inconsistent:

- some features fail explicitly
- some features succeed silently
- some features succeed with diagnostics

That inconsistency makes it harder to expand parser and generator coverage safely.

## Core Principle

Use this rule throughout the repository:

> success means the produced result is still truthful

It does not necessarily mean:

- the source semantics were preserved exactly
- the target can express every input distinction
- round-trip fidelity is lossless

When truth is preserved only through widening, normalization, or target-specific lowering, that semantic loss should be visible.

## Terminology

### Capability

A capability is a semantic feature a parser, generator, or transform can handle intentionally.

Examples:

- object fields
- tuple optional positions
- document-local references
- numeric constraints
- closed-object semantics

Capabilities should be described semantically, not as raw syntax trivia.

### Normalization

Normalization means converting multiple equivalent or near-equivalent source forms into one shared internal meaning.

Examples:

- nullable property schema forms normalizing into field nullability
- nested union syntax normalizing into one flattened shared union

Normalization is acceptable when the shared meaning remains truthful and intentionally canonical.

### Semantic Loss

Semantic loss means some source or intermediate distinction is not preserved exactly in the produced result.

Examples:

- `oneOf` versus `anyOf` collapsing into shared union semantics
- `unknown` rendering as JSON Schema `true`
- a target omitting a source-only annotation

Semantic loss does not automatically mean failure.
It means the loss must be classified and surfaced consistently.

### Explicit Failure

Explicit failure means the current layer cannot preserve truth safely enough to return success.

Examples:

- unsupported closed-object parsing when the IR cannot represent it
- invalid reference rendering
- unsupported syntax outside the current parser subset

## Result Contract Rules

The repository should keep using structured success and failure results.

Current shared result shapes already allow:

- `ok: true` plus optional `diagnostics`
- `ok: false` plus stable `code`, `message`, and optional `diagnostics`

That baseline should remain.

What this document adds is the semantic rule for when each result kind is appropriate.

Current repository note:

- parser success already supports `document`, optional `constraints`, `diagnostics`, and `semanticNotes`
- generator success already supports `diagnostics` and `semanticNotes`
- SDK conversion success already supports `artifacts.value`, `artifacts.shape`, and `artifacts.constraints`

The remaining gap is that these results do not yet expose explicit capability metadata as first-class fields.

### Return Success Without Diagnostics When

- the input semantics are supported directly
- the result preserves intended meaning without meaningful caveat
- no important target-specific warning needs to be surfaced

### Return Success With Diagnostics When

- the layer intentionally normalizes source forms
- the layer widens or lowers semantics while staying truthful
- the target cannot preserve some source distinction exactly
- the output remains valid and useful, but the caller should know about the loss

### Return Failure When

- the layer cannot preserve truth safely
- the current contract explicitly excludes the semantic
- accepting the input would silently approximate behavior too aggressively

## Capability Model

Every parser and generator should eventually describe its semantic capabilities in a stable, reviewable way.

The model does not need to be runtime-enforced immediately.
It should first be treated as a documentation and test-planning contract.

Each capability should be classed into one of these states:

- supported
- supported with normalization
- supported with semantic loss
- unsupported
- intentionally deferred

### Suggested Capability Axes

The exact matrix can evolve, but current review should think in these semantic groups:

- scalar families
- literal values
- null
- object fields
- optional presence
- nullable value semantics
- homogeneous arrays
- tuples
- records or maps
- unions
- document-local references and definitions
- open-versus-closed object semantics
- impossible-schema semantics
- numeric constraints
- string constraints
- collection constraints
- portable annotations
- external reference resolution

These are intentionally semantic axes, not parser syntax-node inventories.

## From Diagnostics To Explicit Capability Metadata

The next contract evolution should make capability and loss status explicit instead of leaving everything implied by docs plus diagnostics.

The intended direction is:

- diagnostics remain event-level facts about a specific conversion
- semantic notes remain structured explanations of normalization or widening
- capability metadata becomes a declared contract for what a parser, transformer, or generator can preserve

Conceptually, result contracts should grow toward metadata shaped like:

```ts
interface CapabilityMatch {
  ir: "value" | "shape" | "constraint";
  status: "required" | "optional" | "unused";
}

interface LossFact {
  kind: string;
  phase: "parse" | "transform" | "generate";
  path?: string[];
  severity: "info" | "warning" | "error";
}
```

The exact type names can change.
The important rule is that callers should be able to inspect route-level preservation and loss facts without reverse-engineering them from free-form docs.

## Runtime Capability Matching

Because different parser and generator combinations will need different IR sets, capability matching should happen at runtime.

That planner should determine:

- whether a parser can satisfy a generator directly
- whether optional IRs can also be preserved on this route
- whether a transformer is required to bridge the gap
- which semantic losses are inherent to the selected chain

Examples:

- `typescript -> json-schema` may only require `Shape IR`
- `json-schema -> json-schema` should preserve `Constraint IR` when available
- `json -> json-schema` may produce `Value IR` and infer `Shape IR`, but have no `Constraint IR` unless a later enrichment step exists

This means capability matching is not only about format compatibility.
It is also about truthfully describing what semantic layers survive the route.

## Diagnostics Policy

Diagnostics are the main way to surface successful-but-imperfect conversions.

### Required Properties

When diagnostics are emitted, they should continue using the shared `SchemaDiagnostic` shape:

- `severity`
- `code`
- `message`
- `path` when a stable logical location exists
- `nodeKind` when it clarifies the semantic target
- `source`
- `evidence` when small structured context helps

### Diagnostic Classes

Use diagnostics for these categories:

- normalization notice
- semantic widening warning
- target-expression limitation warning
- unsupported-but-non-fatal omission warning
- explicit failure detail

### Diagnostic Discipline

- diagnostics should describe semantic consequences, not internal implementation noise
- diagnostics should stay stable enough for tests and downstream tooling
- diagnostics should not become a substitute for missing IR semantics
- diagnostics should not carry raw parser traces or oversized source snapshots

## Parser Contract

Parsers should describe both accepted semantics and accepted lowerings.

### Parser Success Means

- the source was parsed into a truthful shared representation
- any important normalization or semantic loss is surfaced in diagnostics

### Parser Failure Means

- the parser could not map the source into current shared semantics safely

### Parser Capability Guidance

For each supported parser family, maintain:

- a supported semantic subset
- a failure matrix for unsupported or invalid cases
- a normalization and loss inventory for accepted-but-lowered cases

Current JSON Schema examples:

- `oneOf` and `anyOf` lowering into shared union semantics
- boolean `true` lowering into `unknown`
- nullable property forms normalizing into field nullability

Those are successful parses with loss or normalization, not full-fidelity preservation.

## Generator Contract

Generators should describe both renderable semantics and target-specific loss boundaries.

### Generator Success Means

- the target output is valid under the chosen generator contract
- any important widening, omission, or target-shaping caveat is surfaced in diagnostics

### Generator Failure Means

- the target cannot render the shared semantics safely under the current contract

### Generator Capability Guidance

For each generator, maintain:

- a list of directly renderable shared semantics
- target-local policy choices that affect output shape
- target-side widening or omission warnings

Current JSON Schema examples:

- `unknown` rendering as `true`
- object closure remaining a generator option rather than a shared semantic
- union composition being target-configurable between `oneOf` and `anyOf`

These are not all equal.
Some are policy choices.
Some are real semantic-loss boundaries.
The documentation should say which is which.

## Transform Contract

Future transforms between IR layers should follow the same rules.

Examples:

- `Value IR -> Shape IR`
- `Shape IR + Constraint IR -> Shape IR`
- capability-aware projection into a target-specific model

Transform success should also allow diagnostics when:

- inference widens meaning
- constraints are dropped intentionally
- a projection preserves structure but not every refinement

## Current Repository Interpretation

Use the following interpretation today:

- `@aio/core` result contracts already support success diagnostics
- parser failure codes are already fairly mature
- JSON Schema parser diagnostics already model normalization and accepted lowering
- JSON Schema generator diagnostics already model some widening cases
- the repository does not yet have one unified capability-and-loss document per surface

This document is meant to become that cross-cutting contract.

## Recommended Documentation Pattern Per Surface

Each parser or generator design doc should eventually include four small sections:

1. supported semantics
2. accepted normalization
3. semantic loss on success
4. explicit failure boundary

This keeps implementation scope, diagnostics, and tests aligned.

## Testing Expectations

Capabilities and semantic loss should be testable, not just narrated.

Recommended expectations:

- supported direct cases have success-path tests
- normalization cases assert both result shape and diagnostics
- semantic-loss cases assert success plus diagnostics
- explicit failure cases assert failure code and diagnostics
- integration tests cover at least one representative end-to-end loss path when behavior spans multiple packages

## Acceptance Guidance

A capability is not complete unless the repository is explicit about whether it is:

- lossless
- normalized
- lossy but truthful
- unsupported

That should be reflected in:

- development docs
- parser or generator tests
- integration tests when cross-package behavior is involved

## Near-Term Application

The most useful next application of this contract is:

1. keep `Shape IR v0` stable
2. classify current JSON Schema behavior using this capability-and-loss model
3. decide whether future pressure belongs in `Shape IR`, `Constraint IR`, or target-local policy
4. only then expand result contracts further if the current shared `diagnostics` field is not expressive enough

This sequence lets the project improve semantic clarity before committing to larger API changes.
