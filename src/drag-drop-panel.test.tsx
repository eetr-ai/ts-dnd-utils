import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { dragEventInit, dragLeaveEvent, FakeDataTransfer } from "../test/data-transfer.js";
import { DragDropProvider } from "./context.js";
import { DragDropPanel } from "./drag-drop-panel.js";
import { DND_MIME_TYPE } from "./engine.js";
import type { DropCallback, DropInformation } from "./types.js";

function panel(index: number, dragGroup = "sections"): DropInformation {
  return { dragGroup, index };
}

function renderPanel(props: Partial<Parameters<typeof DragDropPanel>[0]> = {}) {
  const onDrop = vi.fn<DropCallback>();
  const view = render(
    <DragDropProvider>
      <DragDropPanel dropInformation={panel(0)} onDrop={onDrop} {...props}>
        <span>Starters</span>
      </DragDropPanel>
    </DragDropProvider>,
  );
  const root = view.container.querySelector("[data-dnd-panel]") as HTMLElement;
  return { ...view, root, onDrop };
}

/** Arms the handle and starts a drag, returning the transfer carrying it. */
function beginDrag(root: HTMLElement, handle: HTMLElement | null = null): FakeDataTransfer {
  const transfer = new FakeDataTransfer();
  if (handle) fireEvent.mouseDown(handle);
  fireEvent.dragStart(root, dragEventInit(transfer, "readwrite"));
  return transfer;
}

