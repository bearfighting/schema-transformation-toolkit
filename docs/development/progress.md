# Progress

## Current Phase

The workspace is in an IR-separation and orchestration-hardening phase.

The main goal is to make the three-layer IR model explicit in code and to turn parser-to-generator orchestration into a truthful, inspectable pipeline before broadening to more languages or more advanced schema features.

## Completed

- established `@aio/core` as the shared contract and schema IR package
- separated parser and generator packages from the core package
- implemented JSON parsing for the current schema IR subset
- implemented TypeScript generation for the current schema IR subset
- added integration tests for `json -> ir -> typescript`
- documented parser and generator capabilities and configuration
- added CI with lint, typecheck, test, and build checks
- aligned CI runtime to Node 24
- added explicit support for `null`
- added schema literal nodes
- added schema union nodes
- added schema tuple nodes with optional tuple positions
- added schema record nodes with conservative opt-in JSON inference
- added document-level reusable definitions and reference nodes in the shared IR
- added discriminated-union-friendly object-union preservation for JSON union inference
- added a shared structured diagnostics model across parser and generator result shapes
- added stable diagnostic `path`, `nodeKind`, and `evidence` conventions across parser and generator flows
- tightened `SchemaUnknownNode` semantics and clarified the boundary between unknown nodes and diagnostics
- implemented `mixedTypeMode: "unknown"` for JSON inference with `mixed-types-collapsed` unknown semantics
- extracted core schema internals into dedicated `identifiers`, `equivalence`, `validation`, and `normalization` modules
- removed the parser-side duplicate schema-equivalence implementation and reused core equivalence semantics instead
- clarified project direction around serializable data-shape semantics
- added non-throwing core schema validation helpers for parser-facing validation flows
- added a root API contract test for `@aio/parser-json`
- documented the first TypeScript parser subset cases and implementation todo list
- added a TypeScript parser package with canonical exports and an initial structured failure model
- implemented the first TypeScript parser v0 slice for schema-oriented declarations
- added TypeScript parser support for object types, optional and nullable fields, arrays, tuples, unions, literal unions, `Record<string, T>`, interfaces, and reachable named references
- added stable TypeScript parser failure codes for common unsupported subset cases
- added more precise TypeScript parser diagnostic `path` and `nodeKind` coverage for common unsupported cases
- strengthened TypeScript parser unsupported-syntax diagnostics with stable `syntaxKind`, `nodeText`, and category-specific evidence for built-in type references, `Record` keys, and tuple rest failures
- added explicit TypeScript parser failures for interface `extends` clauses and unsupported named entry declaration kinds such as classes
- added explicit TypeScript parser failures for imported type references that would require cross-file resolution
- added explicit TypeScript parser failures for namespace-imported type references and re-export-only entries in single-file parsing
- documented a dedicated TypeScript parser preprocess boundary for module-related syntax and future multi-file expansion
- extracted a real TypeScript parser preprocess step so entry preparation and module-boundary classification are no longer inlined inside `parse.ts`
- moved reachable declaration-shape prechecks into preprocess for interface-heritage failures, while keeping convert-level safety checks as a fallback
- added a first JSON Schema generator package targeting Draft 2020-12
- added integration coverage for `json -> ir -> json-schema`
- added integration coverage for `typescript -> ir -> json-schema`, including definitions-heavy reachable-reference cases
- documented JSON Schema generator scope, examples, and current semantics
- documented IR boundaries, JSON Schema shape-gap analysis, and a shared capability-and-semantic-loss contract for parser and generator behavior
- introduced explicit `Value IR`, `Shape IR`, `Constraint IR`, and combined `IrModel` entry points in `@aio/core`
- evolved parser success contracts so parse results can return `constraints` alongside shape documents
- implemented a first real `Constraint IR` overlay model with target paths and per-target constraints
- implemented JSON Schema parser extraction of constraint semantics into `Constraint IR`
- implemented JSON Schema generator consumption of `Constraint IR` for portable validation and annotation keywords
- added SDK orchestration exports and route-planning primitives in `packages/sdk/src/convert.ts`
- added SDK conversion artifacts for `value`, `shape`, and `constraints`
- added tests covering constraint IR contracts and SDK route-planning behavior

## Current Supported Schema Capabilities

- scalar
- object
- array
- tuple
- record or map
- union
- reference or reusable definition
- `null`
- optional presence
- enum-like literal nodes in IR and generator

## Current Supported Constraint Capabilities

