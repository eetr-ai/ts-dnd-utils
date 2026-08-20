import type { DragEvent, MouseEvent, ReactNode } from "react";

import { useDragActions, useDragDropInfo } from "./context.js";
import { DragHandleIcon } from "./drag-handle.js";
import { startDrag } from "./engine.js";
import type { DropInformation } from "./types.js";

export interface DraggableButtonProps<T = unknown> {
  /**
   * What dragging this button puts in flight.
   *
   * Leaving `index` out is the signal a palette sends: the drop target sees no
   * position, reads that as "this did not come from the list", and inserts a
   * new item instead of moving an existing one.
   */
  dropInformation: DropInformation<T>;
  children?: ReactNode;
  /** Clicking is the keyboard-reachable equivalent of dragging it in. */
  onClick?: ((event: MouseEvent<HTMLButtonElement>) => void) | undefined;
  className?: string | undefined;
  handle?: ReactNode | undefined;
  showHandle?: boolean | undefined;
  disabled?: boolean | undefined;
}

/**
 * A palette entry: a real `<button>` that can also be dragged into a list.
 *
 * Being a button is the point. Dragging is mouse-only, so the click path is
 * what keyboard users get, and it should do the same thing the drag does.
 */
export function DraggableButton<T = unknown>({
  dropInformation,
  children,
  onClick,
  className,
  handle,
  showHandle = true,
  disabled = false,
}: DraggableButtonProps<T>): ReactNode {
  const { dragAllowed } = useDragDropInfo();
  const { beginDrag, endDrag } = useDragActions();

  const canDrag = !disabled && dragAllowed;

  function handleDragStart(event: DragEvent<HTMLButtonElement>): void {
    if (!canDrag) {
      event.preventDefault();
      return;
    }
    startDrag(event, dropInformation);
    beginDrag(dropInformation);
  }

  return (
    <button
      type="button"
      data-dnd-palette-item=""
      data-dnd-disabled={disabled ? "" : undefined}
      className={className}
      draggable={canDrag}
      disabled={disabled}
      onDragStart={handleDragStart}
      onDragEnd={endDrag}
      onClick={onClick}
    >
      {showHandle && (handle ?? <DragHandleIcon />)}
      {children}
    </button>
  );
}
