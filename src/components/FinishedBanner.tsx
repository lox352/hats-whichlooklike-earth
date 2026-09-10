import React from "react";
import "./FinishedBanner.css";

interface FinishedBannerProps {
  /** Total knittable stitches in the hat. */
  stitches: number;
}

/**
 * Shown when a pattern reaches its last stitch.
 *
 * Finishing several thousand stitches of colourwork deserves more than the
 * percentage quietly reading 100. It names the number, because that is the
 * part worth being told.
 */
const FinishedBanner: React.FC<FinishedBannerProps> = ({ stitches }) => (
  <div className="finished" role="status">
    <h2 className="finished-title">You knitted the whole planet.</h2>
    <p className="finished-text">
      {stitches.toLocaleString()} stitches, every one the colour of whatever it
      landed on.
    </p>
  </div>
);

export default FinishedBanner;
