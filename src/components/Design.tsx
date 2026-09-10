import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { northPole, southPole } from "../constants";
import DestinationType from "../types/DestinationType";
import { GlobalCoordinates } from "../types/GlobalCoordinates";
import { HatDesign } from "../types/HatDesign";
import {
  DecreaseMethod,
  DesignProblem,
  validateDesign,
} from "../types/KnittingMachine";
import {
  designFromSearchParams,
  designToSearchParams,
} from "../helpers/design-url";
import { Gauge } from "../helpers/sizing";
import { readGauge } from "../helpers/gauge-preference";
import InputField from "./InputField";
import CoordinatesInput from "./CoordinatesInput";
import ToggleAdvancedOptions from "./ToggleAdvancedOptions";
import ShareDesignLink from "./ShareDesignLink";
import PlaceSearch from "./PlaceSearch";
import SizeCalculator from "./SizeCalculator";
import PageLayout from "./ui/PageLayout";
import Button from "./ui/Button";
import "./Design.css";

type LocationType =
  | "North Pole"
  | "South Pole"
  | "Current Location"
  | "Custom Location";

const sameCoordinates = (a: GlobalCoordinates, b: GlobalCoordinates) =>
  Math.abs(a.latitude - b.latitude) < 0.005 &&
  Math.abs(a.longitude - b.longitude) < 0.005;

/** Which preset, if any, the current coordinates correspond to. */
const locationTypeFor = (coordinates: GlobalCoordinates): LocationType => {
  if (sameCoordinates(coordinates, northPole)) return "North Pole";
  if (sameCoordinates(coordinates, southPole)) return "South Pole";
  return "Custom Location";
};

const problemFor = (
  problems: DesignProblem[],
  field: DesignProblem["field"]
) => problems.find((problem) => problem.field === field)?.message;

