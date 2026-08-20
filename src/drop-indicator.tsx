import type { CSSProperties, ReactNode } from "react";

export interface DropIndicatorProps {
  className?: string | undefined;
  /** Merged over the defaults below, so either can be overridden. */
  style?: CSSProperties | undefined;
}

/**
 * The line a list draws between two items to show where a drop would land.
 *
 * Two defaults here are correctness rather than taste, and both exist to stop
 * the indicator interfering with the drag that summoned it.
 *
 * `height: 0` keeps it out of the layout. An indicator that occupies space
 * pushes the row below it down at the moment it appears — and it appears
 * because the pointer is near that row's edge. The row slides out from under
 * the pointer, the hovered index changes, the indicator moves, the row slides
 * back, and the whole thing oscillates for as long as the pointer sits in a
 * band of pixels as tall as the indicator. Draw the line with `box-shadow` or
 * an `outline`, which paint outside the box without reserving any of it.
 *
 * `pointer-events: none` keeps it from becoming a drop target. It materialises
 * directly under the pointer, so without this it takes over as the event target
 * and produces a `dragleave` on the row it was meant to annotate.
 *
 * Both can be overridden through `style` if you really mean to.
 */
export function DropIndicator({ className, style }: DropIndicatorProps): ReactNode {
  return (
    <div
      data-dnd-indicator=""
      role="presentation"
      aria-hidden="true"
      className={className}
      style={{ height: 0, pointerEvents: "none", ...style }}
    />
  );
}
