import { useCallback, useEffect, useRef, useState } from "react";
import type { SavedPattern } from "../types/SavedPattern";
import { patternsChangedEvent, readPattern, saveProgress } from "../helpers/pattern-storage";
import { recordProgress } from "../projects/timing/log";

/** How many changes Undo can step back through. */
const undoLimit = 100;

/**
 * A saved hat, its progress, and a way to move it.
 *
 * Progress is written straight to storage on every change, because the thing
 * that actually happens to a knitting app is that the phone locks mid-round,
 * and every change goes into the hat's knitting-time log too (see
 * projects/timing). Undo steps back through every change made in this visit,
 * and lives only in memory: it is for a run tapped twice or a jump to the
 * wrong stitch, not a record of the hat.
 */
export const useSavedPattern = (patternId: string | undefined) => {
  const [pattern, setPattern] = useState<SavedPattern | undefined>(() => readPattern(patternId));
  const current = useRef(pattern);
  const adopt = useCallback((next: SavedPattern | undefined) => {
    current.current = next;
    setPattern(next);
  }, []);
  /** Where progress was before each change, most recent last. */
  const [history, setHistory] = useState<number[]>([]);

  useEffect(() => {
    adopt(readPattern(patternId));
    setHistory([]);
    // Written here, or in another tab: read again, and forget the undo if it was another tab's.
    const refresh = () => adopt(readPattern(patternId));
    const fromElsewhere = (event: StorageEvent) => {
      if (event.key !== null && patternId && !event.key.endsWith(patternId)) return;
      refresh();
      setHistory([]);
    };
    window.addEventListener(patternsChangedEvent, refresh);
    window.addEventListener("storage", fromElsewhere);
    return () => {
      window.removeEventListener(patternsChangedEvent, refresh);
      window.removeEventListener("storage", fromElsewhere);
    };
  }, [patternId, adopt]);

  /** Move progress, and write the change into the knitting-time log once it is saved. */
  const moveTo = useCallback(
    (next: number, undo = false): boolean => {
      const now = current.current;
      if (!now || next === now.progress) return false;
      const { result, pattern: moved } = saveProgress(now, next);
      if (!result.ok || moved.progress === now.progress) return false;
      adopt(moved);
      recordProgress(now.id, now.progress, moved.progress, undo);
      return true;
    },
    [adopt],
  );

  const setProgress = useCallback(
    (next: number) => {
      const from = current.current?.progress;
      if (from !== undefined && moveTo(Math.max(next, 0))) {
        setHistory((past) => [...past.slice(-(undoLimit - 1)), from]);
      }
    },
    [moveTo],
  );

  const undo = useCallback(() => {
    const previous = history.at(-1);
    if (previous === undefined) return;
    moveTo(previous, true);
    setHistory((past) => past.slice(0, -1));
  }, [history, moveTo]);

  return { pattern, setProgress, undo, canUndo: history.length > 0 };
};
