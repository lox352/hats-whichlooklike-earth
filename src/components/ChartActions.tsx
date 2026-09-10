import React, { useState } from "react";
import { Stitch } from "../types/Stitch";
import { downloadChartPng, downloadChartSvg } from "../helpers/chart-export";
import { useYarns } from "../useYarns";
import Button from "./ui/Button";

interface ChartActionsProps {
  stitches: Stitch[];
  /** Used as the download filename. */
  name: string;
}

const safeFilename = (name: string) =>
  name
    .trim()
    .replace(/[^a-z0-9\-_ ]/gi, "")
    .replace(/\s+/g, "-")
    .toLowerCase() || "hat-pattern";

/** Print the chart, or take it away as a file. */
const ChartActions: React.FC<ChartActionsProps> = ({ stitches, name }) => {
  const { yarns } = useYarns();
  const [problem, setProblem] = useState<string | null>(null);

  const withReporting = (action: () => void | Promise<void>) => async () => {
    setProblem(null);
    try {
      await action();
    } catch {
      setProblem("Could not produce that file. Try printing instead.");
    }
  };

  return (
    <div
      className="screen-only"
      style={{
        display: "flex",
        gap: "16px",
        alignItems: "center",
        flexWrap: "wrap",
      }}
    >
      <Button variant="quiet" onClick={() => window.print()}>
        Print
      </Button>
      <Button
        variant="quiet"
        onClick={withReporting(() =>
          downloadChartSvg(stitches, safeFilename(name), yarns)
        )}
      >
        Download SVG
      </Button>
      <Button
        variant="quiet"
        onClick={withReporting(() =>
          downloadChartPng(stitches, safeFilename(name), yarns)
        )}
      >
        Download PNG
      </Button>
      {problem && (
        <span
          role="alert"
          style={{ fontSize: "var(--text-sm)", color: "var(--danger)" }}
        >
          {problem}
        </span>
      )}
    </div>
  );
};

export default ChartActions;
