import React from "react";
import type { Stitch as HatStitch } from "../types/Stitch";
import { regionCounts, regionInfo } from "../helpers/region-guide";

/** "France, in Western Europe · 204 stitches of this hat": what a place is, and how much of the hat it has. */
export const PlaceNote: React.FC<{ hat: HatStitch[]; regionKey: string | undefined }> = ({ hat, regionKey }) => {
  const info = regionInfo(regionKey);
  if (!info) return null;
  const count = regionCounts(hat).find((one) => one.key === regionKey)?.stitches;
  return (
    <span className="place-note">
      <strong>{info.name}</strong>
      {info.where && <span>, {info.where}</span>}
      {count !== undefined && (
        <span className="quiet">
          {" "}
          · {count.toLocaleString()} {count === 1 ? "stitch" : "stitches"} of this hat, lit on the chart
        </span>
      )}
    </span>
  );
};

/** Beside the round and the stitch while knitting: the place you are knitting through. */
export const PlaceNow: React.FC<{ regionKey: string | undefined }> = ({ regionKey }) => {
  const info = regionInfo(regionKey);
  if (!info) return null;
  return (
    <>
      <em className="knitting-place">{info.name}</em>
      <span className="quiet">{info.where || "where the next stitch lands"}</span>
    </>
  );
};
