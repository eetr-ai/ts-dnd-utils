import { useId, useMemo, useState } from "react";

import type { DropCallback, DropInformation } from "./types.js";

export interface SortableListOptions<T = unknown> {
  /** The group this list's items belong to. */
  dragGroup: string;
  /** An item already in this list was dropped at a new position. */
  onReorder(from: number, to: number): void;
  /**
   * An item carrying no index was dropped at `at` — meaning it came from
   * somewhere unordered, a palette, and a new entry should be created.
   *
   * Leave it out and such drops are ignored.
   */
  onInsert?: ((at: number, data: T | undefined) => void) | undefined;
  /**
   * An item from a *different* list sharing this group was dropped at `at`.
   *
   * Leave it out and such drops are ignored, which is the safe default: the
   * incoming `index` refers to a list that is not this one, so treating it as a
   * reorder would move the wrong row.
   */
  onDropFromOtherList?: ((at: number, info: DropInformation<T>) => void) | undefined;
}

/** Props to spread onto a `<DragDropPanel>` standing for one list item. */
export interface SortableItemProps<T = unknown> {
  dropInformation: DropInformation<T>;
  onDrop: DropCallback<T>;
  onDragOverItem: DropCallback<T>;
}

/** Props to spread onto the element wrapping the list. */
export interface SortableContainerProps {
  onDragEnd(): void;
  onDragLeave(): void;
  onDrop(): void;
}

export interface SortableList<T = unknown> {
  /**
   * Index the pointer is currently over, or `-1`. Render the insertion
   * indicator before the item whose index this matches.
   */
  dragOverIndex: number;
  containerProps: SortableContainerProps;
  getItemProps(index: number, data?: T): SortableItemProps<T>;
}

/**
 * Tracks where a drag is hovering within a list, and turns a drop into either
 * a reorder or an insert.
 *
 * This exists because the bookkeeping is identical every time and was copied by
 * hand into every list in both codebases this came from: the same
 * `dragOverIndex` state, the same three handlers resetting it, and the same
 * "no index means it came from the palette" branch.
 */
export function useSortableList<T = unknown>({
  dragGroup,
  onReorder,
  onInsert,
  onDropFromOtherList,
}: SortableListOptions<T>): SortableList<T> {
  const [dragOverIndex, setDragOverIndex] = useState(-1);
  // Identifies this list so a drop can be told apart from one belonging to
  // another list on the same group.
  const sourceId = useId();

  const containerProps = useMemo<SortableContainerProps>(() => {
    const clear = (): void => setDragOverIndex(-1);
    // All three, because a drag can leave a list in three different ways:
    // dropped on it, dropped elsewhere, or abandoned. Miss one and the
    // indicator stays on screen after the drag is over.
    return { onDragEnd: clear, onDragLeave: clear, onDrop: clear };
  }, []);

  function getItemProps(index: number, data?: T): SortableItemProps<T> {
    return {
      dropInformation: { dragGroup, index, data, sourceId },
      // The hovered index is the one from this closure. Reading it back off the
      // callback argument would work today only because the panel echoes the
      // information it was handed.
      onDragOverItem: () => setDragOverIndex(index),
      onDrop: (info) => {
        setDragOverIndex(-1);
        if (info.index === undefined) {
          // No position means it came from somewhere unordered -- a palette.
          onInsert?.(index, info.data);
        } else if (info.sourceId !== sourceId) {
          // Indexed, but the index counts positions in a different list.
          onDropFromOtherList?.(index, info);
        } else if (info.index !== index) {
          onReorder(info.index, index);
        }
      },
    };
  }

  return { dragOverIndex, containerProps, getItemProps };
}
