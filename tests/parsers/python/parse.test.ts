import { describe, expect, it } from "vitest";
import { tryParsePython } from "@schema-transformation-toolkit/parser-python";

describe("Python dataclass parser", () => {
  it("parses primitives, arrays, nullable fields, and references", () => {
    const result = tryParsePython(
      `
from dataclasses import dataclass

@dataclass
class Address:
    city: str

@dataclass
class User:
    id: int
    score: float | None
    active: bool
    tags: list[str]
    address: Address
`,
      { entry: "User" },
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.document.root.kind).toBe("object");
    if (result.document.root.kind !== "object") return;
    expect(
      result.document.root.fields.map((field) => [
        field.name.source,
        field.required,
        field.nullable,
      ]),
    ).toEqual([
      ["id", true, false],
      ["score", true, true],
      ["active", true, false],
      ["tags", true, false],
      ["address", true, false],
    ]);
    expect(result.document.root.fields[4]?.type).toEqual({
      kind: "reference",
      name: "Address",
    });
    expect(
      result.document.definitions.map((definition) => definition.name.source),
    ).toEqual(["Address"]);
  });

  it("normalizes Optional and pipe nullable syntax", () => {
    const optional = tryParsePython(
      "@dataclass\nclass User:\n    name: Optional[str]\n",
    );
    const pipe = tryParsePython(
      "@dataclass\nclass User:\n    name: str | None\n",
    );
    expect(optional.ok).toBe(true);
    expect(pipe.ok).toBe(true);
    if (!optional.ok || !pipe.ok) return;
    expect(optional.document).toEqual(pipe.document);
  });

  it("parses string-keyed maps and preserves nested nullable values", () => {
    const result = tryParsePython(
      `@dataclass
class User:
    metadata: dict[str, list[str | None]]
`,
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.document.root).toMatchObject({
      kind: "object",
      fields: [
        {
          type: {
            kind: "record",
            key: { kind: "scalar", scalar: "string" },
            value: {
              kind: "array",
              elementType: { kind: "union" },
            },
          },
        },
      ],
    });
  });

  it("rejects non-string and unsupported dict forms", () => {
    expect(
      tryParsePython("@dataclass\nclass User:\n    values: dict[int, str]\n"),
    ).toMatchObject({ ok: false, code: "unsupported-python-type" });
    expect(
      tryParsePython("@dataclass\nclass User:\n    values: Dict[str, str]\n"),
    ).toMatchObject({ ok: false, code: "unsupported-python-type" });
  });

  it("parses restricted map aliases as roots and definitions", () => {
    const root = tryParsePython("Metadata = dict[str, int]");
    expect(root.ok).toBe(true);
    if (!root.ok) return;
    expect(root.document.root.kind).toBe("record");

    const nested = tryParsePython(
      "Metadata = dict[str, int]\n\n@dataclass\nclass User:\n    metadata: Metadata\n",
      { entry: "User" },
    );
    expect(nested.ok).toBe(true);
    if (!nested.ok) return;
    expect(nested.document.definitions).toHaveLength(1);
    expect(nested.document.definitions[0]?.type.kind).toBe("record");
  });

  it("rejects alias and dataclass name collisions in either order", () => {
    for (const source of [
      "Metadata = dict[str, int]\n@dataclass\nclass Metadata:\n    id: int\n",
      "@dataclass\nclass Metadata:\n    id: int\nMetadata = dict[str, int]\n",
    ]) {
      expect(tryParsePython(source)).toMatchObject({
        ok: false,
        code: "duplicate-python-definition",
      });
    }
  });

  it("accepts quoted forward references inside map aliases", () => {
    const result = tryParsePython(
      'Metadata = dict[str, "User | None"]\n@dataclass\nclass User:\n    id: int\n',
      { entry: "User" },
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(
      result.document.definitions.find(
        (definition) => definition.name.source === "Metadata",
      )?.type,
    ).toMatchObject({
      kind: "record",
      value: { kind: "union" },
    });
  });

  it("requires an entry for multiple dataclasses", () => {
    const result = tryParsePython(
      "@dataclass\nclass A:\n    value: str\n\n@dataclass\nclass B:\n    value: str\n",
    );
    expect(result).toMatchObject({ ok: false, code: "ambiguous-python-entry" });
  });

  it("rejects unsupported types and defaults", () => {
    expect(
      tryParsePython("@dataclass\nclass User:\n    value: int | str\n"),
    ).toMatchObject({ ok: false, code: "unsupported-python-union" });
    expect(
      tryParsePython("@dataclass\nclass User:\n    value: str = 'x'\n"),
    ).toMatchObject({ ok: false, code: "unsupported-python-default" });
  });

  it("rejects ignored top-level syntax and invalid indentation", () => {
    expect(
      tryParsePython("value = 1\n@dataclass\nclass User:\n    id: int\n"),
    ).toMatchObject({ ok: false, code: "unsupported-python-feature" });
    expect(tryParsePython("@dataclass\nclass User:\nid: int\n")).toMatchObject({
      ok: false,
      code: "invalid-python-syntax",
    });
  });

  it("uses the duplicate-definition failure code and rejects keywords", () => {
    expect(
      tryParsePython(
        "@dataclass\nclass User:\n    id: int\n\n@dataclass\nclass User:\n    name: str\n",
      ),
    ).toMatchObject({ ok: false, code: "duplicate-python-definition" });
    expect(
      tryParsePython("@dataclass\nclass User:\n    class: str\n"),
    ).toMatchObject({ ok: false, code: "invalid-python-syntax" });
  });

  it("rejects imports between a dataclass decorator and its class", () => {
    expect(
      tryParsePython("@dataclass\nimport os\nclass User:\n    id: int\n"),
    ).toMatchObject({ ok: false, code: "invalid-python-syntax" });
  });
});
