import { describe, expect, it } from "vitest";
import { tryParseGo } from "./api.js";

describe("Go parser", () => {
  it("maps structs, tags, containers, references, and recursion", () => {
    const result = tryParseGo(
      [
        "package models",
        "type UserID int64",
        "type User struct {",
        '  ID UserID `json:"id"`',
        '  Email *string `json:"email,omitempty"`',
        "  Tags []string",
        "  Metadata map[string]string",
        "  Next *User",
        "}",
      ].join("\n"),
      { entry: "User" },
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.artifacts).toBeUndefined();
    expect(result.document.rootName?.source).toBe("User");
    const root = result.document.definitions.find(
      (definition) => definition.name.source === "User",
    )?.type;
    expect(root?.kind).toBe("object");
    if (!root || root.kind !== "object") return;
    expect(
      root.fields.map((field) => [
        field.name.source,
        field.required,
        field.nullable,
      ]),
    ).toEqual([
      ["id", true, false],
      ["email", false, true],
      ["Tags", true, false],
      ["Metadata", true, false],
      ["Next", true, true],
    ]);
  });

  it("preserves numeric representation hints for supported Go scalars", () => {
    const result = tryParseGo("type User struct { ID int64; Ratio float64 }", {
      entry: "User",
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.document.root).toMatchObject({
      kind: "object",
      fields: [
        {
          type: {
            scalar: "integer",
            representation: {
              family: "integer",
              signedness: "signed",
              widthBits: 64,
            },
          },
        },
        {
          type: {
            scalar: "number",
            representation: { family: "float", widthBits: 64 },
          },
        },
      ],
    });
  });

  it("reports unsupported map keys and ambiguous roots", () => {
    expectGoFailure(
      tryParseGo("type User struct { Values map[int]string }"),
      "unsupported-go-map-key",
      true,
    );
    expectGoFailure(
      tryParseGo(
        "type NamedKey string\ntype User struct { Values map[NamedKey]string }",
        { entry: "User" },
      ),
      "unsupported-go-map-key",
      true,
    );
    expectGoFailure(
      tryParseGo("type A struct{}\ntype B struct{}"),
      "ambiguous-go-entry",
      false,
    );
  });

  it("distinguishes empty interfaces from method interfaces", () => {
    expect(
      tryParseGo("type Value interface{}", { entry: "Value" }),
    ).toMatchObject({ ok: true });
    expect(
      tryParseGo("type Value interface { String() string }", {
        entry: "Value",
      }),
    ).toMatchObject({ ok: false, code: "unsupported-go-feature" });
  });

  it("maps nested pointers without flattening them", () => {
    const result = tryParseGo(
      "type User struct { Friends []*User; Items map[string]*User }",
      { entry: "User" },
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const definition = result.document.definitions.find(
      (item) => item.name.source === "User",
    );
    expect(definition?.type.kind).toBe("object");
    if (!definition || definition.type.kind !== "object") return;
    expect(definition.type.fields.map((field) => field.type)).toMatchObject([
      { kind: "array", elementType: { kind: "union" } },
      { kind: "record", value: { kind: "union" } },
    ]);
  });

  it("preserves shorthand omitempty and rejects aliases explicitly", () => {
    const result = tryParseGo(
      'type User struct { Name string `json:",omitempty"` }',
      { entry: "User" },
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      const root = result.document.root;
      expect(root).toMatchObject({
        kind: "object",
        fields: [{ name: { source: "Name" }, required: false }],
      });
    }
    expect(tryParseGo("type ID = int64", { entry: "ID" })).toMatchObject({
      ok: false,
      code: "unsupported-go-feature",
    });
  });

  it.each([
    [
      "malformed syntax",
      "type User struct { Name string",
      "invalid-go-syntax",
      false,
    ],
    [
      "generic type",
      "type User[T any] struct { Value T }",
      "invalid-go-syntax",
      true,
    ],
    [
      "embedded field",
      "type User struct { Profile }",
      "unsupported-go-feature",
      true,
    ],
    [
      "unknown reference",
      "type User struct { Value Missing }",
      "unknown-go-reference",
      true,
    ],
  ] as const)(
    "reports %s with stable diagnostic metadata",
    (_label, input, code, hasPosition) => {
      expectGoFailure(tryParseGo(input, { entry: "User" }), code, hasPosition);
    },
  );

  it("rejects duplicate definitions and missing entries structurally", () => {
    expectGoFailure(
      tryParseGo("type User struct{}\ntype User struct{}", { entry: "User" }),
      "duplicate-go-definition",
      true,
    );
    expectGoFailure(
      tryParseGo("type User struct{}", { entry: "Missing" }),
      "missing-go-entry",
      false,
    );
  });
});

function expectGoFailure(
  result: ReturnType<typeof tryParseGo>,
  code: string,
  hasPosition: boolean,
): void {
  expect(result).toMatchObject({ ok: false, code });
  if (result.ok) return;
  const diagnostic = result.diagnostics?.[0];
  expect(diagnostic).toMatchObject({ source: "parser-go", code });
  const evidence = diagnostic?.evidence;
  if (!hasPosition) {
    expect(evidence).toBeUndefined();
    return;
  }
  expect(evidence).toEqual(
    expect.objectContaining({
      position: expect.objectContaining({
        offset: expect.any(Number),
        line: expect.any(Number),
        column: expect.any(Number),
      }),
    }),
  );
}
