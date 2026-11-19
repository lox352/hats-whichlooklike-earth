import { listPatterns, restorePattern, storageKeyFor } from "./pattern-storage";
import { isLog, readLog, writeLog, type Row } from "../projects/timing/log";

/**
 * Every hat saved in this browser, and the time each took, as one file: to
 * move them to another device, or keep them if the browser's data is cleared.
 * Taken from Sweat Shop's backups, which keep its jumpers the same way.
 *
 * A hat is its stitches, which are worked out once on the device that made it
 * and never again, so a backup carries them whole; it is large, a megabyte or
 * so a hat, but it is the hat.
 */

const format = "hats-which-look-like-earth";
/** Room for a good many hats, each a megabyte or so. */
export const maxBackupBytes = 60_000_000;

export interface BackupPattern {
  /** The pattern as stored. */
  pattern: Record<string, unknown>;
  timeLog?: Row[];
}

export const backupText = (): string =>
  JSON.stringify({
    format,
    version: 1,
    exportedAt: new Date().toISOString(),
    patterns: listPatterns().map((pattern): BackupPattern => {
      const timeLog = readLog(pattern.id);
      return { pattern: { ...pattern }, ...(timeLog.length > 0 ? { timeLog } : {}) };
    }),
  });

export const downloadBackup = () => {
  const blob = new Blob([backupText()], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `hats-backup-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 0);
};

export const parseBackup = (text: string): BackupPattern[] => {
  if (text.length > maxBackupBytes) throw new Error("That backup is too large.");
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error("That file is not a backup of these hats.");
  }
  const backup = data as { format?: unknown; version?: unknown; patterns?: unknown };
  if (backup?.format !== format || backup.version !== 1 || !Array.isArray(backup.patterns) || backup.patterns.length > 500) {
    throw new Error("That file is not a backup of these hats.");
  }
  return backup.patterns.map((entry: unknown) => {
    const one = entry as BackupPattern;
    if (!one || typeof one.pattern !== "object" || one.pattern === null) throw new Error("A hat in that backup could not be read.");
    if (one.timeLog !== undefined && !isLog(one.timeLog)) throw new Error("A hat's knitting times in that backup could not be read.");
    return one;
  });
};

/** Each hat added as a copy beside those already here, with its time; how many could be. */
export const restoreBackup = (patterns: BackupPattern[]): number => {
  const start = Date.now();
  let restored = 0;
  patterns.forEach((one, at) => {
    const saved = restorePattern(one.pattern, start + at);
    if (!saved) return;
    restored++;
    if (one.timeLog) writeLog(storageKeyFor(saved.id), one.timeLog);
  });
  return restored;
};
