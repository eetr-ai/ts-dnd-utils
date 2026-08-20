import {
  DragDropPanel,
  DragDropProvider,
  DraggableButton,
  DropIndicator,
  DroppablePanel,
  useSortableList,
} from "@eetr/ts-dnd-utils";
import { insertAt, moveItem, removeAt } from "@eetr/ts-dnd-utils/array";
import { useState } from "react";

interface Item {
  id: string;
  name: string;
}

// A module-level sequence rather than a ref or a piece of state. Ids must be
// unique per call and are never rendered, so they are not React's business --
// and reading a ref during render, which the lazy initialiser below would do,
// is exactly the thing React tells you not to do.
let sequence = 0;

function makeItem(group: string, name: string): Item {
  sequence += 1;
  return { id: `${group}-${sequence}`, name };
}

/**
 * Two lists in one drag session, on deliberately different groups.
 *
 * Courses accepts course cards and refuses wines; the wine list does the
 * reverse. That is the group model doing its job, and it is the thing a README
 * cannot show you.
 */
export function App() {
  return (
    <DragDropProvider>
      <main className="page">
        <header>
          <h1>ts-dnd-utils</h1>
          <p>
            Headless drag &amp; drop primitives for React. Drag a row by its grip, or drag the card
            from a palette into a list. Each group refuses the other's items — try dragging a wine
            onto the courses.
          </p>
          <p className="note">
            Mouse or trackpad only: HTML5 drag &amp; drop produces no events from touch. Every row
            also carries move buttons, which is the non-drag alternative the README recommends.
          </p>
        </header>

        <div className="columns">
          <SortableSection
            title="Courses"
            dragGroup="courses"
            noun="course"
            initial={["Salt-baked celeriac", "Brown butter cod", "Burnt honey tart"]}
          />
          <SortableSection
            title="Wines"
            dragGroup="wines"
            noun="wine"
            initial={["Chenin Blanc", "Gamay"]}
          />
        </div>

        <footer>
          Nothing here is styled by the library. Every rule in this page's stylesheet targets a{" "}
          <code>data-dnd-*</code> attribute.
        </footer>
      </main>
    </DragDropProvider>
  );
}

function SortableSection({
  title,
  dragGroup,
  noun,
  initial,
}: {
  title: string;
  dragGroup: string;
  noun: string;
  initial: string[];
}) {
  const make = (name: string): Item => makeItem(dragGroup, name);

  const [items, setItems] = useState<Item[]>(() =>
    initial.map((name) => makeItem(dragGroup, name)),
  );

  const list = useSortableList<Item>({
    dragGroup,
    onReorder: (from, to) => setItems((current) => moveItem(current, from, to)),
    onInsert: (at) => setItems((current) => insertAt(current, at, make(`New ${noun}`))),
  });

  return (
    <section className="panel">
      <h2>{title}</h2>

      <DraggableButton
        dropInformation={{ dragGroup }}
        onClick={() => setItems((current) => [...current, make(`New ${noun}`)])}
        className="palette-item"
      >
        Add a {noun}
      </DraggableButton>

      <div className="list" {...list.containerProps}>
        {items.map((item, index) => (
          <div key={item.id}>
            {list.dragOverIndex === index && <DropIndicator className="indicator" />}
            <DragDropPanel
              {...list.getItemProps(index, item)}
              className="row"
              handleClassName="grip"
              handleLabel={`Reorder ${item.name}`}
            >
              <span className="row-label">{item.name}</span>
              <span className="row-actions">
                <button
                  type="button"
                  aria-label={`Move ${item.name} up`}
                  disabled={index === 0}
                  onClick={() => setItems((current) => moveItem(current, index, index - 1))}
                >
                  ↑
                </button>
                <button
                  type="button"
                  aria-label={`Move ${item.name} down`}
                  disabled={index === items.length - 1}
                  onClick={() => setItems((current) => moveItem(current, index, index + 1))}
                >
                  ↓
                </button>
                <button
                  type="button"
                  aria-label={`Remove ${item.name}`}
                  onClick={() => setItems((current) => removeAt(current, index))}
                >
                  ×
                </button>
              </span>
            </DragDropPanel>
          </div>
        ))}

        {items.length === 0 && (
          <DroppablePanel
            dragGroup={dragGroup}
            onDrop={() => setItems([make(`New ${noun}`)])}
            className="empty"
          >
            Drop a {noun} here
          </DroppablePanel>
        )}
      </div>
    </section>
  );
}
