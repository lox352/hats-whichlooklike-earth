import React, { useMemo, useState } from "react";
import { Stitch } from "../types/Stitch";
import { instructionsToText, writtenInstructions } from "../helpers/written-instructions";
import { useYarns } from "../useYarns";
import { paletteFrom } from "../knitting/yarns";
import { yarnFor } from "../reading/palette";
import Button from "./ui/Button";
import "./WrittenInstructions.css";

interface WrittenInstructionsProps {
  stitches: Stitch[];
}

/**
 * The pattern in words, collapsed by default.
 *
 * The chart is the better instrument for colourwork: it shows the picture,
 * which prose cannot, and most people will never open this. It is here for
 * working from a screen reader, or for checking a round's stitch count
 * without counting squares, so it is offered quietly rather than given equal
 * billing.
 */
const WrittenInstructions: React.FC<WrittenInstructionsProps> = ({ stitches }) => {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const { yarns } = useYarns();
  const palette = useMemo(() => paletteFrom(yarns, new Set()), [yarns]);
  const nameOf = useMemo(() => (slot: string) => yarnFor(palette, slot).name, [palette]);
  const rounds = useMemo(() => (open ? writtenInstructions(stitches) : []), [open, stitches]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(instructionsToText(stitches, nameOf));
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
        <div className="written">
          <p className="written-note">
            Round 1 is the cast-on. Each round is read as you knit it, from its
            first stitch. The chart is easier to follow for the picture; this is
            here for counting and for screen readers.
          </p>
          <Button variant="quiet" onClick={copy}>
            Copy every round
          </Button>
          <span aria-live="polite" className="written-note">
            {copied && " Copied."}
          </span>
          <ol className="written-rounds">
            {rounds.map((round) => (
              <li key={round.round}>
                <span className="written-round">
                  Round {round.round} <span className="quiet">({round.stitches} sts)</span>
                </span>
                <span>
                  {round.segments.map((segment, position) => (
                    <span key={position} className="written-part">
                      {position > 0 && ", "}
                      <span
                        aria-hidden="true"
                        className="written-swatch"
                        style={{ backgroundColor: yarnFor(palette, segment.slot).hex }}
                      />
                      {position === 0 ? segment.text : segment.text.charAt(0).toLowerCase() + segment.text.slice(1)} in{" "}
                      {nameOf(segment.slot)}
                    </span>
                  ))}
                  {round.joinAfter && <span className="written-part">, then join in the round</span>}
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
