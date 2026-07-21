export function expectOk<T extends { ok: boolean }>(
  result: T,
  message: string,
): asserts result is T & { ok: true } {
  if (!result.ok) {
    throw new Error(message);
  }
}
