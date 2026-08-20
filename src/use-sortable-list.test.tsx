import { fireEvent, render, renderHook, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";

import { dragEventInit, dragLeaveEvent, FakeDataTransfer } from "../test/data-transfer.js";
import { DragDropProvider } from "./context.js";
import { DragDropPanel } from "./drag-drop-panel.js";
import { DraggableButton } from "./draggable-button.js";
import { DropIndicator } from "./drop-indicator.js";
import { useSortableList } from "./use-sortable-list.js";
import type { SortableListOptions } from "./use-sortable-list.js";

type Reorder = (from: number, to: number) => void;
type Insert = (at: number, data: string | undefined) => void;
type CrossList = NonNullable<SortableListOptions<string>["onDropFromOtherList"]>;

const ITEMS = ["Starters", "Mains", "Puddings"];

function List({ label = "list", ...options }: SortableListOptions<string> & { label?: string }) {
  const list = useSortableList<string>(options);
  return (
    <div data-testid={label} {...list.containerProps}>
      {ITEMS.map((item, index) => (
        <div key={item}>
          {list.dragOverIndex === index && <DropIndicator />}
          <DragDropPanel {...list.getItemProps(index, item)} handleLabel={`${label} drag ${item}`}>
            <span>{item}</span>
          </DragDropPanel>
        </div>
      ))}
    </div>
  );
}

function renderList(overrides: Partial<SortableListOptions<string>> = {}) {
  const onReorder = vi.fn<Reorder>();
  const onInsert = vi.fn<Insert>();
  const view = render(
    <DragDropProvider>
      <DraggableButton dropInformation={{ dragGroup: "menu", data: "New" }}>Add</DraggableButton>
      <List dragGroup="menu" onReorder={onReorder} onInsert={onInsert} {...overrides} />
    </DragDropProvider>,
  );
  const panels = [...view.container.querySelectorAll("[data-dnd-panel]")] as HTMLElement[];
  return { ...view, panels, onReorder, onInsert };
}

/** Starts a drag from the panel at `index` by arming its handle first. */
function dragFrom(panels: HTMLElement[], index: number, label = "list"): FakeDataTransfer {
  const transfer = new FakeDataTransfer();
  fireEvent.mouseDown(screen.getByRole("button", { name: `${label} drag ${ITEMS[index]}` }));
  fireEvent.dragStart(panels[index]!, dragEventInit(transfer, "readwrite"));
  return transfer;
}

function renderTwoLists(onDropFromOtherList?: SortableListOptions<string>["onDropFromOtherList"]) {
  const leftReorder = vi.fn<Reorder>();
  const rightReorder = vi.fn<Reorder>();
  const view = render(
    <DragDropProvider>
      <List label="left" dragGroup="menu" onReorder={leftReorder} />
      <List
        label="right"
        dragGroup="menu"
        onReorder={rightReorder}
        onDropFromOtherList={onDropFromOtherList}
      />
    </DragDropProvider>,
  );
  const all = [...view.container.querySelectorAll("[data-dnd-panel]")] as HTMLElement[];
  return { left: all.slice(0, 3), right: all.slice(3), leftReorder, rightReorder };
}

describe("tracking the hover position", () => {
  it("starts with nothing hovered", () => {
    const { result } = renderHook(
      () => useSortableList({ dragGroup: "menu", onReorder: vi.fn<Reorder>() }),
      {
        wrapper: ({ children }: { children: ReactNode }) => (
          <DragDropProvider>{children}</DragDropProvider>
        ),
      },
    );
    expect(result.current.dragOverIndex).toBe(-1);
  });

  it("shows the indicator at the position being hovered", () => {
    const { panels, container } = renderList();
    const transfer = dragFrom(panels, 0);

    fireEvent.dragOver(panels[2]!, dragEventInit(transfer, "protected"));

    expect(container.querySelectorAll("[data-dnd-indicator]")).toHaveLength(1);
  });

  it.each([
    ["the drag ends", (el: HTMLElement) => fireEvent.dragEnd(el)],
    [
      "the drag leaves the list",
      (el: HTMLElement) => fireEvent.dragLeave(el, { relatedTarget: document.body }),
    ],
    ["a drop happens", (el: HTMLElement) => fireEvent.drop(el)],
  ])("clears the indicator once %s", (_label, finish) => {
    // A drag leaves a list in three different ways. Miss one and the indicator
    // is still on screen after the drag is over.
    const { panels, container } = renderList();
    const transfer = dragFrom(panels, 0);
    fireEvent.dragOver(panels[2]!, dragEventInit(transfer, "protected"));
    expect(container.querySelectorAll("[data-dnd-indicator]")).toHaveLength(1);

    finish(screen.getByTestId("list"));

    expect(container.querySelectorAll("[data-dnd-indicator]")).toHaveLength(0);
  });

  it("keeps the indicator while the pointer moves from one row to the next", () => {
    // dragleave bubbles, so crossing between rows delivers one to the
    // container. Clearing on that dropped the indicator between every pair of
    // items and immediately put it back -- a flicker on every transition.
    const { panels, container } = renderList();
    const transfer = dragFrom(panels, 0);
    fireEvent.dragOver(panels[2]!, dragEventInit(transfer, "protected"));
    expect(container.querySelectorAll("[data-dnd-indicator]")).toHaveLength(1);

    const list = screen.getByTestId("list");
    fireEvent(list, dragLeaveEvent(panels[1]!));

    expect(container.querySelectorAll("[data-dnd-indicator]")).toHaveLength(1);
  });

  it("keeps containerProps referentially stable", () => {
    const { result, rerender } = renderHook(
      () => useSortableList({ dragGroup: "menu", onReorder: vi.fn<Reorder>() }),
      {
        wrapper: ({ children }: { children: ReactNode }) => (
          <DragDropProvider>{children}</DragDropProvider>
        ),
      },
    );
    const before = result.current.containerProps;
    rerender();
    expect(result.current.containerProps).toBe(before);
  });
});

describe("reordering", () => {
  it("reports the move from the source position to the target", () => {
    const { panels, onReorder } = renderList();
    const transfer = dragFrom(panels, 0);

    fireEvent.drop(panels[2]!, dragEventInit(transfer, "readonly"));

    expect(onReorder).toHaveBeenCalledWith(0, 2);
  });

  it("says nothing when an item is dropped where it already is", () => {
    const { panels, onReorder } = renderList();
    const transfer = dragFrom(panels, 1);

    fireEvent.drop(panels[1]!, dragEventInit(transfer, "readonly"));

    expect(onReorder).not.toHaveBeenCalled();
  });

  it("does not call onInsert for a reorder", () => {
    const { panels, onInsert } = renderList();
    const transfer = dragFrom(panels, 0);

    fireEvent.drop(panels[1]!, dragEventInit(transfer, "readonly"));

    expect(onInsert).not.toHaveBeenCalled();
  });
});

describe("inserting from a palette", () => {
  it("treats a payload with no index as a new item, and passes its data through", () => {
    const { panels, onInsert, onReorder } = renderList();
    const transfer = new FakeDataTransfer();
    fireEvent.dragStart(
      screen.getByRole("button", { name: "Add" }),
      dragEventInit(transfer, "readwrite"),
    );

    fireEvent.drop(panels[1]!, dragEventInit(transfer, "readonly"));

    expect(onInsert).toHaveBeenCalledWith(1, "New");
    expect(onReorder).not.toHaveBeenCalled();
  });

  it("ignores a palette drop when no onInsert was given", () => {
    const { panels, onReorder } = renderList({ onInsert: undefined });
    const transfer = new FakeDataTransfer();
    fireEvent.dragStart(
      screen.getByRole("button", { name: "Add" }),
      dragEventInit(transfer, "readwrite"),
    );

    expect(() => fireEvent.drop(panels[1]!, dragEventInit(transfer, "readonly"))).not.toThrow();
    expect(onReorder).not.toHaveBeenCalled();
  });
});

describe("a second list sharing the group", () => {
  it("does not reorder the receiving list using the sender's index", () => {
    // The index counts positions in a different list. Treating it as a reorder
    // would move the wrong row -- silent data corruption.
    const { left, right, rightReorder } = renderTwoLists();
    const transfer = dragFrom(left, 0, "left");

    fireEvent.drop(right[2]!, dragEventInit(transfer, "readonly"));

    expect(rightReorder).not.toHaveBeenCalled();
  });

  it("offers the drop to onDropFromOtherList when there is one", () => {
    const onDropFromOtherList = vi.fn<CrossList>();
    const { left, right } = renderTwoLists(onDropFromOtherList);
    const transfer = dragFrom(left, 0, "left");

    fireEvent.drop(right[2]!, dragEventInit(transfer, "readonly"));

    expect(onDropFromOtherList).toHaveBeenCalledWith(2, expect.objectContaining({ index: 0 }));
  });

  it("still reorders normally within one list", () => {
    const { left, leftReorder, rightReorder } = renderTwoLists();
    const transfer = dragFrom(left, 0, "left");

    fireEvent.drop(left[2]!, dragEventInit(transfer, "readonly"));

    expect(leftReorder).toHaveBeenCalledWith(0, 2);
    expect(rightReorder).not.toHaveBeenCalled();
  });
});
