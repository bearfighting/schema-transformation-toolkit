# Consumer Surface Checklist

This checklist tracks the remaining work needed to keep the repository ready for downstream consumer surfaces such as Web apps, CLIs, docs tooling, or other product layers.

This repository itself remains a Node library workspace.
It is not the place where those product surfaces are implemented.

## Current Judgment

As of July 23, 2026:

- the repository is already strong enough to support early downstream product work
- the main remaining blockers are no longer `Shape IR` traversal completeness or more core refactoring
- the real risks are public SDK contract stability, presentation-friendly result shaping, and honest capability description

The goal is to clear the minimum library-level blockers and then let downstream consumer surfaces move.
The goal is not to wait for the core to become "fully complete."

## Must Finish Before Treating The Library Surface As Stable For Consumers

These are the highest-value library-facing gaps.

### 1. Freeze A Small Consumer-Facing SDK Contract

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

Current repository status:

- this is now partially in place through `publicConvertResultSchema` and companion schemas in `@aio/sdk`
- remaining work is mostly to treat that contract as the default downstream boundary and keep its semantics documented

Important current note:

- current failure `phase` values are intentionally narrow
- that is acceptable as long as the public meaning is documented and tested

### 2. Add A UI-Friendly Diagnostic Normalization Layer

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

- this is now partially in place through `collectUserFacingDiagnostics(...)` in `@aio/sdk`
- remaining work is mostly around choosing how much of that normalized model should be considered part of the long-term public contract

### 3. Publish Honest Machine-Readable Capability Summaries

Why it matters:

- current route and capability descriptions are strong enough for engineering
- downstream product layers need stable support summaries that are safe to show to users without scraping README prose

Current strength already exists in:

- `describeConversionRouteCapabilities(...)`
- `planConversion(...)`
- `listConversionRoutes()`

Current gap:

- there is still no stable consumer-facing description of supported format subsets and known unsupported semantic families

Current repository status:

- this is now partially in place through `describeFormatSupport(...)` and `listFormatSupports()` in `@aio/sdk`
- remaining work is mostly to keep the summary small, honest, and aligned with real parser and generator behavior

First useful target:

- a small format and route description model that can drive badges, route availability, and honest limitation copy

## Should Land Soon After

These items are important, but they do not need to block the first downstream consumer surface.

### 4. Curated Golden Examples

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

- this is now partially in place through [../../examples/consumer-golden-examples.md](../../examples/consumer-golden-examples.md)
- remaining work is mostly to keep the curated set aligned with real supported behavior as route coverage grows

### 5. Consumer Runtime Notes

Why it matters:

- downstream product layers may care about browser/runtime portability, bundling behavior, and package size
- those checks are real, but they belong primarily in the consuming surface or a dedicated integration harness

This repository should:

- avoid unnecessary product-layer coupling to hidden runtime assumptions
- document notable runtime-sensitive dependencies
- avoid advertising browser guarantees that have not been proven

This repository does not need to host a full browser demo just to stay a healthy Node library.

## Explicitly Not A Blocker

These items should not delay consumer-surface work now:

- more traversal features beyond the current contract
- more transform sophistication
- broader normalization scope
- new parser families
- deeper multi-file TypeScript support
- a fully generalized capability ontology across every target

They may matter later, but they are not the reason downstream product work should wait.

## Recommended Start Order

1. freeze and test the small public SDK contract
2. add one UI-friendly diagnostic normalization layer
3. publish a small consumer-facing capability summary model
4. let downstream consumer surfaces iterate on top of that contract
5. then fill in curated golden examples and runtime notes alongside downstream integration work

## Relationship To Other Docs

Use this checklist together with:

- [progress.md](progress.md) for repository-level status
- [sdk-report-analysis.md](sdk-report-analysis.md) for current report interpretation
- [capabilities-and-loss.md](capabilities-and-loss.md) for truthfulness rules
- [schema-traversal.md](schema-traversal.md) only when changing the shared traversal contract itself
