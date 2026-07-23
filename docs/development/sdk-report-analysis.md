# SDK Report Analysis

This note explains how to read the higher-level analysis fields in `sdk` conversion reports:

- `report.capabilityRequirements`
- `report.lossHotspots`

It is intentionally narrower than the full traversal design.
Use [schema-traversal.md](schema-traversal.md) for walker semantics and [capabilities-and-loss.md](capabilities-and-loss.md) for truthfulness rules.
Use [../../packages/sdk/README.md](../../packages/sdk/README.md) for the package-local quick-start view.

The `@aio/sdk` surface now also exposes:

- runtime-validated public contract schemas such as `publicConvertResultSchema`
- `collectUserFacingDiagnostics(...)` for a stable presentation-oriented diagnostic layer
- `describeFormatSupport(...)` and `listFormatSupports()` for small consumer-facing capability summaries

## Why These Fields Exist

The existing report already had several useful layers:

- `diagnostics` for direct issues
- `semanticNotes` for lower-level successful-but-imperfect facts
- `semanticCaveats` for a higher-level view of non-policy semantic notes
- `losses` for declared route-level capability loss

Those fields are still the main result surface.

The new analysis fields answer two narrower questions that the older fields did not answer well:

1. what reachable schema features does this target need to support?
2. where do widening-sensitive use sites actually occur after reference expansion?

That is why the repository now keeps both fields instead of trying to force everything into `semanticCaveats` or `losses`.

## Field Intent

### `capabilityRequirements`

`capabilityRequirements` is a reachable-feature inventory.

Each item answers:

- what semantic feature appeared
- where it appeared from the caller's point of view
- which followed definitions were involved

Typical examples:

- `object`
- `tuple`
- `union`
- `optional-field`
- `nullable-field`
- `local-reference`
- `recursive-reference`

This field is best for:

- capability matrices
- generator support review
- route explainability
- answering "what kind of shape semantics are actually present here?"

It is not a direct error list.
Seeing a requirement in this field does not mean the route failed or even widened anything.

### `lossHotspots`

`lossHotspots` is a use-site-sensitive widening and loss candidate inventory.

Each item answers:

- what kind of hotspot was found
- which concrete use site exposed it
- which followed definitions were involved

Current TypeScript-oriented examples include:

- `integer-widening`
- `wide-unknown`
- `unknown-union-absorption`

This field is best for:

- explaining why a route produced semantic caveats
- finding repeated widening across multiple reference occurrences
- future UI or CLI summaries that want "where are the risky spots?"

It is not a substitute for `semanticCaveats`.
The actual target-facing caveat that users should usually read first is still in `semanticCaveats`.

## Why The Two Fields Use Different Traversal Policies

The repository intentionally does not compute both fields with the same reference-visit policy.

`capabilityRequirements` uses:

- `references: "follow"`
- `referenceVisits: "once-per-definition"`

Why:

- capability questions usually care about reachable semantics
- they usually do not gain much from counting the same definition body many times
- deduped follow behavior keeps the report smaller and easier to scan

`lossHotspots` uses:

- `references: "follow"`
- `referenceVisits: "per-occurrence"`

Why:

- widening risk is often use-site-sensitive
- the same referenced definition can matter in multiple places
- keeping repeated occurrences visible is useful for explainability

This split is deliberate.
If both fields used the same traversal policy, one of them would be less useful.

## How To Read `path`

Both fields use the shared logical path contract from `Shape IR` traversal.

Important rule:

- `path` describes the occurrence site

That remains true even after reference following.

Examples:

- `["root", "id"]` means the root object's `id` field
- `["root", "1"]` means the second tuple or union member under root
- `["definitions", "User", "name"]` means the `name` field inside the declared `User` definition

If a hotspot appears after following a reference, the path still points to the reference use site rather than silently switching to the target definition declaration path.

That makes repeated occurrences visible and keeps report consumers aligned with emitted target structure.

## How To Read `referenceStack`

`referenceStack` explains how follow-mode traversal reached the current node.

It is ordered from outer follow to inner follow.

Example:

- `["WideValues", "FallbackValue"]`

This means:

1. the current occurrence first followed into `WideValues`
2. inside that followed body, it then followed into `FallbackValue`

This field is useful when `path` alone is not enough to explain where semantics came from.

## How To Read `lexicalDefinitionName` And `containingDefinitionName`

These two fields are related but not identical.

`lexicalDefinitionName` means:

- the definition that owns the current occurrence path

`containingDefinitionName` means:

- the definition whose followed body currently contains the visited node semantics

In many root-based traversals, `lexicalDefinitionName` is absent because the occurrence lives under `root`, not under a named definition.

When both are present, the difference helps distinguish:

- where the use site belongs
- which followed definition body contributed the semantics

## Relationship To Existing Report Fields

Use these report fields in roughly this order:

1. read `diagnostics` for direct failure or warning facts
2. read `semanticCaveats` for user-facing successful-but-imperfect conversion caveats
3. read `losses` for declared route-level unsupported capability preservation
4. read `capabilityRequirements` to understand reachable semantics
5. read `lossHotspots` to understand where use-site-sensitive widening pressure appears

Practical guidance:

- if you want "what happened to the user?", start with `semanticCaveats` and `losses`
- if you want "why did that happen structurally?", inspect `capabilityRequirements` and `lossHotspots`

