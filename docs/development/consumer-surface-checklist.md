# Consumer Surface Checklist

This checklist tracks the remaining work needed to keep the repository ready for downstream consumer surfaces such as Web apps, CLIs, docs tooling, or other product layers.

This repository itself remains a Node library workspace.
It is not the place where those product surfaces are implemented.

This document is the single repository-level checklist for downstream consumer readiness.
Other repository docs should summarize or link to this page rather than restating the same task list.

## Current Judgment

As of July 23, 2026:

- the repository is already strong enough to support early downstream product work
- the main remaining blockers are no longer `Shape IR` traversal completeness or more core refactoring
- the real risks are public SDK contract stability, presentation-friendly result shaping, and honest capability description

The goal is to clear the minimum library-level blockers and then let downstream consumer surfaces move.
The goal is not to wait for the core to become "fully complete."

## Web Readiness Triage

If a downstream Web surface started now, the library is already usable.
But not every remaining improvement has the same urgency.

Treat the remaining work in three buckets:

### Must Finish Before Starting Serious Web Product Work

These are the true library-facing blockers before a downstream Web app should rely on the current surface as its stable base.

1. freeze a clearly documented Stage 1 consumer contract in `@aio/sdk`
2. add a small product-scenario matrix that tests end-user conversion flows rather than only parser or generator internals
3. finish the remaining contract documentation around the already-implemented machine-readable format and route surface

### Should Land Soon, But Should Not Block Web Start

These are important near-term improvements, but a downstream Web prototype or early product integration does not need to wait for them.

1. establish a first release and versioning baseline such as an alpha tag and release notes
2. make the diagnostic location contract more explicit for editor and code-highlighting integrations
3. decide whether a stable UI-summary layer belongs in `@aio/sdk` or should stay in the downstream presentation layer
4. reserve a Worker-friendly integration path without forcing async execution into the core SDK immediately

### Can Wait Until After The First Web Iteration

These are legitimate future improvements, but they should not delay the first downstream product surface.

1. broader failure-phase taxonomy beyond the current public `parse | generate` split
2. package-scope or public naming migration
3. broader capability ontologies or more generalized consumer summary layers
4. more parser families or target families just to make the eventual Web surface look larger on day one

## Must Finish Before Treating The Library Surface As Stable For Consumers

These are the highest-value library-facing gaps.

### 1. Freeze A Small Consumer-Facing SDK Contract

Status: in progress

Why it matters:

- downstream apps should depend only on the stable `@aio/sdk` surface
- consumer code should not need parser internals, generator internals, traversal helpers, or raw IR utility details

The intended consumer-facing entry points are already clear:

- `convert()`
- `planConversion()`
- `listConversionRoutes()`
- `describeConversionRouteCapabilities()`

Minimum acceptance:

- define and test the public success and failure result shapes as explicit contract data, not only through TypeScript compilation
- keep result handling as stable discriminated unions
- ensure consumers do not need thrown exception strings for ordinary flow control
- document which report and diagnostic fields are part of the Stage 1 consumer contract rather than accidental current output

Current repository status:

- this is materially in place through `publicConvertResultSchema` and companion schemas in `@aio/sdk`
- current stable consumer entry points are already centered on:
  - `convert()`
  - `planConversion()`
  - `listConversionRoutes()`
  - `describeConversionRouteCapabilities()`
- remaining work is mostly to document the intended Stage 1 boundary as an explicit stability promise rather than an accidental current shape

Stage 1 consumer contract should now be read as:

- downstream product code should treat `publicConvertResultSchema` as the runtime boundary for `convert(...)`
- consumers may rely on `ok` as the primary discriminant for ordinary success or failure flow control
- consumers may rely on failure results carrying:
  - `code`
  - `message`
  - `phase`
  - `plan`
  - optional `diagnostics`
- consumers may rely on success results carrying:
  - `output`
  - `plan`
  - optional `report`
  - optional `artifacts` when `includeArtifacts` is requested
  - optional top-level `diagnostics`, `losses`, `preservedCapabilities`, and `semanticNotes`
- consumers should treat these fields as the Stage 1 product-facing report core:
  - `report.semanticCaveats`
  - `report.losses`
  - `report.capabilityRequirements`
  - `report.lossHotspots`
  - `report.entrySelection`
  - `report.policyDecisions`
- within those report and diagnostic surfaces, consumers may treat these fields as especially stable:
  - `severity`
  - `code`
  - `message`
  - `path`
  - `source`
  - `referenceStack` where present
- consumers should not depend on:
  - thrown exception strings for ordinary unsupported or invalid-input handling
  - undocumented `evidence` payload internals staying frozen across future releases
  - low-level parser, generator, traversal, or IR helper exports as part of the Stage 1 product boundary

Important current note:

- current failure `phase` values are intentionally narrow
- that is acceptable as long as the public meaning is documented and tested
- the current public failure contract is still `parse | generate`
- a broader future taxonomy such as `planning | parsing | analysis | generation` is reasonable, but it is not required before the first Web-facing consumer starts

Fields that should be treated as especially important to freeze before serious Web work:

