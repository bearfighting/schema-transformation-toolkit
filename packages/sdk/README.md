# `@schema-transformation-toolkit/sdk`

`@schema-transformation-toolkit/sdk` is the highest-level package in the repository.

It is the single-package installation for the built-in parser and generator
surface. Install `@schema-transformation-toolkit/sdk` alone for the normal pipeline API; the individual
`@schema-transformation-toolkit/parser-*` and `@schema-transformation-toolkit/generator-*` packages remain available for advanced,
format-specific integrations.

It is the intended downstream consumer boundary for product surfaces.
Project-level readiness and priorities live in [../../docs/development/progress.md](../../docs/development/progress.md), not in this package README.

If you are using the toolkit rather than integrating the SDK itself, start with
the [User Guide](../../docs/user-guide.md) and [Capability Matrix](../../docs/capability-matrix.md).

The current target formats are JSON, CSV, TOML, JSON Schema, TypeScript, OpenAPI 3.1, Zod 4, YAML, Rust, Python dataclasses, Go, and Java records/classes/enums. Selecting
`targetFormat: "zod"` generates a single ESM module. The default output is
TypeScript with a `z.infer` type; pass
`advanced.generator.zod.outputLanguage: "javascript"` for a plain JavaScript
runtime-schema module. The consuming project must install Zod 4.

The OpenAPI schema boundary and unsupported-feature diagnostics are documented
in the [project design](../../docs/development/design.md).

Python support is a restricted Python 3.10+ dataclass type-shape adapter. It
does not execute Python or promise serialization behavior. Defaults,
`field(...)`, inheritance, generics, maps, arbitrary unions, Literal, and Enum
are intentionally unsupported in V1. Conversions that lose schema constraints
report those losses in the normal SDK result report.

The SDK treats Python Dataclass as a format-specific adapter over Shape IR. The
shared `SchemaDocument.rootName` field preserves a known root declaration name
separately from document identity; legacy documents without it use the document
name as the generator fallback.

Required presence and nullable values remain separate in Python conversions;
nested nullable values are represented by Shape unions inside arrays or other
container nodes.

Use it when you want to:

- convert between supported source and target formats
- inspect route planning at a higher level
- read aggregated diagnostics, semantic caveats, losses, and report analysis
- validate the public conversion result shape at runtime
- normalize raw diagnostics and caveats into a UI-facing model

## Main Entry Point

```ts
import { convert } from "@schema-transformation-toolkit/sdk";

const result = convert({
  sourceFormat: "json-schema",
  targetFormat: "typescript",
  input: JSON.stringify({
    title: "User",
    type: "object",
    properties: {
      id: { type: "integer" },
      name: { type: "string" },
    },
    required: ["id", "name"],
  }),
});

if (!result.ok) {
  console.error(result.phase, result.code, result.message);
  console.error(result.diagnostics);
} else {
  console.log(result.output);
  console.log(result.report);
}
```

The default registry includes JSON, CSV, TOML, JSON Schema, TypeScript, OpenAPI, Zod, YAML, Rust,
Python, Go, Java, and C# parsers, plus JSON, CSV, TOML, JSON Schema, TypeScript, Zod, OpenAPI, YAML, Rust,
Python, Go, Java, and C# generators. The SDK
bundles those implementations into its distributable runtime. TypeScript is
installed as a runtime dependency because the TypeScript parser uses the
official compiler API; Zod remains a dependency for the public contract
schemas. Consumers do not need to install any parser or generator package
separately.

C# support covers the documented single-file record, property-based class, and
symbolic enum subset. Use `advanced.parser.csharp.entry` to select a root
declaration when automatic root inference is ambiguous. C# generation accepts
`advanced.generator.csharp.namespace` and `style` (`record` or `class`).

The SDK keeps the OpenAPI parser's `yaml` dependency external to its ESM
bundle so Node and strict ESM runtimes can resolve it normally. It is declared
as a direct SDK runtime dependency and is installed automatically with the
package.

