import type { ReactNode } from "react";

/**
 * The default grab handle: a six-dot grip, the conventional "drag me" glyph.
 *
 * Inline rather than imported so the package keeps no runtime dependencies —
 * the two codebases this came from each pulled in a whole icon library for
 * exactly this one shape. It inherits `currentColor` and sizes with `em`, so it
 * takes on whatever the surrounding text already says.
 */
export function DragHandleIcon(): ReactNode {
  return (
    <svg
      viewBox="0 0 16 16"
      width="1em"
      height="1em"
      fill="currentColor"
      aria-hidden="true"
      focusable="false"
      data-dnd-handle-icon=""
    >
      <circle cx="6" cy="3" r="1.4" />
      <circle cx="10" cy="3" r="1.4" />
      <circle cx="6" cy="8" r="1.4" />
      <circle cx="10" cy="8" r="1.4" />
      <circle cx="6" cy="13" r="1.4" />
      <circle cx="10" cy="13" r="1.4" />
    </svg>
  );
}