The current `Constraint IR` and JSON Schema parser-generator path now support:

- closed object semantics through `closed-object`
- numeric constraints: `minimum`, `maximum`, `exclusiveMinimum`, `exclusiveMaximum`, `multipleOf`
- string constraints: `pattern`, `minLength`, `maxLength`, `format`
- collection constraints: `minItems`, `maxItems`, `uniqueItems`
- object constraints: `minProperties`, `maxProperties`
- portable annotations: `default`, `description`, `examples`, `readOnly`, `writeOnly`

## Current Focus

- keep parser, IR, and generator boundaries explicit
- keep the new `value`, `shape`, and `constraint` packages in `@aio/core` cleanly separated
- keep TypeScript preprocess, single-file conversion, and future module resolution responsibilities explicit
- keep core semantics centralized so parser and generator packages do not drift
- improve development documentation and decision traceability
- apply the new capability-and-loss documentation pattern consistently across active parser and generator design docs
- evolve the current SDK route table into runtime parser-to-generator capability matching
- assess the next expansion boundary for the TypeScript schema-subset parser without letting it turn into a full TypeScript type-system parser
- keep the new JSON Schema generator aligned with the actual shared IR semantics instead of drifting toward ad hoc JSON Schema-specific behavior
- continue moving shape-adjacent validation and annotation semantics out of `Shape IR` and into `Constraint IR` when the split is structurally clearer there

## Current Core Internal Shape

The current `core` layer is now intentionally split both by IR family and by focused internal modules.

Public IR-family structure:

- `value/*`
- `shape/*`
- `constraint/*`
- `model/*`
- `pipeline/*`

Current `Shape IR` internal modules:

- `types.ts`: shared IR and result-shape types
- `factories.ts`: public construction entry points
- `identifiers.ts`: identifier normalization
- `equivalence.ts`: semantic node equality
- `validation.ts`: document and field invariants
- `normalization.ts`: union, tuple, and unknown-evidence normalization
- `guards.ts`: runtime node-kind guards

This is a meaningful improvement over the earlier state where these responsibilities were concentrated in one file.

## Current Orchestration Status

The SDK now has a real orchestration surface, but it is still in a transitional stage.

Current behavior:

- route planning is still driven by a static `sourceFormat -> targetFormat` table
- route metadata exposes `irSequence` and stage lists
- runtime artifacts can already carry `value`, `shape`, and `constraints`
- JSON Schema routes already preserve `Constraint IR` at runtime when both sides support it

Current limitation:

- the route metadata does not yet derive itself from parser and generator capabilities
- JSON Schema routes are still described mainly as `shape` routes even when constraints are preserved in practice

## Next Milestones

1. promote the current SDK route planner toward runtime capability matching between parser outputs and generator requirements
2. make parser and generator capability declarations explicit in code rather than implicit in hand-authored routes
3. decide the next small data-shape-preserving TypeScript parser slice after the new `enum`, enum-member-reference, and readonly support
4. decide whether source-location coverage should expand to every current parser failure or remain targeted to representative failures
5. keep the TypeScript parser supported subset, failure matrix, and package docs aligned as the next cases land
6. decide which JSON Schema generator behaviors should remain fixed in v0 versus become future options, especially around `oneOf` and object closure

## Current JSON Schema Generator Status

The JSON Schema generator now exists as a real second target surface for the shared IR.

### Currently Supported In The JSON Schema Generator

- Draft 2020-12 output
- scalar, literal, null, object, array, tuple, record, union, reference, and unknown nodes
- document-local reusable definitions through `$defs`
- root `$ref` output when the document root is a reference
- simple nullable fields through compact `type: ["T", "null"]`
- tuple optionality through `prefixItems`, `minItems`, and `items: false`
- record semantics through `additionalProperties`
- constraint-driven rendering for `closed-object`, string and numeric constraints, collection constraints, `format`, `default`, `description`, `examples`, `readOnly`, and `writeOnly`

### Current JSON Schema Generator Gaps

- external `$ref`
- multi-document or multi-file output
- draft switching
- configurable `oneOf` vs `anyOf`
- richer object-closure policy beyond the current option-plus-constraint model

## Current TypeScript Parser Status

The TypeScript parser now supports a meaningful first v0 schema subset and end-to-end integration with the existing schema IR and TypeScript generator.
Its success-path coverage and failure-matrix coverage are now tracked separately to make expansion boundaries easier to review.

