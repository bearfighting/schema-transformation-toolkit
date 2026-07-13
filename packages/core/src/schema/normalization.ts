import { areEquivalentSchemaNodes } from "./equivalence.js";
import type {
  SchemaNode,
  SchemaTupleElement,
  SchemaUnknownEvidence,
} from "./types.js";

export function normalizeUnionMembers(members: SchemaNode[]): SchemaNode[] {
  const flattenedMembers = members.flatMap((member) =>
    member.kind === "union" ? normalizeUnionMembers(member.members) : [member],
  );
  const dedupedMembers: SchemaNode[] = [];

  for (const member of flattenedMembers) {
    const existingMember = dedupedMembers.find((candidate) =>
      areEquivalentSchemaNodes(candidate, member),
    );

    if (existingMember !== undefined) {
      continue;
    }

    dedupedMembers.push(member);
  }

  return dedupedMembers;
}

export function normalizeTupleElement(
  element: SchemaNode | SchemaTupleElement,
): SchemaTupleElement {
  if ("type" in element && "required" in element) {
    return {
      required: element.required,
      type: element.type,
    };
  }

  return {
    required: true,
    type: element,
  };
}

export function normalizeUnknownEvidence(
  evidence: SchemaUnknownEvidence | undefined,
): SchemaUnknownEvidence | undefined {
  if (evidence === undefined) {
    return undefined;
  }

  const normalizedDetail = evidence.detail?.trim();
  const normalizedObservedKinds = evidence.observedKinds
    ?.map((kind) => kind.trim())
    .filter((kind) => kind.length > 0)
    .sort((left, right) => left.localeCompare(right))
    .filter((kind, index, values) => index === 0 || kind !== values[index - 1]);

  const normalizedEvidence: SchemaUnknownEvidence = {
    ...(evidence.source ? { source: evidence.source } : {}),
    ...(normalizedDetail ? { detail: normalizedDetail } : {}),
    ...(normalizedObservedKinds && normalizedObservedKinds.length > 0
      ? { observedKinds: normalizedObservedKinds }
      : {}),
  };

  return Object.keys(normalizedEvidence).length > 0 ? normalizedEvidence : undefined;
}