YAML uses a strict JSON-compatible single-document profile. It rejects YAML
tags, anchors, aliases, merge keys, duplicate keys, non-string mapping keys,
and other YAML-specific values. YAML generation consumes Value IR only, so
schema-only sources cannot generate concrete YAML examples.

CSV uses a strict comma-separated, header-based profile. It lowers every cell
to a string and generates from flat Value IR object arrays; empty arrays need
the `advanced.generator.csv.columns` option, while nested values and nulls are
rejected.

TOML uses a strict TOML v1 Value profile. Date/time values, non-finite numbers,
and unsafe integers are rejected. TOML generation consumes object-root Value IR;
comments and source formatting are not preserved.

## Public Compatibility Contract

For downstream product surfaces, the public compatibility contract is:

- call `convert(...)` for conversion execution
- validate cross-boundary payloads with `publicConvertResultSchema` when runtime checking is useful
- branch on `result.ok` for ordinary success or failure handling
- treat `result.phase` on failures as the current public failure taxonomy: `parse | transform | generate`

The most stable result fields for consumers to build on are:

- failure: `code`, `message`, `phase`, `plan`, optional `diagnostics`, retained `artifacts`, `losses`, and `semanticNotes`
- success: `output`, `plan`, optional `report`
- report core: `irSelection`, `semanticCaveats`, `losses`, `capabilityRequirements`, `lossHotspots`, `entrySelection`, `policyDecisions`
- diagnostic core: `severity`, `code`, `message`, optional `path`, optional `source`

The scenario-matrix tests in [../../tests/sdk/scenario-matrix.test.ts](../../tests/sdk/scenario-matrix.test.ts) exercise this contract through stable `success`, `caveat`, `unsupported`, `invalid-input`, route-planning, and `sourceRange`-bearing flows.

Consumers should not rely on:

- thrown exception strings for expected parse, transform, or generate failures
- undocumented `evidence` payload details remaining byte-for-byte stable
- lower-level parser or generator internals as part of this public consumer boundary

## How To Read `result.report`

The most important report fields are:

- `irSelection`: the requested IR preference, selected entry IR, and whether `auto` fell back to Shape IR.

- `semanticCaveats`: user-facing successful-but-imperfect conversion caveats
- `losses`: declared route-level capability loss
- `preservedCapabilities`: capabilities preserved by the selected route
- `capabilityRequirements`: reachable shape features that the target needed to support
- `lossHotspots`: concrete use sites where widening or loss pressure appeared

Practical reading order:

1. start with `semanticCaveats` and `losses`
2. then inspect `capabilityRequirements` to understand reachable semantics
3. then inspect `lossHotspots` to understand concrete use-site pressure

Example:

```ts
if (result.ok) {
  for (const caveat of result.report?.semanticCaveats ?? []) {
    console.log("caveat", caveat.code, caveat.path);
  }

  for (const requirement of result.report?.capabilityRequirements ?? []) {
    console.log("feature", requirement.feature, requirement.path);
  }

  for (const hotspot of result.report?.lossHotspots ?? []) {
    console.log("hotspot", hotspot.code, hotspot.path, hotspot.referenceStack);
  }
}
```

## Consumer-Facing Helpers

`@schema-transformation-toolkit/sdk` now also exposes two small consumer-facing helper layers.

### Public Contract Schemas

Use these when a downstream app or boundary layer wants runtime validation of the public `convert(...)` result shape rather than trusting TypeScript types alone.

Most important exports:

- `publicConvertResultSchema`
- `convertSuccessResultSchema`
- `convertFailureResultSchema`
- `conversionReportSchema`
- `optionCatalogSchema`
- `conversionOptionCatalogsSchema`

### Option Metadata

Use the option metadata helpers when a consumer needs to explain advanced
configuration without parsing package README files:

```ts
import { describeConversionOptions } from "@schema-transformation-toolkit/sdk";

const options = describeConversionOptions("json", "typescript");
for (const option of options.parser.options) {
  console.log(option.key, option.description, option.defaultValue);
}
```

The public helpers are:

