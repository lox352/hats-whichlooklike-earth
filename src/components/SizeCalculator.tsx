import React, { useState } from "react";
import { DecreaseMethod } from "../types/KnittingMachine";
import {
  bodyHeightFor,
  circumferenceFor,
  defaultHeadCircumference,
  Gauge,
  headFittedBy,
  isValidGauge,
  rowsFor,
  stitchesPerRowFor,
} from "../helpers/sizing";
import { writeGauge } from "../helpers/gauge-preference";
import Button from "./ui/Button";

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
 * Works out a stitch count from a head measurement and a gauge.
 *
 * The stitch count stays the real input the pattern is built from; this just
 * means it can be arrived at from a measurement rather than guessed. The
 * rounding is not hidden: the summary says what the hat will actually measure,
 * because a pyramidal crown forces the count to a multiple of ten and that can
 * move the finished size by a centimetre or two.
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
  const [bodyHeight, setBodyHeight] = useState(() =>
    round1(bodyHeightFor(numberOfRows, gauge))
  );

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
  const fitsHead = gaugeUsable
    ? round1(headFittedBy(stitchesPerRow, gauge))
    : null;
  const finishedHeight = gaugeUsable
    ? round1(bodyHeightFor(numberOfRows, gauge))
    : null;

  return (
    <div className="design-card">
      <h3 className="design-card-title">Size it for a head</h3>
      <p className="design-card-note">
        Your gauge is remembered for next time. Measure it over 10cm of knitted
        fabric in the round.
      </p>

      <div className="design-row">
        <label>
          <span className="design-field-label">Head (cm)</span>
          <input
            type="number"
            min="20"
            max="80"
            step="0.5"
            value={headCircumference}
            onChange={(e) => setHeadCircumference(Number(e.target.value))}
            style={{ width: "6rem" }}
          />
        </label>
        <label>
          <span className="design-field-label">Height (cm)</span>
          <input
            type="number"
            min="1"
            max="60"
            step="0.5"
            value={bodyHeight}
            onChange={(e) => setBodyHeight(Number(e.target.value))}
            style={{ width: "6rem" }}
          />
        </label>
        <label>
          <span className="design-field-label">Sts / 10cm</span>
          <input
            type="number"
            min="1"
            max="80"
            step="0.5"
            value={gauge.stitchesPer10cm || ""}
            onChange={(e) =>
              updateGauge({ stitchesPer10cm: Number(e.target.value) })
            }
            style={{ width: "6rem" }}
          />
        </label>
        <label>
          <span className="design-field-label">Rows / 10cm</span>
          <input
            type="number"
            min="1"
            max="90"
            step="0.5"
            value={gauge.rowsPer10cm || ""}
            onChange={(e) =>
              updateGauge({ rowsPer10cm: Number(e.target.value) })
            }
            style={{ width: "6rem" }}
          />
        </label>
      </div>

      <div style={{ marginTop: "14px" }}>
        <Button variant="secondary" onClick={apply} disabled={!gaugeUsable}>
          Work out my stitches
        </Button>
      </div>

      <p aria-live="polite" className="design-summary">
        {gaugeUsable ? (
          <>
            {stitchesPerRow} stitches and {numberOfRows} rows makes a hat about{" "}
            <strong>{finishedCircumference}cm</strong> around and{" "}
            <strong>{finishedHeight}cm</strong> tall before the crown, fitting a
            head of roughly <strong>{fitsHead}cm</strong>.
          </>
        ) : (
          "Enter a gauge above to see what size this makes."
        )}
      </p>
    </div>
  );
};

export default SizeCalculator;
