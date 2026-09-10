import React, { useState } from "react";
import { DecreaseMethod } from "../types/KnittingMachine";
import {
  bodyHeightFor,
  circumferenceFor,
  defaultBodyHeight,
  defaultHeadCircumference,
  Gauge,
  headFittedBy,
  isValidGauge,
  rowsFor,
  stitchesPerRowFor,
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
 * Works out a stitch count from measurements of a head and of your knitting.
 *
 * These are two different kinds of number and they used to sit in one
 * undifferentiated row, which made it unclear which described the hat you want
 * and which described your yarn. They are now separated and each says what to
 * measure.
 *
 * The stitch count remains the real input the pattern is built from; this only
 * means it can be arrived at from a measurement rather than guessed. The
 * rounding is reported rather than hidden, because a pyramidal crown forces the
 * count to a multiple of ten and that can move the finished size by a
 * centimetre or two.
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
  const [bodyHeight, setBodyHeight] = useState(defaultBodyHeight);

  const gaugeUsable = isValidGauge(gauge);

  const updateGauge = (changes: Partial<Gauge>) => {
    const next = { ...gauge, ...changes };
    setGauge(next);
    if (isValidGauge(next)) writeGauge(next);
  };

  const apply = () => {
    if (!gaugeUsable) return;
    onSize(
      stitchesPerRowFor(headCircumference, gauge, decreaseMethod),
      rowsFor(bodyHeight, gauge)
    );
  };

  const finishedCircumference = gaugeUsable
    ? round1(circumferenceFor(stitchesPerRow, gauge))
    : null;
  const fitsHead = gaugeUsable ? round1(headFittedBy(stitchesPerRow, gauge)) : null;
  const finishedHeight = gaugeUsable
    ? round1(bodyHeightFor(numberOfRows, gauge))
    : null;

  return (
    <div className="design-card">
      <h3 className="design-card-title">Work out the stitches</h3>

      <div className="size-group">
        <h4 className="size-group-title">The hat you want</h4>
        <p className="size-group-note">
          Measure the head all the way round, above the ears and across the
          widest part of the forehead. The height is the straight part of the
          hat, from the edge of the brim up to where the crown starts
          decreasing.
        </p>
        <div className="design-row">
          <NumberField
            label="Head, around (cm)"
            value={headCircumference}
            onChange={setHeadCircumference}
            min={20}
            max={80}
            step={0.5}
            width="7rem"
          />
          <NumberField
            label="Hat height (cm)"
            value={bodyHeight}
            onChange={setBodyHeight}
            min={1}
            max={60}
            step={0.5}
            width="7rem"
          />
        </div>
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
            width="7rem"
            invalid={!(gauge.stitchesPer10cm > 0)}
          />
          <NumberField
            label="Rows per 10cm"
            value={gauge.rowsPer10cm}
            onChange={(rowsPer10cm) => updateGauge({ rowsPer10cm })}
            min={1}
            max={90}
            step={0.5}
            width="7rem"
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
            {stitchesPerRow} stitches and {numberOfRows} rows makes a hat about{" "}
            <strong>{finishedCircumference}cm</strong> around and{" "}
            <strong>{finishedHeight}cm</strong> tall before the crown, which
            fits a head of roughly <strong>{fitsHead}cm</strong>.
          </>
        ) : (
          "Enter your gauge above to see what size this makes."
        )}
      </p>
    </div>
  );
};

export default SizeCalculator;
