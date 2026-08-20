import type { DragEventLike } from "../src/types.js";

/**
 * The three states the specification puts `DataTransfer` in.
 *
 * - `readwrite` — during `dragstart` only. Everything works.
 * - `readonly` — during `drop`. `getData` works, `setData` is ignored.
 * - `protected` — **every other drag event, including `dragover`**. `types`
 *   stays readable; `getData` returns an empty string no matter what was set.
 *
 * That third state is the reason this library has a provider at all, so a test
 * double that ignores it would let a broken implementation pass: reading the
 * drag group straight off the event works perfectly right up until it meets a
 * real browser.
 */
export type DataTransferMode = "readwrite" | "readonly" | "protected";

/**
 * A `DataTransfer` stand-in. jsdom does not provide a usable one, and no real
 * implementation lets a test choose the mode.
 */
export class FakeDataTransfer {
  private readonly store = new Map<string, string>();

  /** Which of the three specification states this is currently in. */
  mode: DataTransferMode = "readwrite";

  effectAllowed = "uninitialized";
  dropEffect = "none";

  /** Readable in every mode, protected included. */
  get types(): readonly string[] {
    return [...this.store.keys()];
  }

  setData(format: string, data: string): void {
    if (this.mode !== "readwrite") return;
    this.store.set(format.toLowerCase(), data);
  }

  getData(format: string): string {
    if (this.mode === "protected") return "";
    return this.store.get(format.toLowerCase()) ?? "";
  }

  clearData(format?: string): void {
    if (this.mode !== "readwrite") return;
    if (format === undefined) this.store.clear();
    else this.store.delete(format.toLowerCase());
  }

  /** What the store holds, regardless of mode. For assertions only. */
  peek(format: string): string | undefined {
    return this.store.get(format.toLowerCase());
  }
}

export interface FakeDragEvent extends DragEventLike {
  dataTransfer: FakeDataTransfer & DataTransfer;
  defaultPrevented: boolean;
  propagationStopped: boolean;
}

/**
 * A minimal drag event for exercising the engine without a DOM.
 *
 * `mode` defaults to `protected`, matching every event except `dragstart` and
 * `drop` — the safe default, because it is the state that breaks naive code.
 */
export function createDragEvent(
  options: { transfer?: FakeDataTransfer; mode?: DataTransferMode } = {},
): FakeDragEvent {
  const transfer = options.transfer ?? new FakeDataTransfer();
  transfer.mode = options.mode ?? "protected";

  const event: FakeDragEvent = {
    dataTransfer: transfer as FakeDataTransfer & DataTransfer,
    defaultPrevented: false,
    propagationStopped: false,
    preventDefault() {
      event.defaultPrevented = true;
    },
    stopPropagation() {
      event.propagationStopped = true;
    },
  };
  return event;
}

/**
 * Event init for React Testing Library's `fireEvent`, which copies
 * `dataTransfer` onto the synthetic event.
 */
export function dragEventInit(
  transfer: FakeDataTransfer,
  mode: DataTransferMode,
): { dataTransfer: FakeDataTransfer } {
  transfer.mode = mode;
  return { dataTransfer: transfer };
}
