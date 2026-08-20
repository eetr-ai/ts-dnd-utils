import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { dragEventInit, FakeDataTransfer } from "../test/data-transfer.js";
import { DragDropProvider } from "./context.js";
import { DraggableButton } from "./draggable-button.js";
import { DropIndicator } from "./drop-indicator.js";
import { DND_MIME_TYPE } from "./engine.js";

function renderButton(props: Partial<Parameters<typeof DraggableButton>[0]> = {}) {
  const onClick = vi.fn<() => void>();
  const view = render(
    <DragDropProvider>
      <DraggableButton dropInformation={{ dragGroup: "sections" }} onClick={onClick} {...props}>
        Section
      </DraggableButton>
    </DragDropProvider>,
  );
  return { ...view, button: screen.getByRole("button"), onClick };
}

describe("DraggableButton", () => {
  it("is a real button that will not submit a form", () => {
    const { button } = renderButton();
    expect(button).toHaveAttribute("type", "button");
  });

  it("is draggable", () => {
    const { button } = renderButton();
    expect(button).toHaveAttribute("draggable", "true");
  });

  it("writes a payload with no index, which is what marks it a palette item", () => {
    const { button } = renderButton();
    const transfer = new FakeDataTransfer();

    fireEvent.dragStart(button, dragEventInit(transfer, "readwrite"));

    const written = JSON.parse(transfer.peek(DND_MIME_TYPE) ?? "null") as Record<string, unknown>;
    expect(written).toEqual({ dragGroup: "sections" });
    expect(written["index"]).toBeUndefined();
  });

  it("carries a payload when one is given", () => {
    const { button } = renderButton({
      dropInformation: { dragGroup: "sections", data: { kind: "hero" } },
    });
    const transfer = new FakeDataTransfer();

    fireEvent.dragStart(button, dragEventInit(transfer, "readwrite"));

    expect(JSON.parse(transfer.peek(DND_MIME_TYPE) ?? "null")).toEqual({
      dragGroup: "sections",
      data: { kind: "hero" },
    });
  });

  it("clicks, which is the path a keyboard user has", () => {
    const { button, onClick } = renderButton();
    fireEvent.click(button);
    expect(onClick).toHaveBeenCalledOnce();
  });

  it("neither drags nor clicks when disabled", () => {
    const { button, onClick } = renderButton({ disabled: true });
    const transfer = new FakeDataTransfer();

    expect(button).toBeDisabled();
    expect(button).toHaveAttribute("draggable", "false");

    fireEvent.dragStart(button, dragEventInit(transfer, "readwrite"));
    fireEvent.click(button);

    expect(transfer.peek(DND_MIME_TYPE)).toBeUndefined();
    expect(onClick).not.toHaveBeenCalled();
  });

  it("writes nothing while drags are disallowed", () => {
    render(
      <DragDropProvider initialDragAllowed={false}>
        <DraggableButton dropInformation={{ dragGroup: "sections" }}>Section</DraggableButton>
      </DragDropProvider>,
    );
    const transfer = new FakeDataTransfer();

    fireEvent.dragStart(screen.getByRole("button"), dragEventInit(transfer, "readwrite"));

    expect(transfer.peek(DND_MIME_TYPE)).toBeUndefined();
  });

  it("takes a replacement glyph", () => {
    renderButton({ handle: <span data-testid="glyph">+</span> });
    expect(screen.getByTestId("glyph")).toBeInTheDocument();
  });
});

describe("DropIndicator", () => {
  it("is hidden from assistive technology, having nothing to announce", () => {
    const { container } = render(<DropIndicator />);
    const indicator = container.querySelector("[data-dnd-indicator]");

    expect(indicator).toHaveAttribute("aria-hidden", "true");
    expect(indicator).toHaveAttribute("role", "presentation");
  });

  it("cannot become a drop target", () => {
    // It materialises directly under the pointer. Left interactive, it takes
    // over as the event target and fires a dragleave on the row it annotates.
    const { container } = render(<DropIndicator />);
    const indicator = container.querySelector("[data-dnd-indicator]") as HTMLElement;

    expect(indicator.style.pointerEvents).toBe("none");
  });

  it("reserves no layout space", () => {
    // The regression this guards: an indicator with height pushes the row below
    // it down at the exact moment the pointer is near that row's edge. The row
    // moves out from under the pointer, the hovered index changes, the
    // indicator moves, the row comes back -- and it oscillates.
    const { container } = render(<DropIndicator />);
    const indicator = container.querySelector("[data-dnd-indicator]") as HTMLElement;

    expect(indicator.style.height).toBe("0px");
  });

  it("lets a caller override those defaults deliberately", () => {
    const { container } = render(<DropIndicator style={{ height: "4px" }} />);
    const indicator = container.querySelector("[data-dnd-indicator]") as HTMLElement;

    expect(indicator.style.height).toBe("4px");
    expect(indicator.style.pointerEvents).toBe("none");
  });

  it("takes a class name so it can be styled", () => {
    const { container } = render(<DropIndicator className="my-line" />);
    expect(container.querySelector("[data-dnd-indicator]")).toHaveClass("my-line");
  });
});
