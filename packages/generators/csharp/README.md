# @schema-transformation-toolkit/generator-csharp

Deterministic C# generator for the Shape IR adapter boundary.

The generator generates object-shaped documents as property-style sealed records
by default and can optionally generate sealed classes. It supports string,
boolean, integer, number, nullable fields, arrays, string-keyed maps, named
references, string literal union enums, and empty objects. Arrays are rendered
as `IReadOnlyList<T>` and maps as `IReadOnlyDictionary<string, T>`.

Set `namespace` to emit a file-scoped namespace and `style` to `"class"` for
class output. Numeric representation hints are mapped to safe C# primitive
types where possible; wider integer representations use `BigInteger`, and
any unavoidable widening or loss is returned as a semantic note.

Generated files use `#nullable enable`, four-space indentation, LF line endings,
and a trailing newline. Imports, declarations, properties, and enum members are
deterministically ordered according to the Shape IR.
Invalid or unsupported nodes return structured failures from
`tryGenerateCSharp` rather than being silently discarded.

The generator is available through the SDK builtin registry for generic
Shape-compatible conversions. Namespace and style are target options, not
Shape IR properties. Enum member normalization, numeric widening, and other
target-specific caveats are reported as semantic notes; serializer attributes
and wire-name metadata are not invented.
