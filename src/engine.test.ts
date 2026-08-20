import { describe, expect, it, vi } from "vitest";

import { createDragEvent, FakeDataTransfer } from "../test/data-transfer.js";
import {
  acceptsDrag,
  DND_MIME_TYPE,
  dragOver,
  drop,
  isRealDragLeave,
  readDropInformation,
  startDrag,
} from "./engine.js";
import type { DropCallback, DropInformation } from "./types.js";

const sections: DropInformation<{ title: string }> = {
  dragGroup: "sections",
  index: 2,
  data: { title: "Starters" },
};

function droppableEvent(info: DropInformation<unknown>) {
  const transfer = new FakeDataTransfer();
  startDrag(createDragEvent({ transfer, mode: "readwrite" }), info);
  return createDragEvent({ transfer, mode: "readonly" });
}

describe("startDrag", () => {
  it("writes the payload as JSON under the shared media type", () => {
    const event = createDragEvent({ mode: "readwrite" });
    startDrag(event, sections);

    expect(JSON.parse(event.dataTransfer.peek(DND_MIME_TYPE) ?? "null")).toEqual(sections);
  });

  it("marks the drag as a move", () => {
    // Some browsers refuse the drop outright without this, and both of the
    // hand-written originals left it to the call site.
    const event = createDragEvent({ mode: "readwrite" });
    startDrag(event, sections);

    expect(event.dataTransfer.effectAllowed).toBe("move");
  });

  it("clears the transfer before writing to it", () => {
    // Asserted as an ordering rather than by the resulting value: a Map
    // overwrites, so dropping clearData() leaves the end state identical and
    // the test would pass against an implementation missing it. Firefox is the
    // reason it has to be there -- it will not replace an existing entry for a
    // type that is already set.
    const transfer = new FakeDataTransfer();
    const order: string[] = [];
    vi.spyOn(transfer, "clearData").mockImplementation(() => void order.push("clear"));
    vi.spyOn(transfer, "setData").mockImplementation(() => void order.push("set"));

    startDrag(createDragEvent({ transfer, mode: "readwrite" }), sections);

    expect(order).toEqual(["clear", "set"]);
  });

  it("does nothing when the event carries no dataTransfer", () => {
    const event = {
      dataTransfer: null,
      preventDefault: vi.fn<() => void>(),
      stopPropagation: vi.fn<() => void>(),
    };
    expect(() => startDrag(event, sections)).not.toThrow();
  });
});

describe("readDropInformation", () => {
  it("round-trips what startDrag wrote", () => {
    const transfer = new FakeDataTransfer();
    startDrag(createDragEvent({ transfer, mode: "readwrite" }), sections);

    const event = createDragEvent({ transfer, mode: "readonly" });
    expect(readDropInformation(event)).toEqual(sections);
  });

  it("returns null in protected mode, however full the store is", () => {
    // The whole reason the group cannot be read during dragover.
    const transfer = new FakeDataTransfer();
    startDrag(createDragEvent({ transfer, mode: "readwrite" }), sections);

    expect(readDropInformation(createDragEvent({ transfer, mode: "protected" }))).toBeNull();
    expect(transfer.peek(DND_MIME_TYPE)).toBeTruthy();
  });

  it.each([
    ["nothing at all", ""],
    ["text that is not JSON", "definitely not json"],
    ["JSON that is not an object", '"a string"'],
    ["null", "null"],
    ["an object with no drag group", '{"index":1}'],
    ["an object whose drag group is not a string", '{"dragGroup":42}'],
  ])("returns null for %s rather than throwing", (_label, raw) => {
    // A drop can carry a file, a text selection, or anything another page put
    // there. None of it should crash a drop handler.
    const transfer = new FakeDataTransfer();
    if (raw) transfer.setData(DND_MIME_TYPE, raw);

    expect(readDropInformation(createDragEvent({ transfer, mode: "readonly" }))).toBeNull();
  });
});

describe("acceptsDrag", () => {
  it("accepts a drag from the same group", () => {
    expect(acceptsDrag(sections, "sections")).toBe(true);
  });

  it("refuses a drag from another group", () => {
    expect(acceptsDrag(sections, "events")).toBe(false);
  });

  it("refuses when nothing is being dragged", () => {
    expect(acceptsDrag(null, "sections")).toBe(false);
  });
});

