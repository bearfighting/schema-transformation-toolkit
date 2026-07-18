# Stage 1 Public API

## Goal

The first public API for this project should optimize for one primary use case:

- a user provides one supported source format
- the system converts it to one supported target format
- the user can inspect route, diagnostics, losses, and preserved capabilities

At this stage, the project should **not** optimize for third-party parser or generator authoring.
That can be considered later, after more first-party formats and routes exist.

## Stage 1 Product Surface

The stable public product surface should be the high-level pipeline API exposed by `@aio/sdk`.

The intended stable entry points are:

- `convert`
- `planConversion`
- `listConversionRoutes`
- `describeConversionRouteCapabilities`

These APIs answer the main user questions:

- can this route run
- what IR path does it take
- what output do I get
- what semantics are preserved or lost

Helpers that only restate data already present on `ConversionRoute`, such as route-stage passthrough helpers, do not need to live on the Stage 1 SDK root.

## Stable Stage 1 Input Types

The following SDK types should be treated as stable for Stage 1:

- `ConversionSourceFormat`
- `ConversionTargetFormat`
- `ConvertOptions`
- `ConvertResult`
- `ConvertSuccessResult`
- `ConvertFailureResult`
- `ConversionArtifacts`

The current supported source formats are:

- `json`
- `json-schema`
- `typescript`

The current supported target formats are:

- `json-schema`
- `typescript`

## Stable Stage 1 Result Contracts

The `convert` result should be considered the main public contract.

The stable expectations are:

- `ok: true | false` is the primary success discriminator
- every result includes `plan`
- failure results include:
  - `code`
  - `message`
  - `phase`
- success results include:
  - `output`
  - optional `report`
  - optional `diagnostics`
  - optional `losses`
  - optional `preservedCapabilities`
  - optional `semanticNotes`
  - optional `artifacts` when explicitly requested

The important stability rule is:

- fields may be omitted when there is nothing meaningful to report
- field meaning should stay stable even if internal implementation changes

## Stable Stage 1 Route-Inspection Contracts

The following planning and inspection contracts should be considered stable:

- `ConversionRoute`
- `ConversionRouteCapabilities`
- `PipelineStage`
- `ConversionCapability`
- `SemanticLoss`
- `ConversionReport`
- `SchemaDiagnostic`
- `SchemaSemanticNote`

These are public because Stage 1 is not only about conversion output.
It is also about truthful inspectability of what the pipeline did.

For Stage 1 boundary clarity, these contracts should be treated as `@aio/core` contracts even when they appear in SDK result shapes.
`@aio/sdk` does not need to re-export them directly.

## Stage 1 Simplicity Rules

To keep the public API simple and teachable:

- `convert` should remain the default recommendation for most users
- route-planning APIs should remain optional inspection tools, not required setup
- parser-specific and generator-specific configuration should stay behind one `advanced` entry instead of inflating the main option surface
- internal pipeline modules should stay hidden behind SDK-level contracts

## Not Stable Yet

The following should **not** be treated as stable public commitments yet:

- direct use of individual parser or generator internal helpers
- internal SDK modules such as `registry.ts`, `source.ts`, `report.ts`, `losses.ts`, or `generate.ts`
- current exact artifact production strategy beyond the documented `includeArtifacts` behavior
- any future parser-registration or generator-registration mechanism
- any future plugin or extension API
- package-internal file layout

At the current stage, these may change freely as long as the Stage 1 SDK contract remains intact.

## SDK Root Policy

For Stage 1, `@aio/sdk` should mean pipeline-level conversion and route inspection.

That means:

- `@aio/sdk` should expose high-level conversion functions
- `@aio/sdk` may re-export a small set of type contracts needed to consume pipeline results
- that small set should primarily mean SDK-owned input and result wrapper types
- `@aio/sdk` root should prefer direct route objects over helper wrappers for trivial route property access
- `@aio/sdk` should not re-export entire parser packages
- `@aio/sdk` should not re-export entire generator packages
- `@aio/sdk` should not behave as a grab-bag alias for `@aio/core`

## Recommended Stage 1 Boundary Decision

For the next stabilization step, the repository should adopt this rule:

- the officially recommended public API is the pipeline surface in `@aio/sdk`
- parser packages and generator packages remain public packages, but they are not the primary product entry point
- no third-party extension API is promised yet

## Exit Criteria For Stage 1 Stability

Stage 1 can be considered stable when all of the following are true:

- the `@aio/sdk` pipeline surface is intentionally documented
- public exports are narrowed to match that documentation
- API snapshot checks protect the public contract
- dependency-boundary checks protect package direction
- new feature work can continue without changing the basic `convert` contract

## Current Enforcement Commands

The current repository commands for this policy are:

- `pnpm check:boundaries`
- `pnpm check:api`
- `pnpm check:api:update`
- `pnpm check:public-api`

The intended workflow is:

- run `pnpm check:public-api` in normal verification
- run `pnpm check:api:update` only when a public API change is intentional and reviewed
