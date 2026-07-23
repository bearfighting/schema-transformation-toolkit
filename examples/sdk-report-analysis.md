# SDK Report Analysis Example

This example shows how to read the higher-level `report` returned by `@aio/sdk`.

It focuses on the fields that are most useful after a successful conversion:

- `semanticCaveats`
- `losses`
- `capabilityRequirements`
- `lossHotspots`

Use this example when you want to understand:

- what the target-facing caveats were
- what reachable shape features the target needed to support
- where widening-sensitive use sites appeared after reference expansion

For the deeper interpretation model behind these fields, see [../docs/development/sdk-report-analysis.md](../docs/development/sdk-report-analysis.md).

If you want a runnable version of this example after building the workspace, use:

```bash
pnpm build
node examples/sdk-report-analysis.mjs
```

The script prints two sections:

- `# Output` for the generated TypeScript
- `# Report` for the most relevant higher-level report fields

## Example

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

### Generated TypeScript

```ts
export type Count = number;

export type FallbackValue = unknown;

export type FlexibleValue = "open" | FallbackValue;

export interface ExampleDocument {
  id: Count;
  value: FlexibleValue;
}
```

### Representative Script Output

When you run the script, the output should look roughly like:

```txt
# Output
export type Count = number;

export type FallbackValue = unknown;

export type FlexibleValue = "open" | FallbackValue;

export interface ExampleDocument {
  id: Count;
  value: FlexibleValue;
}

# Report
{
  "semanticCaveats": [
    {
      "code": "integer-widened-to-number",
      "path": ["definitions", "Count"]
    },
    {
      "code": "wide-unknown-type",
      "path": ["definitions", "FallbackValue"]
    },
    {
      "code": "unknown-union-member-absorbs-union",
      "path": ["definitions", "FlexibleValue"]
    }
  ],
  "losses": [],
  "capabilityRequirements": [
    {
      "feature": "object",
      "path": ["root"],
      "referenceStack": []
    },
    {
      "feature": "local-reference",
      "path": ["root", "id"],
      "referenceStack": []
    },
    {
      "feature": "local-reference",
      "path": ["root", "value"],
      "referenceStack": []
    },
    {
      "feature": "union",
      "path": ["root", "value"],
      "referenceStack": ["FlexibleValue"]
    },
    {
      "feature": "local-reference",
      "path": ["root", "value", "1"],
      "referenceStack": ["FlexibleValue"]
    }
  ],
  "lossHotspots": [
    {
      "code": "integer-widening",
      "path": ["root", "id"],
      "referenceStack": ["Count"]
    },
    {
      "code": "unknown-union-absorption",
      "path": ["root", "value"],
      "referenceStack": ["FlexibleValue"]
    },
    {
      "code": "wide-unknown",
      "path": ["root", "value", "1"],
      "referenceStack": ["FlexibleValue", "FallbackValue"]
    }
  ]
}
```

This snippet is intentionally abbreviated:

- it shows the stable high-signal fields to compare first
- it omits longer `message`, `source`, and `evidence` payloads for readability
- it is best used as a quick sanity check, not as the full contract definition

### Report Reading Order

For a successful conversion, the most useful reading order is:

1. `semanticCaveats`
2. `losses`
3. `capabilityRequirements`
4. `lossHotspots`

That order goes from user-facing consequence to structural explanation.

## 1. Semantic Caveats

A simplified view of the most important caveats is:

```ts
[
  {
    code: "integer-widened-to-number",
    path: ["definitions", "Count"],
  },
  {
    code: "wide-unknown-type",
    path: ["definitions", "FallbackValue"],
  },
  {
    code: "unknown-union-member-absorbs-union",
    path: ["definitions", "FlexibleValue"],
  },
];
```

This tells you the user-facing result:

- `Count` becomes TypeScript `number`
- `FallbackValue` becomes TypeScript `unknown`
- `FlexibleValue` contains an `unknown` branch that broadens the union

## 2. Losses

In this particular example, `losses` is empty.

That matters because it shows the difference between:

- target-facing semantic caveats
- declared route-level unsupported capability preservation

The route still widened semantics, but it did not produce a separate route-level capability-loss entry here.

## 3. Capability Requirements

A simplified view of the reachable feature inventory is:

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

This tells you the reachable semantics that the target had to support:

- the root is an object
- `id` reaches a reusable definition
- `value` reaches another reusable definition
- inside that followed definition, `value` requires union support
- the second union member follows one more local reference

This field uses deduped follow behavior.
It answers "what semantics are present?" more than "how many times did we see them?"

## 4. Loss Hotspots

A simplified use-site-sensitive hotspot view is:

```ts
[
  {
    code: "integer-widening",
    path: ["root", "id"],
    referenceStack: ["Count"],
  },
  {
    code: "unknown-union-absorption",
    path: ["root", "value"],
    referenceStack: ["FlexibleValue"],
  },
  {
    code: "wide-unknown",
    path: ["root", "value", "1"],
    referenceStack: ["FlexibleValue", "FallbackValue"],
  },
];
```

This tells you where widening pressure actually shows up at use sites:

- `id` is where integer semantics widen
- `value` is where the union broadens
- `value[1]` is where the followed fallback branch becomes `unknown`

This field keeps occurrence-sensitive follow behavior on purpose.
If `FlexibleValue` were referenced from multiple fields, each use site would remain visible here.

## Putting It Together

The intended final interpretation is:

1. the route succeeded
2. the output is still truthful
3. some semantics widened and are visible in `semanticCaveats`
4. the reachable feature set is visible in `capabilityRequirements`
5. the concrete use-site pressure is visible in `lossHotspots`

That combination is the main reason the report now keeps all three layers instead of collapsing everything into one summary field.
