import { useEffect, useState } from "react";
import type { DragEvent, ReactNode } from "react";

import { useDragActions, useDragDropInfo } from "./context.js";
import { DragHandleIcon } from "./drag-handle.js";
import {
  dragOver as engineDragOver,
  drop as engineDrop,
  isRealDragLeave,
  startDrag,
} from "./engine.js";
import type { DropCallback, DropInformation } from "./types.js";

export interface DragDropPanelProps<T = unknown> {
  /** What this panel represents when it is the one being dragged. */
  dropInformation: DropInformation<T>;
  /** Called when a compatible item is dropped on this panel. */
  onDrop: DropCallback<T>;
  /**
   * Called while a compatible item hovers this panel, with *this* panel's
   * information — which is what lets a list know where to draw its insertion
   * indicator. Fires repeatedly for as long as the pointer stays over.
   */
  onDragOverItem?: DropCallback<T> | undefined;
  children?: ReactNode;
  className?: string | undefined;
  /** Replaces the default grip glyph. */
  handle?: ReactNode | undefined;
  /** Set to `false` to drop the handle entirely. Defaults to `true`. */
  showHandle?: boolean | undefined;
  handleClassName?: string | undefined;
  /** Accessible name for the handle. Defaults to "Drag to reorder". */
  handleLabel?: string | undefined;
  /**
   * Makes the whole panel draggable instead of only the handle.
   *
   * The handle exists so that text and inputs inside a row stay usable — a
   * fully draggable row swallows text selection. Turn this on where there is
   * nothing to select, or where the handle is too small a target.
   */
  wholeElementDraggable?: boolean | undefined;
  /** Stops this panel dragging or accepting drops. */
  disabled?: boolean | undefined;
}

/**
 * A row that is both a drag source and a drop target — the building block of a
 * sortable list.
 *
 * Dragging is armed by pressing the handle and disarmed as soon as the drag
 * ends, so the row is only `draggable` for the moment it needs to be. That is
 * what keeps an `<input>` inside the row selectable: a permanently draggable
 * ancestor makes the browser drag the row instead of selecting the text.
 */
export function DragDropPanel<T = unknown>({
  dropInformation,
  onDrop,
  onDragOverItem,
  children,
  className,
  handle,
  showHandle = true,
  handleClassName,
  handleLabel = "Drag to reorder",
  wholeElementDraggable = false,
  disabled = false,
}: DragDropPanelProps<T>): ReactNode {
  const [armed, setArmed] = useState(false);
  const [draggingOver, setDraggingOver] = useState(false);
  const { dragAllowed, active } = useDragDropInfo();
  const { beginDrag, endDrag } = useDragActions();

  // Disarming has to happen on the window, not on the handle. A press that ends
  // anywhere else -- released off the button, or ended without ever starting a
  // drag -- never delivers mouseup to the handle, and the row would stay
  // draggable indefinitely, swallowing text selection from then on.
  useEffect(() => {
    if (!armed) return undefined;
    const disarm = (): void => setArmed(false);
    window.addEventListener("mouseup", disarm);
    window.addEventListener("dragend", disarm);
    return () => {
      window.removeEventListener("mouseup", disarm);
      window.removeEventListener("dragend", disarm);
    };
  }, [armed]);

  const dragGroup = dropInformation.dragGroup;
  const canDrag = !disabled && dragAllowed && (armed || wholeElementDraggable);
  const isDragSource =
    active !== null && active.dragGroup === dragGroup && active.index === dropInformation.index;

  function handleDragStart(event: DragEvent<HTMLDivElement>): void {
    if (!canDrag) {
      event.preventDefault();
      return;
    }
    startDrag(event, dropInformation);
    beginDrag(dropInformation);
  }

  function handleDragOver(event: DragEvent<HTMLDivElement>): void {
    if (disabled) return;
    engineDragOver(event, dragGroup, active, () => {
      setDraggingOver(true);
      onDragOverItem?.(dropInformation);
    });
  }

  function handleDragLeave(event: DragEvent<HTMLDivElement>): void {
    // Only when the pointer really left. Crossing onto the handle or the
    // content wrapper fires dragleave on this element too, and clearing there
    // makes the highlight strobe for as long as the pointer stays inside.
    if (isRealDragLeave(event)) setDraggingOver(false);
  }

  function handleDragEnd(): void {
    setArmed(false);
    setDraggingOver(false);
    // Runs whether the drag was dropped or abandoned, so an Escape mid-drag
    // cannot leave a stale group behind for the next drag to match against.
    endDrag();
  }

  function handleDrop(event: DragEvent<HTMLDivElement>): void {
    if (disabled) return;
    const accepted = engineDrop<T>(event, dragGroup, (info) => {
      setDraggingOver(false);
      onDrop(info);
    });
    // The source's `dragend` normally clears this, but the source may have been
    // unmounted by the reorder this drop just caused.
    if (accepted) endDrag();
  }

  return (
    <div
      data-dnd-panel=""
      data-dnd-dragging-over={draggingOver ? "" : undefined}
      data-dnd-dragging={isDragSource ? "" : undefined}
      data-dnd-disabled={disabled ? "" : undefined}
      className={className}
      draggable={canDrag}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragOver={handleDragOver}
      onDragEnter={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {showHandle && (
        <button
          type="button"
          data-dnd-handle=""
          className={handleClassName}
          aria-label={handleLabel}
          disabled={disabled}
          onMouseDown={() => setArmed(true)}
        >
          {handle ?? <DragHandleIcon />}
        </button>
      )}
      <div data-dnd-panel-content="">{children}</div>
    </div>
  );
}
