import type { IdentifierName } from "./types.js";

export type NamingStyle = "camel" | "pascal" | "snake";
export type ReservedWordHandling = "suffix" | "prefix" | "quoted" | "raw";

export interface RenderIdentifierOptions {
  style: NamingStyle;
  fallback?: "source" | "quoted";
  emptyFallback?: string;
  invalidPrefix?: string;
  reservedWords?: string[];
  reservedWordHandling?: ReservedWordHandling;
  reservedWordSuffix?: string;
  reservedWordPrefix?: string;
  rawIdentifierPrefix?: string;
}

export interface NamingStrategy {
  renderTypeName(name: IdentifierName): string;
  renderFieldName(name: IdentifierName): string;
}

export interface NamingStrategyOptions {
  typeName: RenderIdentifierOptions;
  fieldName: RenderIdentifierOptions;
}

export function renderIdentifierName(
  name: IdentifierName,
  options: RenderIdentifierOptions
): string {
  const words = getRenderableWords(name);

  if (words.length === 0) {
    return renderIdentifierFallback(name, options);
  }

  let renderedIdentifier: string;

  switch (options.style) {
    case "camel":
      renderedIdentifier = toCamelCase(words);
      break;
    case "pascal":
      renderedIdentifier = toPascalCase(words);
      break;
    case "snake":
      renderedIdentifier = toSnakeCase(words);
      break;
  }

  return normalizeIdentifier(renderedIdentifier, options);
}

export function getRenderableWords(name: IdentifierName): string[] {
  return name.words.filter((word) => /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(word));
}

export function toCamelCase(words: string[]): string {
  const [firstWord, ...restWords] = words;

  if (firstWord === undefined) {
    return "";
  }

  return `${firstWord}${restWords.map(capitalizeWord).join("")}`;
}

export function toPascalCase(words: string[]): string {
  return words.map(capitalizeWord).join("");
}

export function toSnakeCase(words: string[]): string {
  return words.join("_");
}

export function capitalizeWord(word: string): string {
  return word.charAt(0).toUpperCase() + word.slice(1);
}

export function createNamingStrategy(options: NamingStrategyOptions): NamingStrategy {
  return {
    renderTypeName(name) {
      return renderIdentifierName(name, options.typeName);
    },
    renderFieldName(name) {
      return renderIdentifierName(name, options.fieldName);
    }
  };
}

export function normalizeIdentifier(
  identifier: string,
  options: Pick<
    RenderIdentifierOptions,
    | "invalidPrefix"
    | "reservedWords"
    | "reservedWordHandling"
    | "reservedWordSuffix"
    | "reservedWordPrefix"
    | "rawIdentifierPrefix"
  >
): string {
  let normalizedIdentifier = identifier;

  if (!/^[A-Za-z_$]/.test(normalizedIdentifier)) {
    normalizedIdentifier = `${options.invalidPrefix ?? "_"}${normalizedIdentifier}`;
  }

  if (options.reservedWords?.includes(normalizedIdentifier)) {
    normalizedIdentifier = normalizeReservedWord(normalizedIdentifier, options);
  }

  return normalizedIdentifier;
}

function normalizeReservedWord(
  identifier: string,
  options: Pick<
    RenderIdentifierOptions,
    "reservedWordHandling" | "reservedWordSuffix" | "reservedWordPrefix" | "rawIdentifierPrefix"
  >
): string {
  switch (options.reservedWordHandling) {
    case "prefix":
      return `${options.reservedWordPrefix ?? "_"}${identifier}`;
    case "quoted":
      return JSON.stringify(identifier);
    case "raw":
      return `${options.rawIdentifierPrefix ?? "r#"}${identifier}`;
    case "suffix":
    default:
      return `${identifier}${options.reservedWordSuffix ?? "_"}`;
  }
}

function renderIdentifierFallback(
  name: IdentifierName,
  options: RenderIdentifierOptions
): string {
  if (options.fallback === "quoted") {
    return JSON.stringify(name.source);
  }

  return options.emptyFallback ?? name.source;
}
