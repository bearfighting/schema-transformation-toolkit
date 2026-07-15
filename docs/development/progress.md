# Progress

## Current Phase

The workspace is in an IR-hardening phase.

The main goal is to make the current schema IR clear, testable, and reusable before broadening to more languages or more advanced schema features.

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

## Current Focus

- keep parser, IR, and generator boundaries explicit
- keep TypeScript preprocess, single-file conversion, and future module resolution responsibilities explicit
- keep core semantics centralized so parser and generator packages do not drift
- improve development documentation and decision traceability
- assess the next expansion boundary for the TypeScript schema-subset parser without letting it turn into a full TypeScript type-system parser
- keep the new JSON Schema generator aligned with the actual shared IR semantics instead of drifting toward ad hoc JSON Schema-specific behavior

## Current Core Internal Shape

The current `core` schema layer is now intentionally split into focused internal modules:

- `types.ts`: shared IR and result-shape types
- `factories.ts`: public construction entry points
- `identifiers.ts`: identifier normalization
- `equivalence.ts`: semantic node equality
- `validation.ts`: document and field invariants
- `normalization.ts`: union, tuple, and unknown-evidence normalization
- `guards.ts`: runtime node-kind guards

This is a meaningful improvement over the earlier state where these responsibilities were concentrated in one file.

## Next Milestones

1. decide the next small data-shape-preserving syntax slice after the new `enum`, enum-member-reference, and readonly support
2. decide whether source-location coverage should expand to every current parser failure or remain targeted to representative failures
3. keep the TypeScript parser supported subset, failure matrix, and package docs aligned as the next cases land
4. decide which JSON Schema generator behaviors should remain fixed in v0 versus become future options, especially around `oneOf`, object closure, and compact nullable rendering

## Current JSON Schema Generator Status

The JSON Schema generator now exists as a real second target surface for the shared IR.

### Currently Supported In The JSON Schema Generator

- Draft 2020-12 output
- scalar, literal, null, object, array, tuple, record, union, reference, and unknown nodes
- document-local reusable definitions through `$defs`
- root `$ref` output when the document root is a reference
- nullable fields through structural `oneOf`
- tuple optionality through `prefixItems`, `minItems`, and `items: false`
- record semantics through `additionalProperties`

### Current JSON Schema Generator Gaps

- external `$ref`
- multi-document or multi-file output
- draft switching
- schema annotation generation such as `description`, `examples`, or `default`
- configurable `oneOf` vs `anyOf`
- configurable object closure semantics
- compact nullable rendering such as `type: ["string", "null"]`

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

### Should

- review whether the current top-level `core` export surface is clearer enough for future `web` and other consumers
- decide whether literal-preserving or additional parser-facing semantics require any real IR expansion instead of parser-only behavior
- continue using and extending the TypeScript schema-subset parser as the current second-language validation surface for the IR
- keep the TypeScript parser case inventory and todo list aligned with actual implementation progress
- decide whether the next TypeScript parser work should prioritize more success-path coverage or richer diagnostics and source-location information
- decide which JSON Schema generator output choices are stable semantic decisions versus temporary v0 simplifications

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