### Currently Supported In The TypeScript Parser

- explicit named entry declarations
- `type` aliases
- `interface` declarations
- `enum` declarations that map cleanly to literal values
- earlier-member enum references when they resolve to supported literal values
- `export`-modified supported declarations when their underlying declaration shape remains inside the current subset
- single-file reachable declarations without cross-file import resolution
- object type literals
- scalar keywords: `string`, `number`, `boolean`
- `null`
- readonly properties and readonly array or tuple syntax when they do not add new shared IR semantics
- optional properties
- field-level nullable unions such as `string | null`
- general unions
- array shorthand and `Array<T>`
- `ReadonlyArray<T>`
- tuples without rest elements
- scalar literal types and literal unions
- `Record<string, T>`
- reachable top-level named references

### Current TypeScript Parser Gaps

- tuple rest elements
- interface `extends` clauses
- named entries that resolve to unsupported declaration kinds such as classes
- imported type references that require cross-file resolution
- namespace-imported type references and re-export-only entries that require cross-file resolution
- external or unresolved type references
- utility types outside `Record`
- conditional, mapped, function, and intersection types
- unsupported object type members and computed property names
- generic unsupported syntax kinds that do not map into the current data-shape IR
- computed enum evaluation beyond the current literal, implicit-numeric, and earlier-member-reference subset
- readonly syntax still shares the current tuple-rest and malformed array-reference boundaries
- automatic root declaration discovery from a full file
- checker-driven semantic resolution
- shared IR-level source span metadata

### Planned Next Slice For Diagnostics

The next TypeScript parser improvement should likely happen in this order:

1. the source-location shape is now decided: parser-specific diagnostic `evidence.sourceLocation`
2. representative parser failures now capture source-location evidence
3. the failure matrix now locks representative `path + sourceLocation` pairs across entry, definition, field, type-reference, and tuple failures
4. unsupported-node diagnostics now also preserve stable `syntaxKind`, `nodeText`, and targeted category evidence where useful
5. next diagnostic work can focus on breadth decisions rather than shape decisions

## Remaining Core Work

The remaining `core` work is now narrower than before. The biggest structural gaps have already been addressed.

### Must

- keep the current internal split stable as new semantics are added
- keep the shared IR contract, diagnostics contract, and package docs aligned with actual behavior
- keep orchestration truthfully aligned with actual parser-produced and generator-consumed IR sets

### Should

- review whether the current top-level `core` export surface is clearer enough for future `web` and other consumers
- decide whether literal-preserving or additional parser-facing semantics require any real IR expansion instead of parser-only behavior
- continue using and extending the TypeScript schema-subset parser as the current second-language validation surface for the IR
- keep the TypeScript parser case inventory and todo list aligned with actual implementation progress
- decide whether the next TypeScript parser work should prioritize more success-path coverage or richer diagnostics and source-location information
- decide which JSON Schema generator output choices are stable semantic decisions versus temporary v0 simplifications
- evolve the route planner so parser and generator combinations are decided at runtime rather than only by hand-maintained format pairs
- keep a running distinction between:
  - likely shared-IR capability gaps
  - likely JSON Schema-local concerns
  - still-undecided gray areas that need more parser/generator evidence

### Can Wait

- automatic repeated-shape extraction into reusable definitions
- cross-document reuse or import/export semantics
- source-location metadata or syntax-span tracking
- any broader IR expansion motivated by schema ecosystems rather than current shared data-shape needs

## Open Risks

- extending IR too quickly may still bake in assumptions from JSON before other inputs arrive
- record and object inference boundaries must stay conservative and explicit
- references and reuse may become increasingly important as generated output grows
- parser and generator options can become hard to reason about if defaults and capability boundaries are not kept clear
- core internal helpers could still drift again if new semantics are added without being placed in the right internal module
- a static route table can drift away from actual parser and generator capabilities as multi-IR flows become more common

## Current IR-Expansion Guardrail

The current stance is to avoid expanding the shared IR just to make an early JSON Schema parser more source-faithful.

Until more parser and generator surfaces are implemented, new pressure should be classified in one of three buckets:

- likely shared-IR gap: semantics that plausibly matter across multiple schema ecosystems
- likely JSON Schema-specific concern: semantics tied mostly to JSON Schema drafts, refs, or validation keywords
- undecided gray area: semantics that may become shared later, but do not yet have enough cross-surface evidence

This is meant to keep the project honest about where its next abstraction pressure is really coming from.
