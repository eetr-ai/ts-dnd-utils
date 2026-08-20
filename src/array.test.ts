import { describe, expect, it } from "vitest";

import { insertAt, moveItem, removeAt } from "./array.js";

const letters = ["a", "b", "c", "d"] as const;

describe("moveItem", () => {
  it("moves an item forward", () => {
    expect(moveItem(letters, 0, 2)).toEqual(["b", "c", "a", "d"]);
  });

  it("moves an item backward", () => {
    expect(moveItem(letters, 3, 1)).toEqual(["a", "d", "b", "c"]);
  });

  it("moves an item to the end", () => {
    expect(moveItem(letters, 0, 3)).toEqual(["b", "c", "d", "a"]);
  });

  it("leaves the order alone when the item does not move", () => {
    expect(moveItem(letters, 2, 2)).toEqual(["a", "b", "c", "d"]);
  });

  it("never mutates its input", () => {
    const original = [...letters];
    moveItem(original, 0, 3);
    expect(original).toEqual(["a", "b", "c", "d"]);
  });

  it("returns a copy, not the same array", () => {
    const original = [...letters];
    expect(moveItem(original, 1, 1)).not.toBe(original);
  });

  it.each<[string, number, number]>([
    ["a source below the range", -1, 2],
    ["a source past the end", 9, 0],
    ["a fractional source", 1.5, 0],
    ["a fractional destination", 0, 1.5],
    ["NaN", Number.NaN, 0],
  ])("copies unchanged for %s", (_label, from, to) => {
    // A drop can race a list that changed underneath it. Throwing there would
    // turn a harmless no-op into a crash in someone's drop handler.
    expect(moveItem(letters, from, to)).toEqual(["a", "b", "c", "d"]);
  });

  it("clamps a destination past the end to last", () => {
    // Dropping past the end means "put it last", which is what was gestured at.
    expect(moveItem(letters, 0, 99)).toEqual(["b", "c", "d", "a"]);
  });

  it("clamps a negative destination to first", () => {
    // -1 rather than a larger negative on purpose. splice() reads a negative
    // start as an offset from the end, so -5 against a three-element array
    // clamps to 0 all by itself and would pass with no clamping at all; -1
    // would land the item second-from-last instead of first.
    expect(moveItem(letters, 3, -1)).toEqual(["d", "a", "b", "c"]);
    expect(moveItem(letters, 3, -5)).toEqual(["d", "a", "b", "c"]);
  });

  it("handles an empty list", () => {
    expect(moveItem([], 0, 1)).toEqual([]);
  });

  it("keeps undefined entries, rather than treating them as absent", () => {
    // The implementation must not use "the removed value is undefined" as its
    // failure signal, because undefined is a legitimate element.
    expect(moveItem([undefined, "b"], 0, 1)).toEqual(["b", undefined]);
  });
});

describe("insertAt", () => {
  it("inserts in the middle", () => {
    expect(insertAt(letters, 2, "x")).toEqual(["a", "b", "x", "c", "d"]);
  });

  it("inserts at the front", () => {
    expect(insertAt(letters, 0, "x")).toEqual(["x", "a", "b", "c", "d"]);
  });

  it("appends when the index is past the end", () => {
    expect(insertAt(letters, 99, "x")).toEqual(["a", "b", "c", "d", "x"]);
  });

  it("clamps a negative index to the front", () => {
    expect(insertAt(letters, -3, "x")).toEqual(["x", "a", "b", "c", "d"]);
  });

  it("appends for a non-integer index", () => {
    expect(insertAt(letters, Number.NaN, "x")).toEqual(["a", "b", "c", "d", "x"]);
  });

  it("never mutates its input", () => {
    const original = [...letters];
    insertAt(original, 1, "x");
    expect(original).toEqual(["a", "b", "c", "d"]);
  });
});

describe("removeAt", () => {
  it("removes the item at the index", () => {
    expect(removeAt(letters, 1)).toEqual(["a", "c", "d"]);
  });

  it.each<[string, number]>([
    ["past the end", 9],
    ["negative", -1],
    ["fractional", 1.5],
  ])("copies unchanged for an index that is %s", (_label, index) => {
    expect(removeAt(letters, index)).toEqual(["a", "b", "c", "d"]);
  });

  it("never mutates its input", () => {
    const original = [...letters];
    removeAt(original, 0);
    expect(original).toEqual(["a", "b", "c", "d"]);
  });
});
