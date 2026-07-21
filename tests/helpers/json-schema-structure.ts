import { expect } from "vitest";

const DRAFT_2020_12_URI = "https://json-schema.org/draft/2020-12/schema";

export function expectValidGeneratedJsonSchema(output: unknown): void {
  expect(isPlainObject(output)).toBe(true);

  if (!isPlainObject(output)) {
    throw new Error("Expected generated JSON Schema output to be an object.");
  }

  if ("$schema" in output) {
    expect(output.$schema).toBe(DRAFT_2020_12_URI);
  }

  const serialized = JSON.stringify(output);
  expect(JSON.parse(serialized)).toEqual(output);

  const definitions = collectDefinitions(output);

  validateJsonSchemaNode(output, definitions, []);
}

function collectDefinitions(root: Record<string, unknown>): Set<string> {
  const defs = root.$defs;

  if (defs === undefined) {
    return new Set();
  }

  expect(isPlainObject(defs)).toBe(true);

  if (!isPlainObject(defs)) {
    throw new Error('Expected "$defs" to be an object when present.');
  }

  return new Set(Object.keys(defs));
}

function validateJsonSchemaNode(
  value: unknown,
  definitions: ReadonlySet<string>,
  path: string[],
): void {
  if (Array.isArray(value)) {
    for (const [index, item] of value.entries()) {
      validateJsonSchemaNode(item, definitions, [...path, String(index)]);
    }
    return;
  }

  if (typeof value === "boolean" || value === null) {
    return;
  }

  if (typeof value !== "object") {
    return;
  }

  expect(isPlainObject(value)).toBe(true);

  if (!isPlainObject(value)) {
    throw new Error(
      `Expected JSON Schema node at ${formatPath(path)} to be a plain object.`,
    );
  }

  if ("$ref" in value) {
    expect(typeof value.$ref).toBe("string");

    if (typeof value.$ref !== "string") {
      throw new Error(`Expected "$ref" at ${formatPath(path)} to be a string.`);
    }

    validateLocalRef(value.$ref, definitions, path);
  }

  for (const [key, nestedValue] of Object.entries(value)) {
    if (key === "$ref") {
      continue;
    }

    validateJsonSchemaNode(nestedValue, definitions, [...path, key]);
  }
}

function validateLocalRef(
  ref: string,
  definitions: ReadonlySet<string>,
  path: string[],
): void {
  expect(ref.startsWith("#/$defs/")).toBe(true);

  if (!ref.startsWith("#/$defs/")) {
    throw new Error(
      `Expected "$ref" at ${formatPath(path)} to target a local "$defs" entry.`,
    );
  }

  const definitionName = ref.slice("#/$defs/".length);

  expect(definitionName.length).toBeGreaterThan(0);
  expect(definitions.has(definitionName)).toBe(true);
}

function formatPath(path: string[]): string {
  return path.length === 0 ? "root" : path.join(".");
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }

  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}
