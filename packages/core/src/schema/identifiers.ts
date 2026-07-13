import type { IdentifierName } from "./types.js";

export type IdentifierInput = string | IdentifierName;

export function identifierName(name: IdentifierInput): IdentifierName {
  if (typeof name !== "string") {
    return {
      source: name.source,
      words: normalizeWords(name.words, name.source),
    };
  }

  return {
    source: name,
    words: splitIdentifierWords(name),
  };
}

export function splitIdentifierWords(value: string): string[] {
  return value
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/([A-Z]+)([A-Z][a-z])/g, "$1 $2")
    .split(/[^A-Za-z0-9]+/)
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => part.toLowerCase());
}

export function normalizeWords(words: string[], fallbackSource: string): string[] {
  const normalizedWords = words
    .map((word) => word.trim().toLowerCase())
    .filter(Boolean);

  if (normalizedWords.length > 0) {
    return normalizedWords;
  }

  return splitIdentifierWords(fallbackSource);
}