- `Diagnostic.severity`
- `Diagnostic.code`
- `Diagnostic.path`
- `Diagnostic.message`
- `report.semanticCaveats`
- `report.losses`
- `report.capabilityRequirements`
- `report.lossHotspots`
- `referenceStack`

Those fields are already close to a real product model.
The remaining work is to document them as an explicit consumer contract instead of leaving them implied by current implementation.

### 2. Add A UI-Friendly Diagnostic Normalization Layer

Status: in progress, but not a pre-Web blocker on its own

Why it matters:

- current SDK output is already information-rich
- current SDK output is not yet the final presentation model that every downstream surface should build for itself from scratch

Current raw layers already include:

- `diagnostics`
- `semanticCaveats`
- `losses`
- `capabilityRequirements`
- `lossHotspots`

Minimum acceptance:

- define one normalized view model for what downstream product layers should treat as:
  - errors
  - warnings
  - informational items
  - developer details
- keep raw evidence available for debugging, but do not require every consumer to understand every internal event shape directly

This does not require perfect copywriting.
It does require one stable presentation-oriented model.

Current repository status:

- this is now materially in place through `collectUserFacingDiagnostics(...)` in `@aio/sdk`
- remaining work is mostly around deciding whether more convenience summaries belong here or should stay in downstream presentation code

The Stage 1 UI-facing diagnostic contract should now be read as:

- downstream consumers may treat `collectUserFacingDiagnostics(...)` as the stable normalization layer across:
  - failure results
  - parser or generator diagnostics
  - semantic caveats
  - semantic losses
- each returned item should be treated as carrying these stable core fields:
  - `severity`
  - `code`
  - `title`
  - `message`
  - optional `path`
  - optional `source`
- consumers may also rely on:
  - optional `sourceRange` when structured parser evidence includes source locations
  - optional `suggestion` for a small set of known codes and failure phases
  - optional `technicalDetails` for debugging or drill-down UI
- consumers should not depend on:
  - every diagnostic always carrying `sourceRange`
  - `suggestion` coverage being exhaustive for every code
  - the internal shape of `technicalDetails` remaining frozen across future releases

Important current note:

- this normalization layer already exposes `sourceRange` when structured parser evidence includes source locations
- downstream Web consumers should not need to infer their own user-facing diagnostic shape from raw parser, generator, or semantic-loss payloads

### 3. Publish Honest Machine-Readable Capability Summaries

Status: mostly complete, with follow-up documentation remaining

Why it matters:

- current route and capability descriptions are strong enough for engineering
- downstream product layers need stable support summaries that are safe to show to users without scraping README prose

Current strength already exists in:

- `describeConversionRouteCapabilities(...)`
- `planConversion(...)`
- `listConversionRoutes()`
- `describeFormatSupport(...)`
- `listFormatSupports()`

Current gap:

- the code surface exists, but the contract still needs to be called out more explicitly as the intended downstream source of truth
- the remaining work is to keep the summary small, honest, and aligned with real parser and generator behavior as support evolves

Current repository status:

- this is already in place through `describeFormatSupport(...)`, `listFormatSupports()`, `planConversion(...)`, and `listConversionRoutes()`
- downstream consumers no longer need to hard-code format names just to build format pickers or availability states

The Stage 1 machine-readable capability-summary contract should now be read as:

- downstream consumers may treat these helpers as the stable route and format discovery layer:
  - `describeFormatSupport(...)`
  - `listFormatSupports()`
  - `planConversion(...)`
  - `listConversionRoutes()`
  - `describeConversionRouteCapabilities(...)`
- consumers may rely on format summaries carrying:
  - `format`
  - optional `parser`
  - optional `generator`
  - `sharedShapeKinds`
  - `constraintFamilies`
  - `notableLimitations`
  - `experimentalAreas`
- within `parser` and `generator`, consumers may rely on:
  - `producesIr` or `consumesIr`
  - `capabilities`
- consumers may treat these helpers as the Stage 1 source of truth for:
  - source-format pickers
  - target-format pickers
  - route availability
  - honest support and limitation copy
- consumers should not depend on:
  - the exact prose wording of every limitation string remaining unchanged forever
  - these summaries exposing every low-level parser or generator rule in exhaustive detail
  - experimental-area labels remaining product copy instead of concise engineering identifiers

First useful target:

- a small format and route description model that can drive badges, route availability, and honest limitation copy
- a downstream Web surface should be able to build:
  - source-format pickers
  - target-format pickers
  - route availability states
  - capability or limitation summaries
    without hard-coding format names like `["json", "json-schema", "typescript"]`

### 4. Add A Small Product-Scenario Matrix

Status: first pass in place, with follow-up expansion still required before calling the surface settled

Why it matters:

- the repository already has strong parser, generator, IR, and integration coverage
- those tests do not fully replace the flows a downstream Web user actually experiences

Downstream product users do not think in terms of parser or generator internals.
They:

- choose an input format
- paste or edit content
- choose a target format
- run a conversion
- inspect output, warnings, or failures

Minimum acceptance:

