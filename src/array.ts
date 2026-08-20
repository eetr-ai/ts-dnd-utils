/**
 * Immutable array helpers for the reordering a drag ends in.
 *
 * Deliberately free of React and of everything else in this package, so they
 * can be used from a reducer that runs on the server. Published as the
 * `/array` subpath.
 */

/**
 * Moves the item at `from` so that it ends up at `to`.
 *
 * Out-of-range indices are not an error — the array comes back copied but
 * otherwise untouched. A drop can race a list that changed underneath it, and
 * throwing there would turn a harmless no-op into a crash.
 */
export function moveItem<T>(items: readonly T[], from: number, to: number): T[] {
  const result = items.slice();

  if (!Number.isInteger(from) || !Number.isInteger(to)) return result;
  if (from < 0 || from >= result.length) return result;
  if (from === to) return result;

  const removed = result.splice(from, 1);
  // Clamped rather than rejected: dropping past the end means "put it last",
  // which is what the user just gestured at.
  const target = Math.max(0, Math.min(to, result.length));
  result.splice(target, 0, ...removed);
  return result;
}

/** Inserts `item` at `index`, clamping into range. */
export function insertAt<T>(items: readonly T[], index: number, item: T): T[] {
  const result = items.slice();
  const target = Number.isInteger(index)
    ? Math.max(0, Math.min(index, result.length))
    : result.length;
  result.splice(target, 0, item);
  return result;
}

/** Removes the item at `index`. Out-of-range indices copy without removing. */
export function removeAt<T>(items: readonly T[], index: number): T[] {
  const result = items.slice();
  if (!Number.isInteger(index) || index < 0 || index >= result.length) return result;
  result.splice(index, 1);
  return result;
}
