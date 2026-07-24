# Web Integration Notes

This note describes the smallest recommended way to wire `@aio/sdk` into an early downstream Web surface.

It is intentionally practical rather than exhaustive.
Use [consumer-surface-checklist.md](consumer-surface-checklist.md) for repository readiness status and [../../packages/sdk/README.md](../../packages/sdk/README.md) for the package-local API overview.

## Recommended Stage 1 Surfaces

For a first Web integration, treat these `@aio/sdk` helpers as the main building blocks:

- `listFormatSupports()`
- `describeFormatSupport(...)`
- `listConversionRoutes()`
- `planConversion(...)`
- `describeConversionRouteCapabilities(...)`
- `convert(...)`
- `collectUserFacingDiagnostics(...)`
- `publicConvertResultSchema`

That split maps naturally to typical UI concerns:

- format discovery
- route discovery
- conversion execution
- user-facing result presentation
- optional runtime validation at app boundaries

## Recommended Call Order

For a simple converter UI, the recommended order is:

1. call `listFormatSupports()` once to build source and target format pickers
2. call `listConversionRoutes()` once to derive available route pairs
3. when the user changes formats, call `planConversion(...)` and `describeConversionRouteCapabilities(...)` for route copy and support hints
4. when the user runs a conversion, call `convert(...)`
5. validate the result with `publicConvertResultSchema` if the app boundary benefits from runtime checks
6. normalize result messaging with `collectUserFacingDiagnostics(...)`

In most downstream apps, steps `1` to `3` can happen at startup or when route selection changes, while steps `4` to `6` happen per conversion run.

## Recommended UI State Model

The smallest useful state model is:

- `idle`
- `editing`
- `running`
- `success`
- `failure`

Recommended interpretation:

- `idle`: before the first conversion
- `editing`: input or route has changed since the last completed run
- `running`: conversion is in progress
- `success`: `convert(...)` returned `ok: true`
- `failure`: `convert(...)` returned `ok: false`

For Stage 1, consumers should branch primarily on `result.ok`, not on exception text.

## Recommended Result Mapping

When `convert(...)` succeeds:

- render `result.output` as the main output panel
- read `result.report?.semanticCaveats` and `result.losses` first for user-facing caveats
- use `collectUserFacingDiagnostics(result)` for the main diagnostics panel
- use `result.report?.capabilityRequirements` and `result.report?.lossHotspots` only for advanced inspection or expandable detail

When `convert(...)` fails:

- show `result.code` and `result.message` as the primary failure summary
- normalize the full list with `collectUserFacingDiagnostics(result)`
- use `result.phase` to distinguish current public failure categories: `parse | generate`

## Recommended Picker Wiring

For Stage 1, do not hard-code format names in the UI.

Instead:

- derive all known formats from `listFormatSupports()`
- derive valid routes from `listConversionRoutes()`
- use `describeFormatSupport(...)` for help text and limitations
- use `describeConversionRouteCapabilities(...)` for route-level capability copy

This keeps the Web layer aligned with the SDK surface instead of duplicating format knowledge in product code.

## Recommended Diagnostics Wiring

Use `collectUserFacingDiagnostics(...)` as the default rendering input for diagnostics lists.

Recommended UI behavior:

- group primarily by `severity`
- show `title` and `message` by default
- show `path` and `source` as secondary metadata when present
- use `sourceRange` only when present
- treat `technicalDetails` as expandable debug detail rather than default copy

For Stage 1, consumers should not assume that every failure or warning includes source-location data.

## Recommended Advanced Detail Panels

If the Web surface includes an advanced drawer or inspector, the most useful fields are:

- `result.plan`
- `result.report?.entrySelection`
- `result.report?.policyDecisions`
- `result.report?.capabilityRequirements`
- `result.report?.lossHotspots`
- `result.preservedCapabilities`

That is usually enough to explain:

- which route ran
- why a TypeScript entry was selected
- what semantics were required
- where widening or loss pressure appeared

## Worker Guidance

For Stage 1, the SDK can stay synchronous at the library layer.

If the downstream Web app needs main-thread isolation, prefer:

1. keep the core integration shape the same
2. move the `convert(...)` call into a Worker at the product layer
3. pass back the validated convert result and normalized diagnostics

That preserves one mental model across local, Worker, CLI, and future service-backed integrations.

## Minimal Example

```ts
import {
  collectUserFacingDiagnostics,
  convert,
  describeConversionRouteCapabilities,
  listConversionRoutes,
  listFormatSupports,
  planConversion,
  publicConvertResultSchema,
} from "@aio/sdk";

const formats = listFormatSupports();
const routes = listConversionRoutes();

const plannedRoute = planConversion("json-schema", "typescript");
const routeSummary = describeConversionRouteCapabilities(
  "json-schema",
  "typescript",
);

const result = convert({
  sourceFormat: "json-schema",
  targetFormat: "typescript",
  input: '{"type":"object","properties":{"id":{"type":"integer"}}}',
  name: "User",
});

publicConvertResultSchema.parse(result);

const diagnostics = collectUserFacingDiagnostics(result);

console.log(formats, routes, plannedRoute, routeSummary, diagnostics);
```

## What This Note Does Not Promise

This note does not promise:

- browser-bundle validation for every downstream stack
- a required React or framework-specific state model
- a complete async or Worker abstraction in the SDK itself
- a full public ontology for every capability or limitation string

It is only the recommended Stage 1 wiring pattern for early downstream Web work.
