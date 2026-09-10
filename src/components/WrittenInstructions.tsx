import React, { useMemo, useState } from "react";
import { Stitch } from "../types/Stitch";
import { RGB } from "../types/RGB";
import {
  instructionsToText,
  writtenInstructions,
} from "../helpers/written-instructions";
import { useYarns } from "../useYarns";
import { cssColour, displayYarn } from "../helpers/yarn-preference";
import Button from "./ui/Button";

interface WrittenInstructionsProps {
  stitches: Stitch[];
}

/**
 * The pattern in words, collapsed by default.
 *
 * The chart is the better instrument for colourwork: it shows the picture,
 * which prose cannot, and most people will never open this. It is here for
 * working from a screen reader, or for checking a row's stitch count without
 * counting squares, so it is offered quietly rather than given equal billing.
 */
const WrittenInstructions: React.FC<WrittenInstructionsProps> = ({
  stitches,
}) => {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const { yarns } = useYarns();

  const nameOf = useMemo(
    () => (colour: RGB) => displayYarn(colour, yarns).name,
    [yarns]
  );

  const rows = useMemo(
    () => (open ? writtenInstructions(stitches) : []),
    [open, stitches]
  );

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(
        instructionsToText(stitches, nameOf)
      );
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className="screen-only">
      <Button variant="quiet" aria-expanded={open} onClick={() => setOpen(!open)}>
        {open ? "Hide written instructions" : "Written instructions"}
      </Button>

      {open && (
        <div style={{ marginTop: "10px", maxWidth: "760px" }}>
          <p style={{ fontSize: "var(--text-sm)", color: "var(--ink-faint)", margin: "0 0 10px" }}>
            Row 1 is the cast-on. Each row is read as you knit it, right to
            left. The chart is easier to follow for the picture; this is here
            for counting and for screen readers.
          </p>
          <Button variant="quiet" onClick={copy}>
            Copy all rows
          </Button>
          <span aria-live="polite" style={{ fontSize: "var(--text-sm)", color: "var(--ink-faint)" }}>
            {copied && "Copied."}
          </span>
          <ol
            style={{
              listStyle: "none",
              padding: 0,
              margin: "12px 0 0",
              maxHeight: "420px",
              overflowY: "auto",
              border: "1px solid var(--paper-edge)",
              borderRadius: "6px",
            }}
          >
            {rows.map((row) => (
              <li
                key={row.row}
                style={{
                  padding: "8px 12px",
                  borderBottom: "1px solid var(--rule)",
                  fontSize: "0.92rem",
                  display: "flex",
                  gap: "10px",
                  alignItems: "baseline",
                  flexWrap: "wrap",
                }}
              >
                <span
                  style={{
                    minWidth: "104px",
                    opacity: 0.6,
                    fontVariantNumeric: "tabular-nums",
                  }}
                >
                  Row {row.row} ({row.stitches} sts)
                </span>
                <span>
                  {row.segments.map((segment, position) => (
                    <span key={position} style={{ whiteSpace: "nowrap" }}>
                      {position > 0 && ", "}
                      <span
                        aria-hidden="true"
                        style={{
                          display: "inline-block",
                          width: "9px",
                          height: "9px",
                          borderRadius: "2px",
                          border: "1px solid rgba(255,255,255,0.3)",
                          backgroundColor: cssColour(
                            displayYarn(segment.colour, yarns).colour
                          ),
                          marginRight: "4px",
                        }}
                      />
                      {segment.text} {nameOf(segment.colour)}
                    </span>
                  ))}
                </span>
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
};

export default WrittenInstructions;
