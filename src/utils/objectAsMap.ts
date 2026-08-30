export function sortByKey<TValue>(
  input: Record<string, TValue>,
): Record<string, TValue> {
  return Object.fromEntries(
    Object.entries(input).sort(([keyA], [keyB]) => keyA.localeCompare(keyB)),
  );
}
