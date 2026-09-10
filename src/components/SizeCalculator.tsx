import React, { useState } from "react";
import { DecreaseMethod } from "../types/KnittingMachine";
import {
  bodyRowsForHeight,
  circumferenceFor,
  crownRowsFor,
  defaultHeadCircumference,
  defaultOverTheTop,
  Gauge,
  hatHeightFromArc,
  headFittedBy,
  negativeEase,
  isValidGauge,
  stitchesPerRowFor,
  totalHeightFor,
  totalRowsFor,
} from "../helpers/sizing";
import { writeGauge } from "../helpers/gauge-preference";
import Button from "./ui/Button";
import NumberField from "./ui/NumberField";

interface SizeCalculatorProps {
  gauge: Gauge;
  setGauge: (gauge: Gauge) => void;
  stitchesPerRow: number;
  numberOfRows: number;
  decreaseMethod: DecreaseMethod;
  onSize: (stitchesPerRow: number, numberOfRows: number) => void;
}

const round1 = (value: number) => Math.round(value * 10) / 10;

/**
 * Works out a stitch count and a row count from measurements of a head and of
 * your knitting.
 *
 * Both measurements are things you can take on a person. The height one is the
 * tape run from where you want the hat's edge to sit by one ear, over the
 * crown, to the same point on the other side; half of that is the finished
 * height of the hat, which is how a beanie is normally specified. It used to
 * ask for the height of the straight section before the crown, which is a
 * property of the pattern rather than of anyone's head, and left the crown's
 * own height unaccounted for.
 *
 * The stitch count remains the real input the pattern is built from; this only
 * means it can be arrived at from a measurement rather than guessed.
 */
const SizeCalculator: React.FC<SizeCalculatorProps> = ({
  gauge,
  setGauge,
  stitchesPerRow,
  numberOfRows,
  decreaseMethod,
  onSize,
}) => {
  const [headCircumference, setHeadCircumference] = useState(
    defaultHeadCircumference
  );
  const [overTheTop, setOverTheTop] = useState(defaultOverTheTop);

  const gaugeUsable = isValidGauge(gauge);

  const updateGauge = (changes: Partial<Gauge>) => {
    const next = { ...gauge, ...changes };
    setGauge(next);
    if (isValidGauge(next)) writeGauge(next);
  };

  const apply = () => {
    if (!gaugeUsable) return;
    const stitches = stitchesPerRowFor(
      headCircumference,
      gauge,
      decreaseMethod
    );
    onSize(
      stitches,
      bodyRowsForHeight(
        hatHeightFromArc(overTheTop),
        stitches,
        gauge,
        decreaseMethod
      )
    );
  };

  const finishedCircumference = gaugeUsable
    ? round1(circumferenceFor(stitchesPerRow, gauge))
    : null;
  const fitsHead = gaugeUsable
    ? round1(headFittedBy(stitchesPerRow, gauge))
    : null;

  const finishedHeight = gaugeUsable
    ? round1(totalHeightFor(stitchesPerRow, numberOfRows, gauge, decreaseMethod))
    : null;
  const crownRows = crownRowsFor(stitchesPerRow, decreaseMethod);
  const totalRows = totalRowsFor(stitchesPerRow, numberOfRows, decreaseMethod);

  /*
   * The ease, as a percentage, worked out from the constant rather than
   * written into the sentence.
   *
   * Without it the summary read as a contradiction: ask for a 57cm head and
   * it answers "a hat 52.2cm around", with nothing to say why those are the
   * same hat.
   */
  const easePercentage = Math.round((1 - negativeEase) * 100);

  return (
    <div className="design-card">
      <h3 className="design-card-title">Work out the stitches</h3>

      <div className="size-group">
        <h4 className="size-group-title">The head it is for</h4>
        <p className="size-group-note">
          Round the head, above the ears and across the widest part of the
          forehead. Then from where you want the hat&rsquo;s edge to sit by one
          ear, up over the crown, and down to the same point on the other side.
        </p>
        <div className="design-row">
          <NumberField
            label="Around the head (cm)"
            value={headCircumference}
            onChange={setHeadCircumference}
            min={20}
            max={80}
            step={0.5}
            width="8rem"
          />
          <NumberField
            label="Ear to ear, over the top (cm)"
            value={overTheTop}
            onChange={setOverTheTop}
            min={10}
            max={100}
            step={0.5}
            width="8rem"
          />
        </div>
        <p className="design-hint">
          That makes a hat{" "}
          <strong>{round1(hatHeightFromArc(overTheTop))}cm</strong> tall, brim
          edge to crown.
        </p>
      </div>

      <div className="size-group">
        <h4 className="size-group-title">Your knitting</h4>
        <p className="size-group-note">
          Knit a swatch in the round in stocking stitch, then count across 10cm
          and up 10cm. This is remembered for next time, since it belongs to
          your yarn and needles rather than to any one hat.
        </p>
        <div className="design-row">
          <NumberField
            label="Stitches per 10cm"
            value={gauge.stitchesPer10cm}
            onChange={(stitchesPer10cm) => updateGauge({ stitchesPer10cm })}
            min={1}
            max={80}
            step={0.5}
            width="8rem"
            invalid={!(gauge.stitchesPer10cm > 0)}
          />
          <NumberField
            label="Rows per 10cm"
            value={gauge.rowsPer10cm}
            onChange={(rowsPer10cm) => updateGauge({ rowsPer10cm })}
            min={1}
            max={90}
            step={0.5}
            width="8rem"
            invalid={!(gauge.rowsPer10cm > 0)}
          />
        </div>
      </div>

      <div style={{ marginTop: "4px" }}>
        <Button variant="secondary" onClick={apply} disabled={!gaugeUsable}>
          Work out my stitches
        </Button>
      </div>

      <p aria-live="polite" className="design-summary">
        {gaugeUsable ? (
          <>
            {stitchesPerRow} stitches and {numberOfRows} rows of body makes a
            hat <strong>{finishedCircumference}cm</strong> around unstretched
            and <strong>{finishedHeight}cm</strong> tall. Knitting it{" "}
            {easePercentage}% smaller than the head is what makes it grip, so
            it fits a head of roughly <strong>{fitsHead}cm</strong>. The crown
            adds {crownRows} rows on top of the body, {totalRows} in all.
          </>
        ) : (
          "Enter your gauge above to see what size this makes."
        )}
      </p>
    </div>
  );
};

export default SizeCalculator;