- `describeParserOptions(format)`
- `describeGeneratorOptions(format)`
- `describeConversionOptions(sourceFormat, targetFormat)`
- `describeTransformerOptions(id)`
- `listTransformerOptions()`
- `listOptionCatalogs()`

Conversion-level route selection is controlled with `irPreference` on
`convert(...)`: it accepts `"auto"`, `"value"`, or `"shape"`. The default
`"auto"` preference chooses Value IR when the route supports it and otherwise
uses Shape IR. Explicit preferences never fall back to another IR layer.

Route planning produces one execution plan shared by parsing and generation.
Its selected entrance IR, parser request, pipeline stages, and generator input
are therefore always aligned. Generator descriptors may use the explicit
`entryIr` and `overlays` capability fields; older `consumesIr`-only descriptors
remain supported through registry normalization.

Each option includes its semantic and diagnostic effect, affected pipeline
stages, supported or experimental status, value explanations, and structured
examples. The metadata is a semantic explanation contract, not a UI form
schema; control types, ordering, and presentation remain the responsibility
of the consuming application.

Example:

```ts
import {
  convert,
  publicConvertResultSchema,
} from "@schema-transformation-toolkit/sdk";

const result = convert({
  sourceFormat: "json",
  targetFormat: "typescript",
  input: '{"id":1}',
});

publicConvertResultSchema.parse(result);
```

### UI-Facing Diagnostics

Use `collectUserFacingDiagnostics(...)` when a downstream consumer should not need to understand the raw differences between:

- failure results
- `diagnostics`
- `semanticCaveats`
- `losses`

Example:

```ts
import {
  collectUserFacingDiagnostics,
  convert,
} from "@schema-transformation-toolkit/sdk";

const result = convert({
  sourceFormat: "json-schema",
  targetFormat: "typescript",
  input: '{"type":"object"}',
});

const diagnostics = collectUserFacingDiagnostics(result);
```

Each returned item follows one stable presentation-oriented shape:

- `severity`
- `code`
- `title`
- `message`
- optional `path`
- optional `source`
- optional `sourceRange`
- optional `suggestion`
- optional `technicalDetails`

The most stable expectations are:

- always branch on `severity`, `code`, `title`, and `message`
- use `path` and `source` when present for grouping or attribution
- use `sourceRange` when present for editor or inline-highlighting integrations
- treat `suggestion` as helpful copy, not as an exhaustive remediation taxonomy
- treat `technicalDetails` as drill-down data rather than as a primary rendering contract

### Capability Summaries

Use `describeFormatSupport(...)` or `listFormatSupports()` when a downstream app needs a small machine-readable support summary instead of scraping README prose.

Example:

```ts
import {
  describeFormatSupport,
  listFormatSupports,
} from "@schema-transformation-toolkit/sdk";

const typeScriptSupport = describeFormatSupport("typescript");
const allSupports = listFormatSupports();
```

Each summary includes:

- optional parser support details
- optional generator support details
- shared shape kinds
- constraint families
- notable limitations
- experimental areas

The most stable expectations are:

- use `listFormatSupports()` to drive format pickers without hard-coding format names
- use `describeFormatSupport(...)` for per-format help text, badges, and limitation copy
- rely on `format`, `parser`, `generator`, `sharedShapeKinds`, `constraintFamilies`, `notableLimitations`, and `experimentalAreas`
- treat limitation and experimental strings as concise support hints, not as a full public ontology

For route-level discovery, pair this with:

- `listConversionRoutes()`

## Extending The Registry

The default SDK registry contains the built-in formats. Extensions can create
an isolated registry and register parser or generator descriptors explicitly;
the SDK does not scan installed packages at runtime.

```ts
import {
  createConversionRegistry,
  createConverter,
  defaultConversionRegistry,
} from "@schema-transformation-toolkit/sdk";

const registry = createConversionRegistry({
  parsers: [...defaultConversionRegistry.listParsers(), myParserDescriptor],
  generators: [
    ...defaultConversionRegistry.listGenerators(),
    myGeneratorDescriptor,
  ],
});

const converter = createConverter(registry);
const result = converter.convert({
  sourceFormat: "json",
  targetFormat: "my-generator",
  input: '{"id":1}',
  extension: { generator: { mode: "runtime" } },
});
```

