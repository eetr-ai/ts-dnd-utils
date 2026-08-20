/**
 * What a drop target learns about the thing being dragged.
 *
 * This is the whole vocabulary of the library: a payload, where it came from,
 * and which group it belongs to.
 */
export interface DropInformation<T = unknown> {
  /** Caller-defined payload. The library never inspects it. */
  data?: T | undefined;
  /**
   * Where the dragged item sat in its own list, or `undefined` when the drag
   * started somewhere with no ordering — a palette of new items, typically.
   * That absence is how a drop target tells "insert a new one here" apart from
   * "move the existing one here".
   */
  index?: number | undefined;
  /**
   * Targets accept a drag only when they declare the same group, which is what
   * keeps two lists on one page from swallowing each other's items.
   */
  dragGroup: string;
  /**
   * Which list the drag started from. `useSortableList` sets this for you and
   * uses it to tell one of its own items apart from an item of some other list
   * that happens to share the group — whose `index` means nothing here.
   */
  sourceId?: string | undefined;
}

/** Called by a drop target once a compatible item is released over it. */
export type DropCallback<T = unknown> = (info: DropInformation<T>) => void;

/**
 * The parts of a drag event this library touches.
 *
 * Structural rather than tied to React's synthetic event, so the same functions
 * work with a native `DragEvent`, with React's wrapper, and with a plain object
 * in a test.
 */
export interface DragEventLike {
  dataTransfer: DataTransfer | null;
  preventDefault(): void;
  stopPropagation(): void;
}

/**
 * The parts of a `dragleave` event needed to tell a real departure from the
 * pointer merely moving onto a descendant.
 */
export interface DragLeaveEventLike {
  currentTarget: Node;
  relatedTarget: EventTarget | null;
}
