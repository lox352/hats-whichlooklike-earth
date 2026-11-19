import type { StitchKeyId, StitchNote } from "../pattern/design";

/**
 * What a hat says about its stitches, where the key's own words are a
 * sweater's: the cast-on is the brim, not the neck, and the decreases are
 * the crown's.
 */
export const hatStitchNotes: Partial<Record<StitchKeyId, StitchNote>> = {
  castOn: {
    how:
      "The brim is cast on with the long-tail method, along the bottom of the " +
      "chart, each stitch in the yarn it shows: stretchy enough to go over a " +
      "head, and firm enough to hold the brim's shape.",
    steps: [
      "Measure the tail: wrap the yarn ten times round the needle, and allow that much for every ten stitches to cast on, and 20cm more to weave in.",
      "Make a slip knot there and put it on the needle. It is the first stitch.",
      "Hold the needle in your right hand, the tail over your left thumb and the yarn from the ball over your left forefinger, both ends held in your palm.",
      "Take the needle up through the loop round your thumb, over and round the strand on your forefinger, and back down through the thumb loop.",
      "Let the thumb loop go and spread thumb and finger to snug the new stitch up on the needle - snug, not tight. Repeat until all are on.",
      "Where the chart changes yarn along the bottom row, change the yarn over your forefinger and keep the tail, so the brim's colours start where they should.",
    ],
  },
  k2tog: {
    note: "The crown's decreases: they draw the top of the hat in.",
  },
  s2kp: {
    note: "The crown's decreases: they draw the top of the hat in, three stitches at a time.",
  },
};

/** What to do once the last stitch is knitted. */
export const hatFinishing =
  "Break the yarn, leaving a tail of 20cm. Thread it through the stitches " +
  "left on the needles, slip them off and pull it tight to close the crown, " +
  "then take it through to the inside and fasten off. Weave in the ends, " +
  "and block the hat over a bowl or a balloon so the picture settles.";