## What Not To Assume

Do not assume:

- every `capabilityRequirement` implies a generator limitation
- every `lossHotspot` becomes a surfaced diagnostic
- repeated `lossHotspots` mean repeated emitted declarations
- absence of `lossHotspots` means exact preservation in every semantic dimension

These fields are analysis aids.
They improve explainability, but they are not the whole truth by themselves.

## Current Scope

As of July 23, 2026:

- the higher-level report fields are populated for `typescript` targets
- the current analysis is shape-oriented and reference-aware
- the current hotspot taxonomy is intentionally small

That is enough to validate the report model without pretending the repository already has a full generic loss-analysis framework for every route.

## Example Reading Pattern

If a report contains:

- `semanticCaveats` with `integer-widened-to-number`
- `capabilityRequirements` with `object`
- `lossHotspots` with `integer-widening` at `["root", "id"]`

the intended interpretation is:

1. the route succeeded
2. the target widened integer semantics
3. the widening is concretely visible at the root `id` use site
4. the document also requires ordinary object-shape support

That is a better explanation than either:

- only showing a caveat code without structural context
- only showing a structural feature list without telling the user where widening happened

## End-To-End Example

The following example is intentionally small but still exercises:

- local references
- followed union members
- `unknown` widening
- `integer` widening

### Input

```ts
import { convert } from "@aio/sdk";

const result = convert({
  sourceFormat: "json-schema",
  targetFormat: "typescript",
  input: JSON.stringify({
    title: "ExampleDocument",
    $defs: {
      Count: {
        type: "integer",
      },
      FallbackValue: true,
      FlexibleValue: {
        anyOf: [{ const: "open" }, { $ref: "#/$defs/FallbackValue" }],
      },
    },
    type: "object",
    properties: {
      id: { $ref: "#/$defs/Count" },
      value: { $ref: "#/$defs/FlexibleValue" },
    },
    required: ["id", "value"],
  }),
});
```

### What To Read First

The first report fields to inspect are still:

- `report.semanticCaveats`
- `report.losses`

In this example, you should expect the interesting user-facing caveats to be:

- integer widened to TypeScript `number`
- a union branch widened by an `unknown` member
- an `unknown` branch rendering as TypeScript `unknown`

That tells you what happened from the target user's point of view.

### `capabilityRequirements`

A simplified `capabilityRequirements` shape for this example would look like:

```ts
[
  {
    feature: "object",
    path: ["root"],
    referenceStack: [],
  },
  {
    feature: "local-reference",
    path: ["root", "id"],
    referenceStack: [],
    evidence: {
      targetDefinition: "Count",
    },
  },
  {
    feature: "local-reference",
    path: ["root", "value"],
    referenceStack: [],
    evidence: {
      targetDefinition: "FlexibleValue",
    },
  },
  {
    feature: "union",
    path: ["root", "value"],
    referenceStack: ["FlexibleValue"],
    containingDefinitionName: "FlexibleValue",
  },
  {
    feature: "local-reference",
    path: ["root", "value", "1"],
    referenceStack: ["FlexibleValue"],
    containingDefinitionName: "FlexibleValue",
    evidence: {
      targetDefinition: "FallbackValue",
    },
  },
];
```

How to read this:

1. the document requires ordinary object support at root
2. `id` reaches a reusable `Count` definition
3. `value` reaches a reusable `FlexibleValue` definition
4. inside that followed definition, the `value` occurrence requires union support
5. the second union member follows another local reference into `FallbackValue`

Notice what is not shown here:

- the followed `Count` definition body is only entered once
- this field is about reachable semantics, not repeated use-site counting

### `lossHotspots`

A simplified `lossHotspots` shape for the same example would look like:

```ts
[
  {
    code: "integer-widening",
    path: ["root", "id"],
    referenceStack: ["Count"],
    containingDefinitionName: "Count",
    evidence: {
      sourceScalar: "integer",
      renderedScalar: "number",
    },
  },
  {
    code: "unknown-union-absorption",
    path: ["root", "value"],
    referenceStack: ["FlexibleValue"],
    containingDefinitionName: "FlexibleValue",
    evidence: {
      unknownMemberIndexes: [1],
      memberKinds: ["literal", "reference"],
    },
  },
  {
    code: "wide-unknown",
    path: ["root", "value", "1"],
    referenceStack: ["FlexibleValue", "FallbackValue"],
    containingDefinitionName: "FallbackValue",
    evidence: {
      reason: "no-evidence",
      nullable: false,
      renderedForm: "unknown",
    },
  },
];
```

How to read this:

1. `id` is a concrete use site where integer semantics widen to `number`
2. `value` is a concrete use site where a union is broadened by an unknown branch
3. the second member of that union is the concrete path where the followed `FallbackValue` branch becomes `unknown`

This is where `per-occurrence` matters.
If the same `FlexibleValue` definition were referenced from multiple fields, the hotspot list would keep those separate use sites visible.

### Putting The Fields Together

The intended reading order for this example is:

1. `semanticCaveats` tells you the target-facing caveats
2. `capabilityRequirements` tells you which reachable shape features were involved
3. `lossHotspots` tells you where the caveat pressure shows up at concrete use sites

That combination is the main value of the new report fields.
Neither field is meant to replace the others.