const Design: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  /*
   * The design is read straight from the URL rather than mirrored into local
   * state. Keeping a copy meant an incoming link was overwritten by whatever
   * had been typed earlier, because the copy was only ever seeded once.
   */
  const design = useMemo(
    () => designFromSearchParams(searchParams),
    [searchParams]
  );
  const params = useMemo(() => designToSearchParams(design), [design]);

  const [locationType, setLocationType] = useState<LocationType>(() =>
    locationTypeFor(design.orientation.coordinates)
  );
  const [showAdvancedOptions, setShowAdvancedOptions] = useState(false);
  const [showProblems, setShowProblems] = useState(false);
  const [gauge, setGauge] = useState<Gauge>(() => readGauge());
  const [placeLabel, setPlaceLabel] = useState<string | null>(null);

  // Fill in a bare /design URL so it is shareable without touching a field
  // first. Replace rather than push, so editing does not fill the back button.
  useEffect(() => {
    if (searchParams.toString() === params.toString()) return;
    setSearchParams(params, { replace: true });
  }, [searchParams, params, setSearchParams]);

  const problems = useMemo(
    () =>
      validateDesign(
        design.stitchesPerRow,
        design.numberOfRows,
        design.decreaseMethod
      ),
    [design]
  );

  const update = (changes: Partial<HatDesign>) =>
    setSearchParams(designToSearchParams({ ...design, ...changes }), {
      replace: true,
    });

  const updateOrientation = (changes: Partial<HatDesign["orientation"]>) =>
    update({ orientation: { ...design.orientation, ...changes } });

  const setCoordinates = (coordinates: GlobalCoordinates) =>
    updateOrientation({ coordinates });

  const handleLocationChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selected = e.target.value as LocationType;
    setLocationType(selected);
    setPlaceLabel(null);

    switch (selected) {
      case "North Pole":
        setCoordinates(northPole);
        break;
      case "South Pole":
        setCoordinates(southPole);
        break;
      case "Current Location":
        navigator.geolocation.getCurrentPosition((position) =>
          setCoordinates({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          })
        );
        break;
      case "Custom Location":
      default:
        break;
    }
  };

  const handleKnitAndDye = () => {
    if (problems.length > 0) {
      setShowProblems(true);
      // The crown rule lives under the extra options, so open them to show
      // where the fix is.
      setShowAdvancedOptions(true);
      return;
    }
    navigate(`/render?${params.toString()}`);
  };

  return (
    <PageLayout
      title="Design your hat"
      step="design"
      lede="Set the size, then choose which part of the Earth lands where."
    >
      <h2 className="design-section-heading">Size</h2>

      <SizeCalculator
        gauge={gauge}
        setGauge={setGauge}
        stitchesPerRow={design.stitchesPerRow}
        numberOfRows={design.numberOfRows}
        decreaseMethod={design.decreaseMethod}
        onSize={(stitchesPerRow, numberOfRows) => {
          setShowProblems(false);
          update({ stitchesPerRow, numberOfRows });
        }}
      />

      <div className="design-row">
        <InputField
          label="Stitches per row"
          value={design.stitchesPerRow}
          valueSetter={(stitchesPerRow) => update({ stitchesPerRow })}
          problem={
            showProblems ? problemFor(problems, "stitchesPerRow") : undefined
          }
        />
        <InputField
          label="Rows before the crown"
          value={design.numberOfRows}
          valueSetter={(numberOfRows) => update({ numberOfRows })}
          problem={
            showProblems ? problemFor(problems, "numberOfRows") : undefined
          }
        />
      </div>

      <ToggleAdvancedOptions
        showAdvancedOptions={showAdvancedOptions}
        setShowAdvancedOptions={setShowAdvancedOptions}
      />

      <div
        className={`advanced-panel ${
          showAdvancedOptions ? "advanced-panel-open" : "advanced-panel-closed"
        }`}
      >
        <h2 className="design-section-heading" style={{ marginTop: "22px" }}>
          Where on Earth
        </h2>

        <PlaceSearch
          onPick={(coordinates, place) => {
            setCoordinates(coordinates);
            setLocationType(locationTypeFor(coordinates));
            setPlaceLabel(`${place.name}, ${place.region}`);
          }}
        />

        <div className="design-field">
          <label>
            <span className="design-field-label">Or a preset</span>
            <select value={locationType} onChange={handleLocationChange}>
              <option value="North Pole">North Pole</option>
              <option value="South Pole">South Pole</option>
              <option value="Current Location">Where I am now</option>
              <option value="Custom Location">Somewhere else</option>
            </select>
          </label>
        </div>

        <CoordinatesInput
          coordinates={design.orientation.coordinates}
          setCoordinates={(coordinates) => {
            setCoordinates(coordinates);
            setLocationType(locationTypeFor(coordinates));
            setPlaceLabel(null);
          }}
        />

        {placeLabel && (
          <p className="design-hint" style={{ marginTop: "-8px" }}>
            Centred on {placeLabel}.
          </p>
        )}

        <div className="design-field">
          <label>
            <span className="design-field-label">
              Where should that point sit on the hat?
            </span>
            <select
              value={design.orientation.targetDestination}
              onChange={(e) =>
                updateOrientation({
                  targetDestination: e.target.value as DestinationType,
                })
              }
            >
              <option value="crown">At the crown</option>
              <option value="front">At the front</option>
              <option value="rim">At the rim</option>
            </select>
          </label>
        </div>

        <h2 className="design-section-heading" style={{ marginTop: "26px" }}>
          Shaping
        </h2>

        <div className="design-field">
          <label>
            <span className="design-field-label">Crown shape</span>
            <select
              value={design.decreaseMethod}
              onChange={(e) =>
                update({ decreaseMethod: e.target.value as DecreaseMethod })
              }
            >
              <option value="Pyramidal">Pyramidal</option>
              <option value="Hemispherical">Rounded</option>
            </select>
          </label>
          <div className="design-hint">
            A pyramidal crown decreases in straight lines and needs a stitch
            count divisible by ten. A rounded one takes any even count.
          </div>
        </div>

        <label
          style={{ display: "flex", alignItems: "center", gap: "8px" }}
        >
          <input
            type="checkbox"
            checked={design.orientation.displayNewZealand}
            onChange={(e) =>
              updateOrientation({ displayNewZealand: e.target.checked })
            }
          />
          Show New Zealand
        </label>
      </div>

      <div className="design-actions">
        <Button variant="primary" size="lg" onClick={handleKnitAndDye}>
          Knit and dye
        </Button>
        <ShareDesignLink />
      </div>
    </PageLayout>
  );
};

export default Design;
