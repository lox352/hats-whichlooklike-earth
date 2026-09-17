import React, { useMemo, useState } from "react";
import { Stitch } from "../types/Stitch";
import { regionCounts } from "../helpers/region-guide";
import Button from "./ui/Button";

interface RegionIndexProps {
  stitches: Stitch[];
}

/**
 * Everywhere this hat is a picture of, collapsed by default.
 *
 * A hat centred on one place still crosses a surprising number of others, and
 * the list is the quickest way to see what you have got before casting on -
 * whether the coast you wanted is on it at all. In name order, because a
 * stitch count is not a measure of a place here: below its equator the hat is
 * a cylinder, which gives the far south far more stitches than its share of
 * the globe.
 *
 * Nothing at all for a hat charted before stitches were labelled.
 */
const RegionIndex: React.FC<RegionIndexProps> = ({ stitches }) => {
  const [open, setOpen] = useState(false);
  const counts = useMemo(() => regionCounts(stitches), [stitches]);

  if (counts.length === 0) return null;

  return (
    <div className="screen-only">
      <Button
        variant="quiet"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
      >
        {open ? "Hide the places" : `Places on this hat (${counts.length})`}
      </Button>

      {open && (
        <p className="region-index">
          {counts.map((count, index) => (
            <React.Fragment key={count.key}>
              {index > 0 && <span aria-hidden="true"> · </span>}
              <span className="region-index-name">{count.name}</span>
            </React.Fragment>
          ))}
        </p>
      )}
    </div>
  );
};

export default RegionIndex;
