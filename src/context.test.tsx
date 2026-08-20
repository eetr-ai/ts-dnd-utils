import { act, renderHook } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";

import { DragDropProvider, useDragActions, useDragDropInfo } from "./context.js";
import type { DropInformation } from "./types.js";

const dragged: DropInformation = { dragGroup: "sections", index: 1 };

function wrapper({ children }: { children: ReactNode }): ReactNode {
  return <DragDropProvider>{children}</DragDropProvider>;
}

function renderSession() {
  return renderHook(() => ({ info: useDragDropInfo(), actions: useDragActions() }), { wrapper });
}

describe("DragDropProvider", () => {
  it("starts with drags allowed and nothing in flight", () => {
    const { result } = renderSession();
    expect(result.current.info).toEqual({ dragAllowed: true, active: null });
  });

  it("honours initialDragAllowed", () => {
    const { result } = renderHook(() => useDragDropInfo(), {
      wrapper: ({ children }: { children: ReactNode }) => (
        <DragDropProvider initialDragAllowed={false}>{children}</DragDropProvider>
      ),
    });
    expect(result.current.dragAllowed).toBe(false);
  });

  it("gives the actions object a stable identity across renders", () => {
    // Consumers put these in effect dependency lists.
    const { result, rerender } = renderSession();
    const before = result.current.actions;
    rerender();
    expect(result.current.actions).toBe(before);
  });
});

describe("drag lifecycle", () => {
  it("records the drag in flight", () => {
    const { result } = renderSession();
    act(() => result.current.actions.beginDrag(dragged));
    expect(result.current.info.active).toEqual(dragged);
  });

  it("clears the drag when it ends", () => {
    const { result } = renderSession();
    act(() => result.current.actions.beginDrag(dragged));
    act(() => result.current.actions.endDrag());
    expect(result.current.info.active).toBeNull();
  });

  it("clears the drag when one is abandoned, not only when one is dropped", () => {
    // Regression: the module-level variable this replaces was only reset on a
    // successful drop, so a drag cancelled with Escape left its group behind
    // and a later, unrelated dragover would match against it.
    const { result } = renderSession();

    act(() => result.current.actions.beginDrag(dragged));
    act(() => result.current.actions.endDrag()); // as dragend fires after Escape
    expect(result.current.info.active).toBeNull();

    act(() => result.current.actions.beginDrag({ dragGroup: "events", index: 0 }));
    expect(result.current.info.active).toEqual({ dragGroup: "events", index: 0 });
  });

  it("replaces the active drag when a new one starts", () => {
    const { result } = renderSession();
    act(() => result.current.actions.beginDrag(dragged));
    act(() => result.current.actions.beginDrag({ dragGroup: "events", index: 4 }));
    expect(result.current.info.active).toEqual({ dragGroup: "events", index: 4 });
  });

  it("treats ending a drag that never began as a no-op", () => {
    const { result } = renderSession();
    act(() => result.current.actions.endDrag());
    expect(result.current.info.active).toBeNull();
  });
});

describe("the drag-allowed gate", () => {
  it("lowers and raises", () => {
    const { result } = renderSession();

    act(() => result.current.actions.setDragAllowed(false));
    expect(result.current.info.dragAllowed).toBe(false);

    act(() => result.current.actions.setDragAllowed(true));
    expect(result.current.info.dragAllowed).toBe(true);
  });

  it("keeps the same state object when the value does not change", () => {
    const { result } = renderSession();
    const before = result.current.info;
    act(() => result.current.actions.setDragAllowed(true));
    expect(result.current.info).toBe(before);
  });
});

describe("independence", () => {
  it("keeps nested providers as separate sessions", () => {
    // The thing a module-level variable could never do: two drag surfaces in
    // one process that do not see each other's state.
    const outer = renderSession();
    const inner = renderSession();

    act(() => outer.result.current.actions.beginDrag(dragged));

    expect(outer.result.current.info.active).toEqual(dragged);
    expect(inner.result.current.info.active).toBeNull();
  });
});

describe("used outside a provider", () => {
  it.each([
    ["useDragDropInfo", useDragDropInfo],
    ["useDragActions", useDragActions],
  ])("%s explains itself rather than failing obscurely", (name, hook) => {
    const quiet = vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      expect(() => renderHook(() => hook())).toThrow(
        new RegExp(`${name} must be used inside a <DragDropProvider>`),
      );
    } finally {
      quiet.mockRestore();
    }
  });
});
