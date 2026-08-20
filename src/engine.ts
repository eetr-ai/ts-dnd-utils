import type { DragEventLike, DragLeaveEventLike, DropCallback, DropInformation } from "./types.js";

/**
 * The payload rides as JSON under this type.
 *
 * `application/json` rather than a private type so that a drag leaving this
 * page is at least legible to whatever receives it.
 */
export const DND_MIME_TYPE = "application/json";

/**
 * Writes the drag payload into the event.
 *
 * `clearData()` first because Firefox will not overwrite an existing entry for
 * the same type, and `effectAllowed` because without it some browsers refuse
 * the drop outright. Both of the hand-written versions this came from left one
 * or the other to the call site, and both got it wrong somewhere.
 */
export function startDrag<T>(event: DragEventLike, info: DropInformation<T>): void {
  const transfer = event.dataTransfer;
  if (!transfer) return;

  transfer.clearData();
  transfer.setData(DND_MIME_TYPE, JSON.stringify(info));
  transfer.effectAllowed = "move";
}

/**
 * Reads the payload back out of a drop event.
 *
 * Returns `null` rather than throwing when there is nothing to read or the
 * contents are not ours — a drop can carry a file, a selection, or anything
 * another page put there, and none of that should crash a drop handler.
 *
 * **Only call this during `drop`.** Through the whole `dragover` phase the
 * specification puts `dataTransfer` in protected mode, where `getData` returns
 * an empty string no matter what was set. See `acceptsDrag` for that phase.
 */
export function readDropInformation<T>(event: DragEventLike): DropInformation<T> | null {
  const raw = event.dataTransfer?.getData(DND_MIME_TYPE);
  if (!raw) return null;

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }

  if (typeof parsed !== "object" || parsed === null) return null;
  const candidate = parsed as Partial<DropInformation<T>>;
  if (typeof candidate.dragGroup !== "string") return null;

  return candidate as DropInformation<T>;
}

/**
 * Whether a `dragleave` means the pointer actually left the element.
 *
 * It usually does not. `dragenter` and `dragleave` are not "entered the box"
 * and "left the box" — they fire whenever the *event target* changes, and they
 * bubble. Moving the pointer from a row onto a `<span>` inside that row fires
 * `dragleave` on the row, with `relatedTarget` set to the span, even though the
 * pointer is still well inside it.
 *
 * Treating that as a departure is what makes a hover highlight strobe: the
 * spurious leave clears it, the next `dragover` sets it back, and `dragover`
 * repeats for as long as the pointer is over the element.
 *
 * A null `relatedTarget` — the pointer leaving the window, mostly — counts as a
 * real departure. Erring that way is safe: `dragover` fires continuously, so a
 * highlight cleared in error comes back within a frame, whereas one left set in
 * error stays on screen after the drag is gone.
 */
export function isRealDragLeave(event: DragLeaveEventLike): boolean {
  const next = event.relatedTarget;
  return !(next instanceof Node && event.currentTarget.contains(next));
}

/**
 * Whether a target in `dragGroup` should accept the drag currently in flight.
 *
 * `active` comes from the provider rather than from the event, and that is the
 * whole reason the provider exists: during `dragover` the payload is
 * unreadable, so the group has to be remembered somewhere else. The version
 * this replaces kept it in a module-level variable, which made it one shared
 * value for every drag surface in the process.
 */
export function acceptsDrag(active: DropInformation | null, dragGroup: string): boolean {
  return active !== null && active.dragGroup === dragGroup;
}

/**
 * Handles `dragover` for a target in `dragGroup`.
 *
 * Calling `preventDefault` is what marks the element as a valid drop target;
 * without it the browser shows a "no entry" cursor and never fires `drop`.
 *
 * Returns whether the drag was accepted.
 */
export function dragOver(
  event: DragEventLike,
  dragGroup: string,
  active: DropInformation | null,
  onAccepted?: () => void,
): boolean {
  if (!acceptsDrag(active, dragGroup)) return false;

  event.preventDefault();
  onAccepted?.();
  return true;
}

/**
 * Handles `drop` for a target in `dragGroup`, invoking `onDrop` with the
 * payload when the groups match.
 *
 * `stopPropagation` matters: drop targets nest, and without it a drop on an
 * item also lands on the list around it. The version this came from omitted it,
 * which is why every list in that codebase carried a compensating handler to
 * undo the second delivery.
 *
 * Returns whether the drop was accepted.
 */
export function drop<T>(event: DragEventLike, dragGroup: string, onDrop: DropCallback<T>): boolean {
  const info = readDropInformation<T>(event);
  if (!info || info.dragGroup !== dragGroup) return false;

  event.preventDefault();
  event.stopPropagation();
  onDrop(info);
  return true;
}
