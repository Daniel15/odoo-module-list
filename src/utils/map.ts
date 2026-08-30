/**
 * Group the array items using the specified key function.
 */
export function groupBy<TKey, TValue>(
  array: readonly TValue[],
  keyFn: (item: TValue) => TKey,
): Map<TKey, TValue[]> {
  const result = new Map<TKey, TValue[]>();
  for (const item of array) {
    const key = keyFn(item);
    let itemsForKey = result.get(key);
    if (itemsForKey == null) {
      itemsForKey = [];
      result.set(key, itemsForKey);
    }
    itemsForKey.push(item);
  }

  return result;
}

/**
 * Sort the specified map by its string keys.
 */
export function sortByKey<TValue>(
  map: ReadonlyMap<string, TValue>,
): Map<string, TValue> {
  return new Map(
    [...map.entries()].sort(([keyA], [keyB]) => keyA.localeCompare(keyB)),
  );
}
