import React, { useState } from "react";
import { Stitch } from "../types/Stitch";
import { downloadChartPng, downloadChartSvg } from "../helpers/chart-export";
import { useYarns } from "../useYarns";

interface ChartActionsProps {
  stitches: Stitch[];
  /** Used as the download filename. */
  name: string;
}

const linkStyle: React.CSSProperties = {
  background: "none",
  border: "none",
  padding: 0,
  color: "#9fb6ff",
  cursor: "pointer",
  font: "inherit",
  fontSize: "0.9rem",
  textDecoration: "underline",
};

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
        marginTop: "10px",
      }}
    >
      <button type="button" style={linkStyle} onClick={() => window.print()}>
        Print chart
      </button>
      <button
        type="button"
        style={linkStyle}
        onClick={withReporting(() =>
          downloadChartSvg(stitches, safeFilename(name), yarns)
        )}
      >
        Download SVG
      </button>
      <button
        type="button"
        style={linkStyle}
        onClick={withReporting(() =>
          downloadChartPng(stitches, safeFilename(name), yarns)
        )}
      >
        Download PNG
      </button>
      {problem && (
        <span role="alert" style={{ fontSize: "0.9rem", color: "#ff9a91" }}>
          {problem}
        </span>
      )}
    </div>
  );
};

export default ChartActions;
