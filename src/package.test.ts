import { readdirSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";

import * as api from "./index.js";
import * as arrayApi from "./array.js";

// Paths come from the working directory, not from `import.meta.url`: under the
// jsdom environment that URL has an http: scheme and cannot be read as a file.
const projectRoot = resolve(process.cwd());
const sourceDirectory = join(projectRoot, "src");

const packageJson = JSON.parse(readFileSync(join(projectRoot, "package.json"), "utf8")) as {
  name?: string;
  dependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
};

/** Every shipped source file, excluding the tests that check them. */
function sourceFiles(): { name: string; text: string }[] {
  return readdirSync(sourceDirectory)
    .filter((name) => /\.tsx?$/.test(name) && !/\.test\.tsx?$/.test(name))
    .map((name) => ({ name, text: readFileSync(join(sourceDirectory, name), "utf8") }));
}

describe("public surface", () => {
  it("exports exactly the documented runtime values", () => {
    expect(new Set(Object.keys(api))).toEqual(
      new Set([
        "DND_MIME_TYPE",
        "DragDropPanel",
        "DragDropProvider",
        "DragHandleIcon",
        "DraggableButton",
        "DropIndicator",
        "DroppablePanel",
        "acceptsDrag",
        "dragOver",
        "drop",
        "readDropInformation",
        "startDrag",
        "useDragActions",
        "useDragDropInfo",
        "useSortableList",
      ]),
    );
  });

  it("keeps the array helpers on their own React-free subpath", () => {
    expect(new Set(Object.keys(arrayApi))).toEqual(new Set(["insertAt", "moveItem", "removeAt"]));
  });
});

describe("packaging constraints", () => {
  it("has no runtime dependencies", () => {
    // An icon library for one glyph is exactly how both of the codebases this
    // came from ended up depending on a data grid.
    expect(packageJson.dependencies ?? {}).toEqual({});
  });

  it("takes React as a peer dependency and nothing else", () => {
    expect(Object.keys(packageJson.peerDependencies ?? {})).toEqual(["react"]);
  });

  it("keeps React out of the array subpath", () => {
    // Checked by reading the source rather than the bundle: the whole promise
    // of this subpath is that a server-side reducer can import it.
    const text = readFileSync(join(sourceDirectory, "array.ts"), "utf8");
    expect(text).not.toMatch(/from ["']react["']/);
  });
});

describe("genericity", () => {
  it("is actually reading the shipped sources", () => {
    // Without this, a wrong path would make every check below pass by finding
    // nothing at all -- the worst kind of green.
    const names = sourceFiles().map((file) => file.name);
    expect(names).toContain("engine.ts");
    expect(names).toContain("drag-drop-panel.tsx");
    expect(names).not.toContain("package.test.ts");
  });

  it.each([
    ["product names", /whippedup|summersolt/i],
    ["organisation names", /\beetr\b/i],
    ["icon libraries", /@mui|heroicons|react-icons/i],
    ["CSS framework directives", /@apply/],
    ["hard-coded utility classes", /className=["'][^"'{]*\b(?:flex-1|w-full|bg-slate)/],
  ])("contains no %s", (_label, pattern) => {
    // This library is for anyone reordering a list in React. Anything that only
    // makes sense inside one application belongs in that application.
    const offenders = sourceFiles()
      .filter((file) => pattern.test(file.text))
      .map((file) => file.name);
    expect(offenders).toEqual([]);
  });
});
