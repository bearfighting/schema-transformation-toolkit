# @schema-transformation-toolkit/generator-csharp

Deterministic C# generator for the initial Shape IR adapter boundary.

The PR1 foundation generates object-shaped documents as property-style sealed
records. It supports string, boolean, integer, number, nullable fields,
arrays, named references, and empty objects. Arrays are rendered as `T[]` so
the foundation does not require imports or collection-style configuration.

The generator maps Shape IR integers to `long` and numbers to `double`. It does
not preserve language-specific numeric widths, collection representations,
maps, enums, unions, constraints, namespaces, or class-style output yet.
Those capabilities are planned for later C# adapter work.

Generated files use `#nullable enable`, four-space indentation, LF line endings,
and a trailing newline. Declaration and property order follows the Shape IR.
Invalid or unsupported nodes return structured failures from
`tryGenerateCSharp` rather than being silently discarded.
