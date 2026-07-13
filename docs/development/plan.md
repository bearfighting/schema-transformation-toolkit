# Development Plan

## Purpose

This plan turns the current direction into a short-horizon execution guide based on the current state of the repository, not the earlier pre-hardening state.

The intended delivery order still is:

1. finish stabilizing `core`
2. validate the product shape through `web`
3. add `cli` after the core API and interaction model are more stable

But `core` is now in a much later state than when this plan was first drafted: the main semantic gaps around references, diagnostics, unknown handling, and internal modularization have already been addressed.

## Delivery Strategy

### Phase 1: Core First

The `core` package remains the semantic center of the project.

Near-term work in this phase should focus on:

- keeping the current internal split stable and documented
- deciding whether any explicit validation helpers should become part of the public `core` surface
- clarifying any remaining parser-vs-IR questions before a TypeScript parser is added
- avoiding unnecessary additional internal refactors unless they clearly reduce drift or unblock the next consumer
- preserving a clear handoff for `web` and future local tooling

Expected outcome:

- the current schema IR remains centralized and understandable
- future parsers and generators continue sharing one semantic source of truth
- `web` can consume `core` directly without inventing its own schema rules

### Phase 2: Web Playground

The first `web` deliverable should be a focused playground rather than a broad product surface.

Recommended first capabilities:

- JSON input editor
- schema IR viewer
- TypeScript output viewer
- diagnostics and unsupported-case display
- a small set of parser options for current meaningful tradeoffs

The purpose of this phase is not only demo value. It is also the fastest way to validate:

- whether the current IR is understandable
- whether failures are explained clearly enough
- whether the public `core` API is ergonomic for real interactive use

Expected outcome:

- a locally runnable playground
- faster feedback on core semantics and diagnostics quality
- a clearer product direction before adding more surfaces

### Phase 3: CLI Later

The `cli` should be treated as an automation and local integration surface, not the primary product-validation surface.

Recommended responsibilities:

- batch conversion
- validation in local workflows and CI
- scriptable inspection of inferred documents and diagnostics
- a stable local interface for future desktop or other local-first applications

Recommended first commands:

- `convert`
- `parse`
- `generate`
- `validate`

The CLI should expose both human-readable terminal output and machine-readable structured output such as `--json`.

Expected outcome:

- local workflows and CI can reuse the same core behavior
- future local apps have a stable process-level integration option
- command semantics follow already-validated `core` behavior instead of shaping it prematurely

## Near-Term Execution Window

### Step 1: Finish Core Stabilization

Focus:

- complete development docs for the current `core` state
- review whether the current public `core` surface needs one more pass before new consumers arrive
- avoid reopening settled internal refactors unless they unblock the next step

Deliverables:

- a documented current `core` architecture
- an explicit view of the remaining `core` work
- a sharper decision about whether `core` is ready to stop evolving for a moment

### Step 2: Plan The TypeScript Parser

Focus:

- define the exact supported TypeScript schema subset
- decide what belongs in parser logic versus actual IR expansion
- identify the first end-to-end parser slice worth implementing

Deliverables:

- a concrete TypeScript parser scope
- parser success and failure examples
- a work order that does not destabilize the current JSON path

### Step 3: Build The First Web Playground

Focus:

- create a minimal `web` application shell
- wire JSON input, IR rendering, TypeScript output, and diagnostics together
- keep the UI thin and let `core` remain the source of truth

Deliverables:

- a local playground that demonstrates the current supported workflow
- a usable internal tool for reviewing schema behavior
- a first real consumer of the stabilized `core` API

### Step 4: Improve Web Clarity

Focus:

- improve feedback presentation for errors, warnings, and unsupported cases
- refine the IR display so it helps discussion rather than obscuring it
- add sample switching and a small set of useful option toggles

Deliverables:

- a playground that non-authors can use to understand the current system
- clearer feedback loops for both product and IR design decisions
- stronger confidence in the public API ergonomics

### Step 5: Stabilize And Prepare CLI

Focus:

- stabilize any rough edges discovered during `web` integration
- draft the future CLI command surface
- define structured CLI output expectations using already-validated core behavior

Deliverables:

- a CLI design ready for implementation
- a short list of stable API entry points that both `web` and `cli` should depend on
- a cleaner handoff into the next development cycle

## Suggested Milestones

### Milestone 1: Core Stabilized For New Consumers

- the current core internal split is documented
- parser and generator behavior remain aligned
- there is an explicit decision about what `core` still needs before broader expansion

### Milestone 2: Local Web Playground

- the project can run a local interactive workflow
- input, IR, output, and diagnostics are visible in one place
- the UI depends on `core` semantics rather than reimplementing them

### Milestone 3: Stable Surface For CLI

- the public API is clear enough to support both `web` and `cli`
- CLI command design is documented
- structured output expectations are defined before command implementation

## Guardrails

- do not let `web` introduce schema semantics that belong in `core`
- do not let planned `cli` behavior push unstable requirements into `core` too early
- prefer a narrow but well-explained playground over a broad but confusing web product
- keep unsupported cases explicit rather than masking them with weak fallback behavior
- do not keep polishing `core` internals indefinitely once the next real consumer is ready
