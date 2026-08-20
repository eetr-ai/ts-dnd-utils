import type { DragEvent, ReactNode } from "react";

export interface DropIndicatorProps {
  className?: string | undefined;
}

/**
 * The line a list draws between two items to show where a drop would land.
 *
 * Purely decorative, so it is hidden from assistive technology. It does accept
 * `dragover` all the same: it appears under the pointer mid-drag, and an
 * element that refuses the drop there makes the cursor flicker between
 * "allowed" and "denied" as the pointer crosses it.
 */
export function DropIndicator({ className }: DropIndicatorProps): ReactNode {
  return (
    <div
      data-dnd-indicator=""
      role="presentation"
      aria-hidden="true"
      className={className}
      onDragOver={(event: DragEvent<HTMLDivElement>) => event.preventDefault()}
    />
  );
}
