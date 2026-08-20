import { useState } from "react";
import type { DragEvent, ReactNode } from "react";

import { useDragActions, useDragDropInfo } from "./context.js";
import { dragOver as engineDragOver, drop as engineDrop, isRealDragLeave } from "./engine.js";
import type { DropCallback } from "./types.js";

export interface DroppablePanelProps<T = unknown> {
  /** Only drags in this group are accepted. */
  dragGroup: string;
  onDrop: DropCallback<T>;
  children?: ReactNode;
  className?: string | undefined;
  /**
   * Takes control of the hover state.
   *
   * Leave it out and the panel tracks its own. Pass a boolean and that value
   * wins, for a list that already knows where the pointer is.
   */
  draggingOver?: boolean | undefined;
  disabled?: boolean | undefined;
}

/**
 * A plain drop target with no drag behaviour of its own — the empty-state
 * placeholder a list shows when it has nothing to sort yet.
 *
 * Note the hover state is read through one unconditional `useState` and then
 * overridden, rather than by choosing between a prop and a hook. The version
 * this replaces did the latter, which changes the number of hooks a component
 * calls the moment the prop appears or disappears, and React throws.
 */
export function DroppablePanel<T = unknown>({
  dragGroup,
  onDrop,
  children,
  className,
  draggingOver,
  disabled = false,
}: DroppablePanelProps<T>): ReactNode {
  const [internalDraggingOver, setInternalDraggingOver] = useState(false);
  const { active } = useDragDropInfo();
  const { endDrag } = useDragActions();

  const isControlled = draggingOver !== undefined;
  const showDraggingOver = isControlled ? draggingOver : internalDraggingOver;

  function setDraggingOver(value: boolean): void {
    if (!isControlled) setInternalDraggingOver(value);
  }

  function handleDragOver(event: DragEvent<HTMLDivElement>): void {
    if (disabled) return;
    engineDragOver(event, dragGroup, active, () => setDraggingOver(true));
  }

  function handleDragLeave(event: DragEvent<HTMLDivElement>): void {
    // See DragDropPanel: dragleave also fires when the pointer moves onto a
    // descendant, and clearing on those makes the highlight strobe.
    if (isRealDragLeave(event)) setDraggingOver(false);
  }

  function handleDrop(event: DragEvent<HTMLDivElement>): void {
    if (disabled) return;
    const accepted = engineDrop<T>(event, dragGroup, (info) => {
      setDraggingOver(false);
      onDrop(info);
    });
    if (accepted) endDrag();
  }

  return (
    <div
      data-dnd-droppable=""
      data-dnd-dragging-over={showDraggingOver ? "" : undefined}
      data-dnd-disabled={disabled ? "" : undefined}
      className={className}
      onDragOver={handleDragOver}
      onDragEnter={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {children}
    </div>
  );
}
