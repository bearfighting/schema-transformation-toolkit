import { describe, expect, it } from "vitest";
import {
  createNamingStrategy,
  identifierName,
  normalizeIdentifier,
  renderIdentifierName,
  toCamelCase,
  toPascalCase,
  toSnakeCase
} from "../packages/core/src/index.js";

describe("core naming", () => {
  it("renders camel, pascal, and snake case from normalized words", () => {
    const name = identifierName({
      source: "user-profile",
      words: ["user", "profile"]
    });

    expect(renderIdentifierName(name, { style: "camel" })).toBe("userProfile");
    expect(renderIdentifierName(name, { style: "pascal" })).toBe("UserProfile");
    expect(renderIdentifierName(name, { style: "snake" })).toBe("user_profile");
  });

  it("supports raw word conversion helpers", () => {
    expect(toCamelCase(["user", "profile"])).toBe("userProfile");
    expect(toPascalCase(["user", "profile"])).toBe("UserProfile");
    expect(toSnakeCase(["user", "profile"])).toBe("user_profile");
  });

  it("builds reusable naming strategies for generators", () => {
    const strategy = createNamingStrategy({
      typeName: {
        style: "pascal",
        emptyFallback: "GeneratedType"
      },
      fieldName: {
        style: "snake",
        fallback: "quoted"
      }
    });

    const typeName = identifierName("user-profile");
    const fieldName = identifierName("userProfile");

    expect(strategy.renderTypeName(typeName)).toBe("UserProfile");
    expect(strategy.renderFieldName(fieldName)).toBe("user_profile");
  });

  it("supports fallback strategies when words are not renderable", () => {
    const name = identifierName({
      source: "123",
      words: ["123"]
    });

    expect(
      renderIdentifierName(name, {
        style: "camel",
        fallback: "quoted"
      })
    ).toBe('"123"');

    expect(
      renderIdentifierName(name, {
        style: "pascal",
        emptyFallback: "GeneratedType"
      })
    ).toBe("GeneratedType");
  });

  it("normalizes identifiers for numeric prefixes and reserved words", () => {
    expect(
      renderIdentifierName(identifierName({ source: "123-name", words: ["123", "name"] }), {
        style: "camel",
        invalidPrefix: "_"
      })
    ).toBe("name");

    expect(normalizeIdentifier("123Name", { invalidPrefix: "_" })).toBe("_123Name");
    expect(
      normalizeIdentifier("type", {
        reservedWords: ["type"],
        reservedWordHandling: "suffix",
        reservedWordSuffix: "_"
      })
    ).toBe("type_");
  });

  it("supports multiple reserved-word handling strategies", () => {
    expect(
      normalizeIdentifier("type", {
        reservedWords: ["type"],
        reservedWordHandling: "prefix",
        reservedWordPrefix: "_"
      })
    ).toBe("_type");

    expect(
      normalizeIdentifier("type", {
        reservedWords: ["type"],
        reservedWordHandling: "quoted"
      })
    ).toBe('"type"');

    expect(
      normalizeIdentifier("type", {
        reservedWords: ["type"],
        reservedWordHandling: "raw",
        rawIdentifierPrefix: "r#"
      })
    ).toBe("r#type");
  });
});
