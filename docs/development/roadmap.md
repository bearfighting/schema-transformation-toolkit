# Development Roadmap

## Current Direction

The current direction is to strengthen the shared schema IR as a stable handoff for serializable data-shape semantics.

## Near-Term Priorities

1. finish documenting the current core status and remaining work clearly
2. make an explicit stop-or-continue decision on further core-only cleanup
3. move to a TypeScript schema-subset parser to validate the IR against a second source language

## Why These Matter

- a clearer IR contract and internal split reduces drift across `core`, parsers, generators, and future `web` views
- being explicit about the remaining core work helps avoid polishing internals indefinitely
- a TypeScript schema-subset parser validates that the IR is not overly biased toward JSON

## Current Core Status

The current `core` state is materially stronger than the original roadmap assumed:

- reusable definitions and references are implemented
- structured diagnostics are implemented
- unknown semantics and mixed-type collapse semantics are implemented
- parser and generator layers now share more centralized core semantics
- core internals are split into focused modules instead of one large semantic factory file

That means the next roadmap question is no longer "how do we make core viable at all?"
It is now "what remaining core work is still necessary before another parser or product surface becomes the better source of truth?"

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
