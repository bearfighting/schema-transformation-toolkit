# Development Roadmap

## Current Direction

The current direction is to strengthen the shared schema IR as a stable handoff for serializable data-shape semantics.

## Near-Term Priorities

1. finish documenting the current core status and remaining work clearly
2. make an explicit stop-or-continue decision on further core-only cleanup
3. expand the current TypeScript schema-subset parser deliberately without turning it into a full TypeScript front-end

## Why These Matter

- a clearer IR contract and internal split reduces drift across `core`, parsers, generators, and future `web` views
- being explicit about the remaining core work helps avoid polishing internals indefinitely
- the existing TypeScript schema-subset parser already validates that the IR is not overly biased toward JSON, and now needs controlled expansion

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

The current TypeScript parser should remain focused on a schema-oriented subset of TypeScript:

- object types
- arrays
- tuples
- unions
- `null`
- optional properties
- `Record<string, T>`
- enum-like literal unions

It should not aim to support the whole TypeScript type system.

Near-term parser work should keep three artifacts aligned:

- the supported success subset
- the explicit failure matrix
- the package and development docs that describe both

Recommended next parser work, in order:

1. improve parser-facing diagnostics with source spans or line-column evidence while keeping the current logical `path` model
2. decide whether `enum` and readonly modifiers belong in the current IR boundary or should remain explicit failures
3. only then expand the supported syntax surface with small data-shape-preserving additions