describe("dragOver", () => {
  it("permits the drop for a matching group", () => {
    // preventDefault is what marks the element as a drop target. Without it the
    // browser shows a no-entry cursor and never fires drop at all.
    const event = createDragEvent();
    const onAccepted = vi.fn<() => void>();

    expect(dragOver(event, "sections", sections, onAccepted)).toBe(true);
    expect(event.defaultPrevented).toBe(true);
    expect(onAccepted).toHaveBeenCalledOnce();
  });

  it("leaves a mismatched group alone", () => {
    const event = createDragEvent();
    const onAccepted = vi.fn<() => void>();

    expect(dragOver(event, "events", sections, onAccepted)).toBe(false);
    expect(event.defaultPrevented).toBe(false);
    expect(onAccepted).not.toHaveBeenCalled();
  });

  it("works while dataTransfer is protected, which is the only state it sees", () => {
    const transfer = new FakeDataTransfer();
    startDrag(createDragEvent({ transfer, mode: "readwrite" }), sections);
    const event = createDragEvent({ transfer, mode: "protected" });

    expect(dragOver(event, "sections", sections)).toBe(true);
    expect(event.dataTransfer.getData(DND_MIME_TYPE)).toBe("");
  });

  it("refuses everything when no drag is active", () => {
    const event = createDragEvent();
    expect(dragOver(event, "sections", null)).toBe(false);
    expect(event.defaultPrevented).toBe(false);
  });
});

describe("drop", () => {
  it("hands the payload to the callback", () => {
    const event = droppableEvent(sections);
    const onDrop = vi.fn<DropCallback>();

    expect(drop(event, "sections", onDrop)).toBe(true);
    expect(onDrop).toHaveBeenCalledWith(sections);
  });

  it("stops the drop reaching an enclosing target", () => {
    // Drop targets nest. Without this a drop on a row also lands on the list
    // around it, which is why the original needed a compensating handler on
    // every list to undo the second delivery.
    const event = droppableEvent(sections);

    drop(event, "sections", vi.fn<DropCallback>());

    expect(event.propagationStopped).toBe(true);
    expect(event.defaultPrevented).toBe(true);
  });

  it("ignores a payload from another group", () => {
    const event = droppableEvent(sections);
    const onDrop = vi.fn<DropCallback>();

    expect(drop(event, "events", onDrop)).toBe(false);
    expect(onDrop).not.toHaveBeenCalled();
    expect(event.propagationStopped).toBe(false);
  });

  it("ignores a drop carrying nothing of ours", () => {
    const event = createDragEvent({ mode: "readonly" });
    const onDrop = vi.fn<DropCallback>();

    expect(drop(event, "sections", onDrop)).toBe(false);
    expect(onDrop).not.toHaveBeenCalled();
  });

  it("preserves an absent index, which is what marks a palette drag", () => {
    const event = droppableEvent({ dragGroup: "sections" });
    const onDrop = vi.fn<DropCallback>();

    drop(event, "sections", onDrop);

    expect(onDrop).toHaveBeenCalledWith(expect.objectContaining({ dragGroup: "sections" }));
    const [delivered] = onDrop.mock.calls[0] ?? [];
    expect(delivered?.index).toBeUndefined();
  });
});

function elements() {
  const parent = document.createElement("div");
  const child = document.createElement("span");
  const grandchild = document.createElement("em");
  child.append(grandchild);
  parent.append(child);
  return { parent, child, grandchild };
}

describe("isRealDragLeave", () => {
  it("is false when the pointer moved onto a direct child", () => {
    // The whole bug: dragleave fires on the parent as the pointer crosses into
    // anything inside it, and treating that as a departure makes the highlight
    // strobe for as long as the pointer stays put.
    const { parent, child } = elements();
    expect(isRealDragLeave({ currentTarget: parent, relatedTarget: child })).toBe(false);
  });

  it("is false for a deeper descendant too", () => {
    const { parent, grandchild } = elements();
    expect(isRealDragLeave({ currentTarget: parent, relatedTarget: grandchild })).toBe(false);
  });

  it("is true when the pointer moved to an unrelated element", () => {
    const { parent } = elements();
    expect(
      isRealDragLeave({ currentTarget: parent, relatedTarget: document.createElement("div") }),
    ).toBe(true);
  });

  it("is true when the pointer moved to the parent's own parent", () => {
    const { parent } = elements();
    const outer = document.createElement("div");
    outer.append(parent);
    expect(isRealDragLeave({ currentTarget: parent, relatedTarget: outer })).toBe(true);
  });

  it("treats a missing relatedTarget as a real departure", () => {
    // Leaving the window, mostly. Erring this way is the safe side: dragover
    // repeats, so a highlight cleared in error returns within a frame, while
    // one left set in error stays on screen after the drag is gone.
    const { parent } = elements();
    expect(isRealDragLeave({ currentTarget: parent, relatedTarget: null })).toBe(true);
  });

  it("treats a non-Node relatedTarget as a real departure", () => {
    const { parent } = elements();
    expect(isRealDragLeave({ currentTarget: parent, relatedTarget: new EventTarget() })).toBe(true);
  });
});