- add a small scenario matrix that protects stable success, caveat, unsupported, and invalid-input behavior from the SDK entry point
- keep the matrix intentionally small and product-shaped rather than turning it into a second full integration suite

Suggested first buckets:

- `success`
- `caveat`
- `unsupported`
- `invalid-input`

Current repository status:

- this now has a first dedicated product-facing SDK test layer in [../../tests/sdk/scenario-matrix.test.ts](../../tests/sdk/scenario-matrix.test.ts)
- the current matrix covers:
  - `success`
  - `caveat`
  - `unsupported`
  - `invalid-input`
- the current matrix also now exercises:
  - a stable `typescript -> typescript` authoring flow
  - a `json-schema -> json-schema` constraint-preserving round-trip
  - a parser failure path that surfaces structured `sourceRange` data for downstream highlighting
- remaining work is mostly to decide how much more route breadth is needed before this should stop being considered an active pre-Web blocker

## Should Land Soon After

These items are important, but they do not need to block the first downstream consumer surface.

### 5. Curated Golden Examples

Status: largely complete

Why it matters:

- the repository already has shared fixtures and examples
- downstream product layers need a smaller, curated set of product-facing examples for default content and confidence checks

First useful target:

- prepare 8 to 12 examples with:
  - title
  - source format
  - target format
  - input
  - expected output
  - expected diagnostic or caveat codes
  - short explanation

These should serve:

- default consumer samples
- smoke or E2E coverage in downstream repos
- docs and landing-page content

Current repository status:

- this is now materially in place through:
  - [../../examples/consumer-golden-examples.md](../../examples/consumer-golden-examples.md)
  - [../../examples/fixtures/consumer-golden-examples.ts](../../examples/fixtures/consumer-golden-examples.ts)
- remaining work is mostly to keep the curated set aligned with real supported behavior as route coverage grows

### 6. Consumer Runtime Notes

Why it matters:

- downstream product layers may care about browser/runtime portability, bundling behavior, and package size
- those checks are real, but they belong primarily in the consuming surface or a dedicated integration harness

This repository should:

- avoid unnecessary product-layer coupling to hidden runtime assumptions
- document notable runtime-sensitive dependencies
- avoid advertising browser guarantees that have not been proven

This repository does not need to host a full browser demo just to stay a healthy Node library.

### 7. Release And Version Baseline

Status: first pass in place, with npm publication still intentionally deferred

Why it matters:

- downstream product surfaces eventually need a stable engine baseline rather than an implicit dependency on `main`
- even if a Web surface starts inside a larger workspace, it is useful to know which engine snapshot it is exercising

Minimum useful target:

- first alpha tag
- brief release notes
- package versioning discipline
- at least one `pnpm pack` smoke check

Current repository status:

- a first non-npm release path is now in place through:
  - root release scripts for version sync, release checks, tagging, and packing
  - [release-process.md](release-process.md)
  - [../../.github/workflows/release.yml](../../.github/workflows/release.yml)
- GitHub Releases with autogenerated notes are now the intended current release-note surface
- npm publication remains intentionally deferred until the package surface is broader and more stable

### 8. Diagnostic Location Contract

Why it matters:

- syntax and parser failures benefit from line, column, and offset-oriented highlighting
- semantic caveats and losses often need logical schema paths instead of source text ranges

Current repository status:

- `collectUserFacingDiagnostics(...)` already surfaces `sourceRange` when structured source-location evidence exists
- remaining work is mostly to document when consumers should expect:
  - source-oriented ranges
  - semantic paths
  - both

This should improve editor integrations, but it should not block the first Web UI from shipping a simpler diagnostics list.

### 9. Worker-Friendly Integration Path

Why it matters:

- TypeScript parsing, reference-heavy analysis, and larger inputs may eventually be better off the main UI thread

Current repository status:

- worth planning for, but not a reason to force async execution into the current SDK before a downstream Web surface exists
- the first Web integration can keep the core SDK synchronous and isolate execution in a Worker at the product layer if needed

## Explicitly Not A Blocker

These items should not delay consumer-surface work now:

- more traversal features beyond the current contract
- more transform sophistication
- broader normalization scope
- new parser families
- deeper multi-file TypeScript support
- a fully generalized capability ontology across every target
- a broader failure-phase taxonomy before product pressure proves it is needed
- package-scope renaming before a clearer public release plan exists

They may matter later, but they are not the reason downstream product work should wait.

## Recommended Start Order

1. freeze and document the Stage 1 consumer contract already implied by `@aio/sdk`
2. add the small product-scenario matrix from the SDK entry point
3. finish the machine-readable route and format surface needed by downstream consumers
4. let downstream consumer surfaces iterate on top of that contract
5. then land release notes, richer location-contract notes, and any Worker-oriented integration guidance alongside early downstream product work

## Relationship To Other Docs

Use this checklist together with:

- [progress.md](progress.md) for repository-level status
- [sdk-report-analysis.md](sdk-report-analysis.md) for current report interpretation
- [capabilities-and-loss.md](capabilities-and-loss.md) for truthfulness rules
- [schema-traversal.md](schema-traversal.md) only when changing the shared traversal contract itself
