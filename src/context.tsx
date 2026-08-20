import { createContext, useContext, useMemo, useReducer } from "react";
import type { Context, ReactNode } from "react";

import type { DropInformation } from "./types.js";

/** What is happening right now, for anything that needs to react to it. */
export interface DragDropState {
  /**
   * Whether drags are allowed to start at all. Lower it while a row is being
   * edited, so that selecting text in an input does not tear the row out of
   * the list.
   */
  dragAllowed: boolean;
  /**
   * The drag in flight, or `null`. This is the value that makes `dragover`
   * work: the specification hides the payload during that phase, so the group
   * has to be remembered somewhere the event cannot reach.
   */
  active: DropInformation | null;
}

/** Ways to change it. Stable across renders, so they are safe in deps. */
export interface DragDropActions {
  setDragAllowed(allowed: boolean): void;
  beginDrag(info: DropInformation): void;
  endDrag(): void;
}

type DragDropEvent =
  | { type: "setDragAllowed"; allowed: boolean }
  | { type: "beginDrag"; info: DropInformation }
  | { type: "endDrag" };

function reducer(state: DragDropState, event: DragDropEvent): DragDropState {
  switch (event.type) {
    case "setDragAllowed":
      return state.dragAllowed === event.allowed ? state : { ...state, dragAllowed: event.allowed };
    case "beginDrag":
      return { ...state, active: event.info };
    case "endDrag":
      // Unconditional, and it runs on `dragend` as well as on `drop`. A drag
      // abandoned with Escape still fires `dragend`, and leaving `active` set
      // after one would let a later, unrelated `dragover` match against a group
      // nobody is dragging any more.
      return state.active === null ? state : { ...state, active: null };
  }
}

const StateContext = createContext<DragDropState | null>(null);
const ActionsContext = createContext<DragDropActions | null>(null);

function useRequiredContext<T>(context: Context<T | null>, hook: string): T {
  const value = useContext(context);
  if (value === null) {
    throw new Error(`${hook} must be used inside a <DragDropProvider>.`);
  }
  return value;
}

/** Reads the current drag state. */
export function useDragDropInfo(): DragDropState {
  return useRequiredContext(StateContext, "useDragDropInfo");
}

/** Reads the drag actions. The returned object is referentially stable. */
export function useDragActions(): DragDropActions {
  return useRequiredContext(ActionsContext, "useDragActions");
}

export interface DragDropProviderProps {
  children: ReactNode;
  /** Whether drags may start initially. Defaults to `true`. */
  initialDragAllowed?: boolean | undefined;
}

/**
 * Scopes a drag session.
 *
 * One provider can cover any number of groups — a group is declared per item,
 * not per provider — so a palette outside every list can still start a drag
 * that one specific list accepts.
 *
 * Nesting providers is legal and gives genuinely separate sessions, which is
 * the thing a module-level variable could never do.
 */
export function DragDropProvider({
  children,
  initialDragAllowed = true,
}: DragDropProviderProps): ReactNode {
  const [state, dispatch] = useReducer(reducer, {
    dragAllowed: initialDragAllowed,
    active: null,
  });

  const actions = useMemo<DragDropActions>(
    () => ({
      setDragAllowed: (allowed) => dispatch({ type: "setDragAllowed", allowed }),
      beginDrag: (info) => dispatch({ type: "beginDrag", info }),
      endDrag: () => dispatch({ type: "endDrag" }),
    }),
    [],
  );

  return (
    <StateContext.Provider value={state}>
      <ActionsContext.Provider value={actions}>{children}</ActionsContext.Provider>
    </StateContext.Provider>
  );
}
