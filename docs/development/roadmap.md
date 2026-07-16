# Development Roadmap

## Current Direction

The current direction is to strengthen the shared schema IR as a stable handoff for serializable data-shape semantics.

## Near-Term Priorities

1. finish documenting the current core status and remaining work clearly
2. make an explicit stop-or-continue decision on further core-only cleanup
3. expand the current TypeScript schema-subset parser deliberately without turning it into a full TypeScript front-end
4. expand parser and generator coverage further before making the next shared-IR expansion decision

## Why These Matter

- a clearer IR contract and internal split reduces drift across `core`, parsers, generators, and future `web` views
- being explicit about the remaining core work helps avoid polishing internals indefinitely
- the existing TypeScript schema-subset parser already validates that the IR is not overly biased toward JSON, and now needs controlled expansion
- delaying the next IR expansion until more parser and generator surfaces exist reduces the risk of overfitting shared semantics to one format, especially JSON Schema

## Current Core Status

The current `core` state is materially stronger than the original roadmap assumed:

- reusable definitions and references are implemented
- structured diagnostics are implemented
- unknown semantics and mixed-type collapse semantics are implemented
- parser and generator layers now share more centralized core semantics
- core internals are split into focused modules instead of one large semantic factory file

That means the next roadmap question is no longer "how do we make core viable at all?"
It is now "what remaining core work is still necessary before another parser or product surface becomes the better source of truth?"

## IR Evolution Direction

The next IR changes should not be driven by one format alone.

The current working rule is:

- first expand parsers and generators enough to gather repeated evidence across multiple schema surfaces
- then separate true shared-IR gaps from format-local concerns
- only promote a new concept into `core` when it looks like reusable serialized-shape semantics rather than one ecosystem's validation detail

The current JSON Schema discussion is a good example of why this matters:

- some gaps may be genuinely shared, such as object open-vs-closed semantics or an eventual impossible-schema concept
- some gaps are much more likely to remain JSON Schema-local, such as draft differences, URI-based `$ref` resolution, anchors, and many evaluation-specific keywords
- some areas are still gray and should wait for more implementation evidence, such as whether refinement-style constraints belong in the shared IR at all

Near-term work should therefore prefer:

1. broadening parser and generator support
2. documenting semantic-loss boundaries explicitly
3. revisiting IR expansion only after those new surfaces produce clearer repeated pressure

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
