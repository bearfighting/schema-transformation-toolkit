# @schema-transformation-toolkit/parser-csharp

Independent C# Shape IR parser for a focused data-model subset. It supports
positional and property-style records, property-based classes, symbolic enums,
primitive numeric representations, nullable types, arrays, common list/map
generics, namespaces, ordinary using declarations, named references,
recursion, and deterministic root selection.

Classes are limited to public automatic `get; init;` and `get; set;` properties.
Enums are limited to plain members; explicit underlying types, member values,
attributes, inheritance, generic declarations, methods, fields, and other
full-language constructs are intentionally unsupported. Unsupported syntax
returns a structured failure with a source position.

Use `tryParseCSharp` for structured failures and `parseCSharp` as the throwing
convenience API. The package is staged and is not part of the SDK builtin
registry until the C# parser integration work is complete.
