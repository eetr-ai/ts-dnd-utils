# ts-dnd-utils

[![CI](https://github.com/eetr-ai/ts-dnd-utils/actions/workflows/ci.yml/badge.svg)](https://github.com/eetr-ai/ts-dnd-utils/actions/workflows/ci.yml)
[![npm](https://img.shields.io/npm/v/@eetr/ts-dnd-utils.svg)](https://www.npmjs.com/package/@eetr/ts-dnd-utils)
[![license](https://img.shields.io/npm/l/@eetr/ts-dnd-utils.svg)](LICENSE)

Headless drag & drop primitives for React. Typed payloads, drag groups, and no
runtime dependencies.

Built on the browser's own HTML5 drag & drop events. This library owns the
awkward parts — the payload, group matching while `dataTransfer` is unreadable,
and the handle gating that keeps text inside a draggable row selectable — and
takes no position whatsoever on how any of it looks.

```bash
npm install @eetr/ts-dnd-utils
```

React 18 or newer, as a peer dependency. Nothing else ships.

## Try it

There is a runnable demo in [`examples/demo`](examples/demo) — two lists on
different groups, palette drags, an empty-state target, and an insertion
indicator, styled entirely through the `data-*` hooks below.

```bash
npm ci             # once, for this package
npm run demo:install   # once, for the demo's own dependencies
npm run demo           # builds the library, then serves the demo
```

`npm run demo` rebuilds the library each time it starts, since the demo resolves
it through the published entry points rather than from `src/`. While changing
library code, run `npm run dev` in a second terminal for a rebuild on save.

## Quick start

A sortable list is a provider, a hook, and a panel per row.

```tsx
import {
  DragDropPanel,
  DragDropProvider,
  DropIndicator,
  useSortableList,
} from "@eetr/ts-dnd-utils";
import { moveItem } from "@eetr/ts-dnd-utils/array";
import { useState } from "react";

function Courses() {
  const [courses, setCourses] = useState(["Starters", "Mains", "Puddings"]);

  const list = useSortableList<string>({
    dragGroup: "courses",
    onReorder: (from, to) => setCourses((current) => moveItem(current, from, to)),
  });

  return (
    <div {...list.containerProps}>
      {courses.map((course, index) => (
        <div key={course}>
          {list.dragOverIndex === index && <DropIndicator />}
          <DragDropPanel {...list.getItemProps(index, course)}>{course}</DragDropPanel>
        </div>
      ))}
    </div>
  );
}

export function App() {
  return (
    <DragDropProvider>
      <Courses />
    </DragDropProvider>
  );
}
```

## How it works

### Drag groups

Every draggable item and every drop target declares a `dragGroup`. A target
accepts a drag only when the groups match, which is what stops two lists on one
page swallowing each other's items.

A group is declared **per item, not per provider**, so one provider can cover a
palette and several lists that each refuse the others' items.

### Why there is a provider

The HTML specification puts `dataTransfer` in _protected mode_ for the whole
`dragover` phase: `getData()` returns an empty string no matter what was set, and
only `types` is readable. The payload becomes readable again on `drop`.

So a drop target cannot ask the event which group is being dragged. It has to be
remembered elsewhere, and `DragDropProvider` is where. Nesting providers gives
genuinely separate drag sessions.

### Palette items

An item dragged from somewhere unordered — a palette of things to add — carries
**no `index`**. That absence is the signal:

```tsx
// A palette entry. No index, so a list reads this as "insert a new one".
<DraggableButton dropInformation={{ dragGroup: "courses", data: "New course" }}>
  Add a course
</DraggableButton>
```

```tsx
const list = useSortableList<string>({
  dragGroup: "courses",
  onReorder: (from, to) => setCourses((c) => moveItem(c, from, to)),
  onInsert: (at, data) => setCourses((c) => insertAt(c, at, data ?? "Untitled")),
});
```

## Components

| Component          | What it is                                                                |
| ------------------ | ------------------------------------------------------------------------- |
| `DragDropProvider` | Scopes a drag session. Everything else must be inside one.                |
| `DragDropPanel`    | A sortable row: drag source and drop target, armed by its handle.         |
| `DroppablePanel`   | A plain drop target with no drag behaviour — the empty-state placeholder. |
| `DropIndicator`    | The line showing where a drop would land.                                 |
| `DraggableButton`  | A palette entry: a real `<button>` that can also be dragged.              |
| `DragHandleIcon`   | The default grip glyph, exported so you can place it yourself.            |

### `DragDropPanel`

| Prop                           | Type                 | Default             |                                                                                |
| ------------------------------ | -------------------- | ------------------- | ------------------------------------------------------------------------------ |
| `dropInformation`              | `DropInformation<T>` | —                   | What this row is, when it is the one being dragged                             |
| `onDrop`                       | `DropCallback<T>`    | —                   | A compatible item was dropped here                                             |
| `onDragOverItem`               | `DropCallback<T>`    | —                   | Fires repeatedly while a compatible item hovers, with _this_ row's information |
| `handle`                       | `ReactNode`          | grip SVG            | Replaces the default glyph                                                     |
| `showHandle`                   | `boolean`            | `true`              | Set `false` to drop the handle entirely                                        |
| `handleLabel`                  | `string`             | `"Drag to reorder"` | Accessible name for the handle                                                 |
| `wholeElementDraggable`        | `boolean`            | `false`             | Drag from anywhere in the row rather than only the handle                      |
| `disabled`                     | `boolean`            | `false`             | Neither drags nor accepts drops                                                |
| `className`, `handleClassName` | `string`             | —                   | Styling hooks                                                                  |

The row is only `draggable` while its handle is held. That is deliberate: a
permanently draggable ancestor makes the browser drag the row instead of letting
you select text inside it, so inputs and copyable content stay usable. Turn on
`wholeElementDraggable` where there is nothing to select.

### `DroppablePanel`

| Prop           | Type              | Default |                                                                |
| -------------- | ----------------- | ------- | -------------------------------------------------------------- |
| `dragGroup`    | `string`          | —       | Only this group is accepted                                    |
| `onDrop`       | `DropCallback<T>` | —       | A compatible item was dropped                                  |
| `draggingOver` | `boolean`         | —       | Takes control of the hover state; omit to let it track its own |
| `disabled`     | `boolean`         | `false` |                                                                |
| `className`    | `string`          | —       |                                                                |

### `DraggableButton`

| Prop                                            | Type                 | Default |                                                     |
| ----------------------------------------------- | -------------------- | ------- | --------------------------------------------------- |
| `dropInformation`                               | `DropInformation<T>` | —       | Usually a `dragGroup` and `data`, with no `index`   |
| `onClick`                                       | `(event) => void`    | —       | The keyboard-reachable equivalent of dragging it in |
| `handle`, `showHandle`, `disabled`, `className` |                      |         | As above                                            |

Give it an `onClick` that does what the drag does. Dragging is mouse-only, so
that click is the only way a keyboard user can reach the same outcome.

## `useSortableList`

Collapses the hover bookkeeping every sortable list otherwise repeats.

```ts
const list = useSortableList<T>({
  dragGroup: string,
  onReorder: (from: number, to: number) => void,
  onInsert?: (at: number, data: T | undefined) => void,
  onDropFromOtherList?: (at: number, info: DropInformation<T>) => void,
});

list.dragOverIndex;                  // hovered position, or -1
list.containerProps;                 // spread onto the element wrapping the list
list.getItemProps(index, data);      // spread onto each <DragDropPanel>
```

`containerProps` must go on the wrapper. It clears the indicator on all three
ways a drag can leave a list — dropped on it, dropped elsewhere, or abandoned.

**Two lists sharing one group.** Each list stamps its items with an identity, so
a drop carrying another list's stamp never reaches `onReorder` — its `index`
counts positions in a list that is not this one, and using it would move the
wrong row. Such drops go to `onDropFromOtherList`, or are ignored when there
isn't one.

## Styling

Nothing ships styled. No stylesheet, no class names, no CSS framework. Every
element takes `className` and carries stable `data-*` attributes so state can be
targeted from any CSS approach.

| Attribute                | On                                                       | Present when                                        |
| ------------------------ | -------------------------------------------------------- | --------------------------------------------------- |
| `data-dnd-panel`         | `DragDropPanel` root                                     | always                                              |
| `data-dnd-panel-content` | the content wrapper inside a panel                       | always                                              |
| `data-dnd-handle`        | the handle `<button>` of a panel                         | `showHandle` is `true`                              |
| `data-dnd-handle-icon`   | the default grip `<svg>`, in a panel or a palette button | `showHandle` is `true` and no `handle` was supplied |
| `data-dnd-droppable`     | `DroppablePanel` root                                    | always                                              |
| `data-dnd-palette-item`  | `DraggableButton`                                        | always                                              |
| `data-dnd-indicator`     | `DropIndicator`                                          | always                                              |
| `data-dnd-dragging-over` | panel or droppable                                       | a compatible drag is hovering                       |
| `data-dnd-dragging`      | `DragDropPanel`                                          | this row is the one being dragged                   |
| `data-dnd-disabled`      | panel, droppable, or palette button                      | `disabled` is set                                   |

Plain CSS:

```css
[data-dnd-panel] {
  display: flex;
  align-items: stretch;
  gap: 0.25rem;
}
[data-dnd-panel-content] {
  flex: 1;
}
[data-dnd-handle] {
  cursor: grab;
  border: 0;
  background: none;
  color: #64748b;
}
[data-dnd-dragging-over] {
  outline: 2px dashed #94a3b8;
}
[data-dnd-dragging] {
  opacity: 0.5;
}
[data-dnd-indicator] {
  height: 2px;
  background: #475569;
  border-radius: 999px;
}
```

### Keep hover styling out of the layout

One rule matters more than the rest: **whatever you apply on
`data-dnd-dragging-over` must not change the element's size or position.**

Use `outline` or `box-shadow`. Both paint outside the box without reserving any
of it. A `border` or a `padding` change makes the element grow at the moment the
pointer reaches its edge, which moves it out from under the pointer, which ends
the hover, which shrinks it back — a loop that reads as flicker and sits exactly
on the boundary between two rows.

`DropIndicator` defaults to `height: 0` for the same reason, and draws best with
`box-shadow`:

```css
[data-dnd-indicator] {
  box-shadow: 0 0 0 1.5px rebeccapurple;
  border-radius: 999px;
}
```

The library handles the other half of this — a `dragleave` fired because the
pointer moved onto a child element is ignored, so the highlight survives the
pointer crossing your own markup.

Tailwind, via `className`:

```tsx
<DragDropPanel
  className="flex items-stretch gap-1 rounded bg-white data-[dnd-dragging-over]:outline"
  handleClassName="w-4 cursor-grab rounded-full bg-slate-500 text-white"
  {...list.getItemProps(index)}
/>
```

CSS Modules work the same way — pass `styles.panel` to `className`.

## The `/array` subpath

Immutable helpers for the reorder a drop ends in. No React, so a reducer running
on the server can import them.

```ts
import { insertAt, moveItem, removeAt } from "@eetr/ts-dnd-utils/array";

moveItem(["a", "b", "c"], 0, 2); // ["b", "c", "a"]
insertAt(["a", "c"], 1, "b"); // ["a", "b", "c"]
removeAt(["a", "b", "c"], 1); // ["a", "c"]
```

All three copy rather than mutate, and treat an out-of-range index as a no-op
rather than an error — a drop can race a list that changed underneath it, and
throwing there turns a harmless miss into a crash.

## Working with the engine directly

The pieces underneath are exported for anything the components do not cover.
They take a structural event, so they work with React's synthetic event, a
native one, or a plain object in a test.

```ts
import { acceptsDrag, dragOver, drop, readDropInformation, startDrag } from "@eetr/ts-dnd-utils";
```

Only call `readDropInformation` during `drop`. Through `dragover` the payload is
unreadable — use `acceptsDrag(active, group)` with the value from
`useDragDropInfo()`.

## Framework notes

**Next.js App Router.** No `"use client"` directive ships, so mark your own call
site — the component that renders `DragDropProvider` and the panels.

```tsx
"use client";
import { DragDropProvider } from "@eetr/ts-dnd-utils";
```

**Server rendering.** The components render fine on the server; the drag
behaviour attaches on hydration. `@eetr/ts-dnd-utils/array` imports no React at
all and is safe anywhere.

## Limitations

Stated plainly, because they follow from the input model and no amount of API
will hide them.

- **Touch is not supported.** Two separate reasons, worth telling apart.

  This library binds no touch or pointer handlers at all. `DragDropPanel` arms
  its handle on `onMouseDown`, which touch does not reliably produce, so the
  handle path cannot work from a finger. `wholeElementDraggable` skips the
  handle and leaves a permanently `draggable` element — but whether a touch
  gesture on that element becomes a drag is entirely the browser's decision, and
  mainstream mobile browsers generally do not make it.

  Treat touch as unsupported and give anything that must work there a non-drag
  path, such as move-up and move-down buttons calling the same `moveItem` your
  `onReorder` does. Supporting touch properly means a different input model —
  pointer events with manual hit-testing — which this library does not attempt.

- **No keyboard reordering.** For the same reason: there is no keyboard gesture
  the browser turns into a drag. `DraggableButton` is a real `<button>` and its
  `onClick` is keyboard-reachable, and the drag handle is a focusable button with
  an accessible name, but there is no built-in pick-up-and-move-with-arrow-keys.
  If keyboard parity matters, pair each row with ordinary buttons calling the same
  `moveItem` your `onReorder` does.
- **One page, one session.** A drag is matched against state held in a React
  provider, so dragging between two browser windows is not supported.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md).

## License

[MIT](LICENSE) © Eetr Culinary Insights
