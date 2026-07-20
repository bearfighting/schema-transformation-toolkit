# TypeScript Parser Checklist

This file is the active execution checklist for the TypeScript parser workstream.

It is intentionally narrow.
The goal is to expand the current schema-oriented TypeScript subset without turning the project into a full TypeScript compiler front-end.

Repository-level prioritization lives in [progress.md](progress.md).

For current support boundaries and examples, use:

- [../../packages/parsers/typescript/README.md](../../packages/parsers/typescript/README.md)
- [typescript-parser-cases.md](typescript-parser-cases.md)
- [typescript-parser-preprocess.md](typescript-parser-preprocess.md)

For repository-wide result-contract rules, use:

- [capabilities-and-loss.md](capabilities-and-loss.md)
- [ir-contract.md](ir-contract.md)

## Completed Foundation

Already landed:

- parser package, public API shape, and base tests
- explicit-entry single-file parsing for `type`, `interface`, and supported `enum`
- object, array, tuple, union, literal, `null`, `Record<string, T>`, and named-reference conversion
- narrow normalization for readonly syntax and enum lowering
- stable failure codes, logical diagnostic paths, and parser-facing source-location evidence
- integration coverage for `typescript -> shape -> typescript` and `typescript -> shape -> json-schema`

## Next Worthwhile Work

This file should stay focused on TypeScript-parser-specific execution details.

### Must

- [x] add parser-facing source span or line-column diagnostics on top of the current logical `path` diagnostics
- [x] decide and document the intended support strategy for `enum`, `readonly` properties, and readonly array or tuple syntax before implementing them
- [x] keep the supported success subset, explicit failure matrix, and package docs aligned as new cases land
- [x] apply the capability-and-loss documentation pattern explicitly in the parser package README once the next supported slice lands
- [x] decide the next parser slice in favor of entry handling, preprocess clarity, and richer single-file support before taking on broader type-system constructs

### Source Span Diagnostics Breakdown

#### Step 1: Decide The Diagnostic Shape

- [x] decide whether source locations should live in `SchemaDiagnostic` top-level fields or remain parser-specific evidence for v0
- [x] keep the current logical `path` model as the primary semantic location even after source spans are added
- [x] define one canonical source-location shape for parser diagnostics, covering at least line, column, and text span

Chosen direction for v0:

- keep `SchemaDiagnostic` top-level shape unchanged for now
- add source locations inside parser-specific `diagnostic.evidence.sourceLocation`
- keep `path` as the primary logical location and treat source locations as complementary syntax-origin information
- use one canonical source-location shape with `start`, `end`, and `length`

#### Step 2: Add Parser-Level Capture

- [x] capture source locations for entry lookup failures where the source file is available but the declaration contract fails
- [x] capture source locations for unsupported type nodes and unsupported type members
- [x] capture source locations for nested field-level failures without losing the current logical field `path`

#### Step 3: Lock The Contract With Tests

- [x] add targeted parser tests that assert both logical `path` and source-location evidence on representative failures
- [x] cover at least one definition-level failure, one field-level failure, one type-reference failure, and one tuple failure
- [x] keep the current failure-matrix organization while extending assertions for source-location evidence

#### Step 4: Document The Surface

- [x] update the parser README once the chosen source-location shape is real
- [x] document whether source locations are parser-only evidence or part of the shared diagnostic contract
- [x] explain the intended distinction between logical IR paths and syntax-origin locations

### Should

- [x] expand representative unsupported-node diagnostics so they preserve both logical `path` information and useful source evidence
- [x] continue broadening that richer evidence coverage to future unsupported parser surfaces such as declaration-level pre-processing or multi-file boundaries
- [x] decide which currently unsupported features are "not yet supported" versus intentionally outside the project boundary
- [x] improve explicit diagnostics for unsupported top-level module statements and entry-resolution-adjacent preprocess cases
- [x] keep parser capability and semantic-loss documentation aligned with actual runtime behavior as new cases land

### Can Wait

- [x] make preprocess an explicit code-level step rather than only an architectural/documentation boundary
- [x] move interface-heritage blocking checks for the reachable local declaration graph into preprocess
- [x] automatic root declaration discovery for simple single-file inputs
- [ ] import-aware parsing across multiple files
- [x] add explicit parser diagnostics for direct imported type references, namespace-imported type references, and re-export-only entries in the current single-file subset
- [x] decide whether broader export-forwarding forms such as `export * from` should get equally explicit diagnostics or remain entry lookup misses for now
- [x] decide whether unsupported top-level module statements should be ignored, pre-processed away, or reported explicitly when they affect entry resolution
- [ ] checker-driven semantic resolution
- [ ] source span metadata in the shared IR itself rather than only parser diagnostics

Concrete next candidates from this bucket, once the current Must and Should items are in better shape:

- extend root discovery only when the single-file declaration graph still yields a unique, explainable candidate
- expand preprocess evidence and source-span coverage again when multi-file entry resolution work starts
- carefully chosen import-aware work only if the preprocess boundary stays explicit and additive

Chosen near-term slice after the July 19, 2026 parser push:

- continue conservative automatic root discovery work only for explainable single-file declaration graphs
- stabilize implicit-entry ambiguity reasons and preprocess evidence as a reviewable contract
- defer broader type-system constructs until that single-file entry and preprocess boundary remains clear

Current unsupported-feature classification:

- not yet supported: import-aware entry handling, export forwarding that would require cross-file reasoning, interface heritage, utility types beyond `Record`, and carefully chosen broader type-system forms when they still fit the shared schema subset
- intentionally outside the current project boundary for now: classes as schema entries, value-level module statements, method-like object members, computed property names, and syntax that does not describe portable data-shape semantics directly

## Longer-Term Backlog

- [ ] support for `intersection`
- [ ] support for conditional or mapped types
- [ ] support for utility types beyond `Record`
- [ ] import or export aware parsing across multiple files
- [ ] shared IR-level source span metadata