describe("rendering", () => {
  it("renders its children", () => {
    renderPanel();
    expect(screen.getByText("Starters")).toBeInTheDocument();
  });

  it("gives the handle an accessible name", () => {
    renderPanel();
    expect(screen.getByRole("button", { name: "Drag to reorder" })).toBeInTheDocument();
  });

  it("lets the handle be renamed", () => {
    renderPanel({ handleLabel: "Reorder this section" });
    expect(screen.getByRole("button", { name: "Reorder this section" })).toBeInTheDocument();
  });

  it("can omit the handle entirely", () => {
    renderPanel({ showHandle: false });
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("accepts a replacement glyph", () => {
    renderPanel({ handle: <span data-testid="custom">::</span> });
    expect(screen.getByTestId("custom")).toBeInTheDocument();
  });
});

describe("arming the handle", () => {
  it("is not draggable until the handle is pressed", () => {
    // A permanently draggable row makes the browser drag it instead of
    // selecting text inside it.
    const { root } = renderPanel();
    expect(root).toHaveAttribute("draggable", "false");
  });

  it("becomes draggable while the handle is held", () => {
    const { root } = renderPanel();
    fireEvent.mouseDown(screen.getByRole("button"));
    expect(root).toHaveAttribute("draggable", "true");
  });

  it("disarms when the press ends anywhere on the page", () => {
    // Regression: disarming used to be bound to the handle's own mouseup, so
    // releasing off the button left the row draggable indefinitely.
    const { root } = renderPanel();
    fireEvent.mouseDown(screen.getByRole("button"));
    expect(root).toHaveAttribute("draggable", "true");

    fireEvent.mouseUp(window);

    expect(root).toHaveAttribute("draggable", "false");
  });

  it("disarms when the drag ends", () => {
    const { root } = renderPanel();
    fireEvent.mouseDown(screen.getByRole("button"));
    fireEvent.dragEnd(root);
    expect(root).toHaveAttribute("draggable", "false");
  });

  it("is draggable without the handle when asked", () => {
    const { root } = renderPanel({ wholeElementDraggable: true });
    expect(root).toHaveAttribute("draggable", "true");
  });

  it("stays put when disabled, even with the handle held", () => {
    const { root } = renderPanel({ disabled: true, wholeElementDraggable: true });
    expect(root).toHaveAttribute("draggable", "false");
  });
});

describe("starting a drag", () => {
  it("writes its own information into the event", () => {
    const { root } = renderPanel();
    const transfer = beginDrag(root, screen.getByRole("button"));

    expect(JSON.parse(transfer.peek(DND_MIME_TYPE) ?? "null")).toEqual(panel(0));
  });

  it("writes nothing when the panel is not armed", () => {
    const { root } = renderPanel();
    const transfer = beginDrag(root);
    expect(transfer.peek(DND_MIME_TYPE)).toBeUndefined();
  });

  it("writes nothing while drags are disallowed", () => {
    const onDrop = vi.fn<DropCallback>();
    const view = render(
      <DragDropProvider initialDragAllowed={false}>
        <DragDropPanel dropInformation={panel(0)} onDrop={onDrop}>
          <span>Starters</span>
        </DragDropPanel>
      </DragDropProvider>,
    );
    const root = view.container.querySelector("[data-dnd-panel]") as HTMLElement;

    const transfer = beginDrag(root, screen.getByRole("button"));

    expect(transfer.peek(DND_MIME_TYPE)).toBeUndefined();
  });
});

describe("hovering", () => {
  function twoPanels(secondGroup = "sections") {
    const onDrop = vi.fn<DropCallback>();
    const view = render(
      <DragDropProvider>
        <DragDropPanel dropInformation={panel(0)} onDrop={onDrop}>
          <span>first</span>
        </DragDropPanel>
        <DragDropPanel dropInformation={panel(1, secondGroup)} onDrop={onDrop}>
          <span>second</span>
        </DragDropPanel>
      </DragDropProvider>,
    );
    const [source, target] = [
      ...view.container.querySelectorAll("[data-dnd-panel]"),
    ] as HTMLElement[];
    const handles = screen.getAllByRole("button");
    return { source: source!, target: target!, handle: handles[0]!, onDrop };
  }

  it("marks a compatible target while a drag is over it", () => {
    const { source, target, handle } = twoPanels();
    const transfer = beginDrag(source, handle);

    fireEvent.dragOver(target, dragEventInit(transfer, "protected"));

    expect(target).toHaveAttribute("data-dnd-dragging-over");
  });

  it("decides that from context, not from the event", () => {
    // During dragover the payload is unreadable; this passes only because the
    // group is remembered in the provider.
    const { source, target, handle } = twoPanels();
    const transfer = beginDrag(source, handle);
    transfer.mode = "protected";

    expect(transfer.getData(DND_MIME_TYPE)).toBe("");
    fireEvent.dragOver(target, dragEventInit(transfer, "protected"));

    expect(target).toHaveAttribute("data-dnd-dragging-over");
  });

  it("ignores a drag belonging to another group", () => {
    const { source, target, handle } = twoPanels("events");
    const transfer = beginDrag(source, handle);

    fireEvent.dragOver(target, dragEventInit(transfer, "protected"));

    expect(target).not.toHaveAttribute("data-dnd-dragging-over");
  });

  it("keeps the mark when the pointer moves onto something inside the row", () => {
    // The flicker bug. dragleave fires on the row as the pointer crosses onto
    // its handle or its content, even though it never left -- and clearing
    // there makes the highlight strobe, because the next dragover sets it
    // straight back and dragover repeats for as long as the pointer is over.
    const { source, target, handle } = twoPanels();
    const transfer = beginDrag(source, handle);
    fireEvent.dragOver(target, dragEventInit(transfer, "protected"));
    expect(target).toHaveAttribute("data-dnd-dragging-over");

    const inside = target.querySelector("[data-dnd-panel-content]") as HTMLElement;
    fireEvent(target, dragLeaveEvent(inside));

    expect(target).toHaveAttribute("data-dnd-dragging-over");
  });

  it("clears the mark when the drag leaves", () => {
    const { source, target, handle } = twoPanels();
    const transfer = beginDrag(source, handle);

    fireEvent.dragOver(target, dragEventInit(transfer, "protected"));
    fireEvent(target, dragLeaveEvent(document.body));

    expect(target).not.toHaveAttribute("data-dnd-dragging-over");
  });

  it("reports its own position to onDragOverItem", () => {
    const onDragOverItem = vi.fn<DropCallback>();
    const onDrop = vi.fn<DropCallback>();
    const view = render(
      <DragDropProvider>
        <DragDropPanel dropInformation={panel(0)} onDrop={onDrop}>
          <span>first</span>
        </DragDropPanel>
        <DragDropPanel dropInformation={panel(3)} onDrop={onDrop} onDragOverItem={onDragOverItem}>
          <span>second</span>
        </DragDropPanel>
      </DragDropProvider>,
    );
    const [source, target] = [
      ...view.container.querySelectorAll("[data-dnd-panel]"),
    ] as HTMLElement[];
    const transfer = beginDrag(source!, screen.getAllByRole("button")[0]!);

    fireEvent.dragOver(target!, dragEventInit(transfer, "protected"));

    expect(onDragOverItem).toHaveBeenCalledWith(panel(3));
  });
});

describe("dropping", () => {
  it("delivers the payload", () => {
    const { root, onDrop } = renderPanel();
    const transfer = beginDrag(root, screen.getByRole("button"));

    fireEvent.drop(root, dragEventInit(transfer, "readonly"));

    expect(onDrop).toHaveBeenCalledWith(panel(0));
  });

  it("does not also land on an enclosing target", () => {
    // The original omitted stopPropagation, so every list needed a
    // compensating handler to undo the second delivery.
    const onOuterDrop = vi.fn<() => void>();
    const onDrop = vi.fn<DropCallback>();
    const view = render(
      <DragDropProvider>
        <div onDrop={onOuterDrop}>
          <DragDropPanel dropInformation={panel(0)} onDrop={onDrop}>
            <span>Starters</span>
          </DragDropPanel>
        </div>
      </DragDropProvider>,
    );
    const root = view.container.querySelector("[data-dnd-panel]") as HTMLElement;
    const transfer = beginDrag(root, screen.getByRole("button"));

    fireEvent.drop(root, dragEventInit(transfer, "readonly"));

    expect(onDrop).toHaveBeenCalledOnce();
    expect(onOuterDrop).not.toHaveBeenCalled();
  });

  it("does not mark itself while disabled", () => {
    const { root } = renderPanel({ disabled: true });
    const transfer = new FakeDataTransfer();
    transfer.setData(DND_MIME_TYPE, JSON.stringify(panel(1)));

    fireEvent.dragOver(root, dragEventInit(transfer, "protected"));

    expect(root).not.toHaveAttribute("data-dnd-dragging-over");
  });

  it("leaves the drag in flight when it refuses the drop", () => {
    // Only an accepted drop ends the drag. A panel refusing one must not clear
    // a drag that some other target is still expecting to receive.
    const { root, onDrop } = renderPanel();
    const transfer = new FakeDataTransfer();
    fireEvent.mouseDown(screen.getByRole("button"));
    fireEvent.dragStart(root, dragEventInit(transfer, "readwrite"));

    transfer.mode = "readwrite";
    transfer.clearData();
    transfer.setData(DND_MIME_TYPE, JSON.stringify({ dragGroup: "events", index: 0 }));
    fireEvent.drop(root, dragEventInit(transfer, "readonly"));

    expect(onDrop).not.toHaveBeenCalled();
    // Still active, so a compatible target continues to light up.
    fireEvent.dragOver(root, dragEventInit(transfer, "protected"));
    expect(root).toHaveAttribute("data-dnd-dragging-over");
  });

  it("ignores a drop when disabled", () => {
    const { root, onDrop } = renderPanel({ disabled: true });
    const transfer = new FakeDataTransfer();
    transfer.setData(DND_MIME_TYPE, JSON.stringify(panel(1)));

    fireEvent.drop(root, dragEventInit(transfer, "readonly"));

    expect(onDrop).not.toHaveBeenCalled();
  });

  it("clears the active drag, even if the source has since unmounted", () => {
    // A reorder can unmount the row that started the drag, so its dragend may
    // never arrive.
    const { root } = renderPanel();
    const transfer = beginDrag(root, screen.getByRole("button"));
    fireEvent.drop(root, dragEventInit(transfer, "readonly"));

    // With the drag cleared, a fresh dragover must no longer be accepted.
    fireEvent.dragOver(root, dragEventInit(transfer, "protected"));
    expect(root).not.toHaveAttribute("data-dnd-dragging-over");
  });
});
