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
- keep core semantics centralized so parser and generator packages do not drift
- improve development documentation and decision traceability
- assess the remaining core work before broadening to a TypeScript schema-subset parser

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

1. document the core modularization state and remaining internal guardrails clearly
2. decide whether any additional core extraction is still worth it before shifting focus
3. TypeScript schema-subset parser planning and skeleton

## Remaining Core Work

The remaining `core` work is now narrower than before. The biggest structural gaps have already been addressed.

### Must

- keep the current internal split stable as new semantics are added
- decide whether explicit public validation helpers are needed before `web` or a TypeScript parser starts constructing IR more directly
- keep the shared IR contract, diagnostics contract, and package docs aligned with actual behavior

### Should

- review whether the current top-level `core` export surface is clearer enough for future `web` and `cli` consumers
- decide whether literal-preserving or additional parser-facing semantics require any real IR expansion instead of parser-only behavior
- add a TypeScript schema-subset parser to validate that the IR remains language-agnostic

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
