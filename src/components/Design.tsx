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
import { designFromSearchParams, designToSearchParams } from "../helpers/design-url";
import InputField from "./InputField";
import CoordinatesInput from "./CoordinatesInput";
import ToggleAdvancedOptions from "./ToggleAdvancedOptions";
import ShareDesignLink from "./ShareDesignLink";
import PlaceSearch from "./PlaceSearch";
import SizeCalculator from "./SizeCalculator";
import { Gauge } from "../helpers/sizing";
import { readGauge } from "../helpers/gauge-preference";

type LocationType =
  | "North Pole"
  | "South Pole"
  | "Current Location"
  | "Custom Location";

const h1Style = { fontSize: "2.5rem", marginBottom: "10px" };
const h2Style = { fontSize: "1.5rem", marginTop: "5px", marginBottom: "5px" };
const h3Style = { fontSize: "1rem", marginTop: "5px", marginBottom: "5px" };

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

  // Fill in a bare /design URL so it is shareable without having to touch a
  // field first. Replace rather than push, so editing does not fill the back
  // button with intermediate states.
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

  const updateOrientation = (
    changes: Partial<HatDesign["orientation"]>
  ) => update({ orientation: { ...design.orientation, ...changes } });

  const setCoordinates = (coordinates: GlobalCoordinates) =>
    updateOrientation({ coordinates });

  const handleLocationChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selected = e.target.value as LocationType;
    setLocationType(selected);

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
      // The decrease rule lives under advanced options, so open it to show
      // the user where the fix is.
      setShowAdvancedOptions(true);
      return;
    }
    navigate(`/render?${params.toString()}`);
  };

  return (
    <div style={{ textAlign: "left", padding: "20px" }}>
      <h1 style={h1Style}>Design</h1>
      <h2 style={h2Style}>Set Up Your Stitches</h2>
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
      <InputField
        label="Stitches per row"
        value={design.stitchesPerRow}
        valueSetter={(stitchesPerRow) => update({ stitchesPerRow })}
        problem={
          showProblems ? problemFor(problems, "stitchesPerRow") : undefined
        }
      />
      <InputField
        label="Number of rows before decreasing"
        value={design.numberOfRows}
        valueSetter={(numberOfRows) => update({ numberOfRows })}
        problem={showProblems ? problemFor(problems, "numberOfRows") : undefined}
      />

      <div
        style={{
          overflow: "hidden",
          maxHeight: showAdvancedOptions ? "1200px" : "0",
          opacity: showAdvancedOptions ? 1 : 0,
          transition: "max-height 0.5s ease-in-out, opacity 0.5s ease-in-out",
        }}
      >
        <h2 style={h2Style}>Decrease Method</h2>
        <h3 style={h3Style}>Choose a Decrease Method</h3>
        <div style={{ marginBottom: "10px" }}>
          <select
            value={design.decreaseMethod}
            onChange={(e) =>
              update({ decreaseMethod: e.target.value as DecreaseMethod })
            }
          >
            <option value="Hemispherical">Hemispherical</option>
            <option value="Pyramidal">Pyramidal</option>
          </select>
        </div>
        <h2 style={h2Style}>Orient Your Earth</h2>
        <h3 style={h3Style}>Choose a Location</h3>
        <div style={{ marginBottom: "10px" }}>
          <select value={locationType} onChange={handleLocationChange}>
            <option value="North Pole">North Pole</option>
            <option value="South Pole">South Pole</option>
            <option value="Current Location">Current Location</option>
            <option value="Custom Location">Custom Location</option>
          </select>
        </div>
        <PlaceSearch
          onPick={(coordinates) => {
            setCoordinates(coordinates);
            setLocationType(locationTypeFor(coordinates));
          }}
        />
        <CoordinatesInput
          coordinates={design.orientation.coordinates}
          setCoordinates={(coordinates) => {
            setCoordinates(coordinates);
            setLocationType(locationTypeFor(coordinates));
          }}
          disabled={false}
        />
        <h3 style={h3Style}>Where Should This Point End Up?</h3>
        <div style={{ marginBottom: "10px" }}>
          <select
            value={design.orientation.targetDestination}
            onChange={(e) =>
              updateOrientation({
                targetDestination: e.target.value as DestinationType,
              })
            }
          >
            <option value="crown">The crown (top) of your hat</option>
            <option value="front">The front of your hat</option>
            <option value="rim">The rim (bottom) of your hat</option>
          </select>
        </div>
        <h2 style={h2Style}>Final Touches</h2>
        <h3 style={h3Style}>Display New Zealand?</h3>
        <label>
          <input
            type="checkbox"
            checked={design.orientation.displayNewZealand}
            onChange={(e) =>
              updateOrientation({ displayNewZealand: e.target.checked })
            }
            style={{ marginRight: "5px" }}
          />
          Yes, display New Zealand
        </label>
      </div>
      <ToggleAdvancedOptions
        showAdvancedOptions={showAdvancedOptions}
        setShowAdvancedOptions={setShowAdvancedOptions}
      />
      <br />
      <button
        style={{
          backgroundColor: "#3f51b5",
          color: "white",
          padding: "10px 20px",
          border: "none",
          borderRadius: "4px",
          cursor: "pointer",
        }}
        onClick={handleKnitAndDye}
      >
        Knit and Dye
      </button>
      <ShareDesignLink />
    </div>
  );
};

export default Design;
