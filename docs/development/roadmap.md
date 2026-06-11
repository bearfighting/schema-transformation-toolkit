# Development Roadmap

## Current Direction

The current direction is to strengthen the shared schema IR as a stable handoff for serializable data-shape semantics.

## Near-Term Priorities

1. document-level references or reusable definitions
2. richer `SchemaUnknownNode` evidence
3. discriminated-union-friendly normalization guarantees
4. a TypeScript schema-subset parser to validate the IR against a second source language

## Why These Matter

- references reduce repeated inline structures and improve generated output
- richer unknown evidence improves diagnostics and future parser behavior
- discriminated union support is important for real-world APIs
- a TypeScript schema-subset parser validates that the IR is not overly biased toward JSON

## TypeScript Parser Direction

If we add a TypeScript parser, it should target a schema-oriented subset of TypeScript:

- object types
- arrays
- tuples
- unions
- `null`
- optional properties
- `Record<string, T>`
- enum-like literal unions

It should not aim to support the whole TypeScript type system.
