import { fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";

import { dragEventInit, FakeDataTransfer } from "../test/data-transfer.js";
import { DragDropProvider } from "./context.js";
import { DragDropPanel } from "./drag-drop-panel.js";
import { DroppablePanel } from "./droppable-panel.js";
import { DND_MIME_TYPE } from "./engine.js";
import type { DropCallback, DropInformation } from "./types.js";

const palette: DropInformation = { dragGroup: "sections" };

/** Flips the panel between controlled and uncontrolled while it stays mounted. */
function ControlToggleHarness() {
  const [controlled, setControlled] = useState<boolean | undefined>(undefined);
  return (
    <DragDropProvider>
      <button
        type="button"
        onClick={() => setControlled((c) => (c === undefined ? true : undefined))}
      >
        toggle
      </button>
      <DroppablePanel dragGroup="sections" onDrop={vi.fn<DropCallback>()} draggingOver={controlled}>
        empty
      </DroppablePanel>
    </DragDropProvider>
  );
}

/** A palette source plus an empty-state target, sharing one session. */
function renderEmptyState(props: Partial<Parameters<typeof DroppablePanel>[0]> = {}) {
  const onDrop = vi.fn<DropCallback>();
  const view = render(
    <DragDropProvider>
      <DragDropPanel
        dropInformation={{ dragGroup: "sections", index: 0 }}
        onDrop={vi.fn<DropCallback>()}
      >
        <span>existing</span>
      </DragDropPanel>
      <DroppablePanel dragGroup="sections" onDrop={onDrop} {...props}>
        Drag something here
      </DroppablePanel>
    </DragDropProvider>,
  );
  const source = view.container.querySelector("[data-dnd-panel]") as HTMLElement;
  const target = view.container.querySelector("[data-dnd-droppable]") as HTMLElement;
  return { ...view, source, target, onDrop };
}

function beginDrag(source: HTMLElement, info: DropInformation): FakeDataTransfer {
  const transfer = new FakeDataTransfer();
  fireEvent.mouseDown(screen.getAllByRole("button")[0]!);
  fireEvent.dragStart(source, dragEventInit(transfer, "readwrite"));
  // Overwrite with the information under test, since the panel writes its own.
  transfer.mode = "readwrite";
  transfer.clearData();
  transfer.setData(DND_MIME_TYPE, JSON.stringify(info));
  return transfer;
}

describe("rendering", () => {
  it("renders its children", () => {
    renderEmptyState();
    expect(screen.getByText("Drag something here")).toBeInTheDocument();
  });
});

describe("hover state, uncontrolled", () => {
  it("marks itself while a compatible drag is over", () => {
    const { source, target } = renderEmptyState();
    const transfer = beginDrag(source, palette);

    fireEvent.dragOver(target, dragEventInit(transfer, "protected"));

    expect(target).toHaveAttribute("data-dnd-dragging-over");
  });

  it("unmarks itself when the drag leaves", () => {
    const { source, target } = renderEmptyState();
    const transfer = beginDrag(source, palette);

    fireEvent.dragOver(target, dragEventInit(transfer, "protected"));
    fireEvent.dragLeave(target);

    expect(target).not.toHaveAttribute("data-dnd-dragging-over");
  });

  it("ignores a drag from another group", () => {
    const { source, target } = renderEmptyState({ dragGroup: "events" });
    const transfer = beginDrag(source, palette);

    fireEvent.dragOver(target, dragEventInit(transfer, "protected"));

    expect(target).not.toHaveAttribute("data-dnd-dragging-over");
  });
});

describe("hover state, controlled", () => {
  it("takes the value from the prop", () => {
    const { target } = renderEmptyState({ draggingOver: true });
    expect(target).toHaveAttribute("data-dnd-dragging-over");
  });

  it("lets the prop override what a hover would otherwise say", () => {
    const { source, target } = renderEmptyState({ draggingOver: false });
    const transfer = beginDrag(source, palette);

    fireEvent.dragOver(target, dragEventInit(transfer, "protected"));

    expect(target).not.toHaveAttribute("data-dnd-dragging-over");
  });

  it("survives switching between controlled and uncontrolled while mounted", () => {
    // The direct regression. The original chose between a prop and useState
    // with a ternary, so the hook count changed the moment the prop appeared or
    // disappeared, and React throws on the next render.
    const quiet = vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      const view = render(<ControlToggleHarness />);
      const toggle = screen.getByRole("button", { name: "toggle" });
      const target = () => view.container.querySelector("[data-dnd-droppable]") as HTMLElement;

      expect(target()).not.toHaveAttribute("data-dnd-dragging-over");

      fireEvent.click(toggle); // undefined -> true
      expect(target()).toHaveAttribute("data-dnd-dragging-over");

      fireEvent.click(toggle); // true -> undefined
      expect(target()).not.toHaveAttribute("data-dnd-dragging-over");

      // React reports a changed hook order by logging an error before throwing.
      expect(quiet).not.toHaveBeenCalled();
    } finally {
      quiet.mockRestore();
    }
  });
});

describe("dropping", () => {
  it("delivers a palette payload, index and all", () => {
    const { source, target, onDrop } = renderEmptyState();
    const transfer = beginDrag(source, palette);

    fireEvent.drop(target, dragEventInit(transfer, "readonly"));

    expect(onDrop).toHaveBeenCalledWith(palette);
    const [delivered] = onDrop.mock.calls[0] ?? [];
    expect(delivered?.index).toBeUndefined();
  });

  it("ignores a payload from another group", () => {
    const { source, target, onDrop } = renderEmptyState({ dragGroup: "events" });
    const transfer = beginDrag(source, palette);

    fireEvent.drop(target, dragEventInit(transfer, "readonly"));

    expect(onDrop).not.toHaveBeenCalled();
  });

  it("does not mark itself while disabled", () => {
    const { source, target } = renderEmptyState({ disabled: true });
    const transfer = beginDrag(source, palette);

    fireEvent.dragOver(target, dragEventInit(transfer, "protected"));

    expect(target).not.toHaveAttribute("data-dnd-dragging-over");
  });

  it("ignores a drop when disabled", () => {
    const { source, target, onDrop } = renderEmptyState({ disabled: true });
    const transfer = beginDrag(source, palette);

    fireEvent.drop(target, dragEventInit(transfer, "readonly"));

    expect(onDrop).not.toHaveBeenCalled();
  });
});