The default `convert(...)` keeps the existing built-in output types. For a
custom target, pass an output map to `createConverter<TOutputs>(...)`; targets
not present in that map are typed as `unknown` rather than being coerced to a
built-in string or JSON Schema output.

The registry-safe type aliases `RegistryOutputMap` and
`RegistryConversionOutput` are available for generic integrations. Builtin
format and output aliases remain supported as compatibility types; custom
registries should use descriptor identities and `createConverter(registry)` as
the extension boundary rather than depending on builtin format unions.

### Custom Registry Compatibility

The SDK now separates generic registry execution from builtin compatibility
types. Existing `ConvertOptions`, builtin format aliases, builtin output types,
and advanced option keys remain supported. New integrations should prefer:

- `createConverter(registry)` for custom parser, generator, and transformer
  registration;
- descriptor format identities instead of a builtin format union;
- `RegistryOutputMap` and `RegistryConversionOutput` for custom target typing;
- `genericConversionOptionCatalogsSchema` when option catalogs may contain
  custom source or target formats.

Builtin parser and generator implementations are injected through the generated
registry boundary. They are not dependencies of the SDK conversion
orchestration modules. Legacy builtin aliases remain supported until a
separately documented breaking-change release.

Each descriptor owns its format identifier, capabilities, option catalog, and
execution function. Registration rejects duplicate identifiers and descriptors
that cannot participate in the shared `Shape IR` pipeline. Built-in format
options remain strongly typed through the existing `advanced` options; custom
descriptor options use the extension records and are validated by the
descriptor implementation.

Descriptors currently use `descriptorVersion: "0.1"`. Registration validates
the version, format/capability alignment, option catalog role, Shape IR
support, and execution handler. Registration failures expose a stable
`DescriptorRegistrationError.code` such as `descriptor-invalid-version` or
`descriptor-options-mismatch`.

Generators may additionally expose analysis hooks for capability requirements,
loss hotspots, and semantic losses. The SDK always computes the generic route
baseline and combines it with these target-specific hooks; a hook failure is
returned as a structured `generator-analysis-failed` generation result.

- `planConversion(...)`
- `describeConversionRouteCapabilities(...)`

This layer is intentionally small.
It is meant to power honest badges, route copy, or help text, not to expose every internal capability rule directly.

## Supported High-Level Routes

Current public route planning is registry-driven. The builtin registry currently
exposes 12 source formats and 12 target formats, with 110 planned source-target
routes. The route families include:

- Value sources (`json`, `yaml`, `csv`, `toml`) to compatible Value targets and
  Shape targets where root constraints allow it;
- Shape sources (`json-schema`, `typescript`, `zod`, `openapi`, `rust`,
  `python`, `go`, `java`) to compatible Shape and Constraint targets;
- same-format routes where the parser and generator share a compatible IR.

Use `listConversionRoutes()` and `describeConversionRouteCapabilities(...)` for
the exact current route set; custom registries can change it.

The `json -> json` route is a Value IR round-trip. It serializes valid JSON to
normalized JSON text without running schema inference, so valid mixed values
that cannot produce Shape IR can still use this route. It does not preserve
source whitespace, escape spelling, number lexemes, or duplicate keys.

Use `planConversion(...)` or `describeConversionRouteCapabilities(...)` when you want route metadata without running a conversion.

## More Detail

For task-oriented usage and common failure-handling patterns, see:

- [../../docs/user-guide.md](../../docs/user-guide.md)
- [../../docs/capability-matrix.md](../../docs/capability-matrix.md)

For deeper report interpretation, see:

- [../../docs/development/design.md](../../docs/development/design.md)

For project-level readiness status and remaining downstream-consumer work, see:

- [../../docs/development/progress.md](../../docs/development/progress.md)
- [../../docs/development/standards.md](../../docs/development/standards.md)
