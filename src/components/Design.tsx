import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getStitches } from "../helpers/stitches";
import { Stitch } from "../types/Stitch";
import {
  defaultNumberOfRows,
  defaultStitchesPerRow,
  northPole,
  southPole,
} from "../constants";
import DestinationType from "../types/DestinationType";
import { OrientationParameters } from "../types/OrientationParameters";
import {
  DecreaseMethod,
  DesignProblem,
  validateDesign,
} from "../types/KnittingMachine";

interface PatternProps {
  setStitches: React.Dispatch<React.SetStateAction<Stitch[]>>;
  orientationParameters: OrientationParameters;
  setOrientationParameters: React.Dispatch<
    React.SetStateAction<OrientationParameters>
  >;
}

interface InputFieldProps {
  label: string;
  value: number;
  valueSetter: (value: number) => void;
  problem?: string;
}

const InputField: React.FC<InputFieldProps> = ({
  label,
  value,
  valueSetter,
  problem,
}) => (
  <div style={{ marginBottom: "15px" }}>
    <label>
      {label}
      <br />
      <input
        type="number"
        value={value === 0 ? "" : value}
        onChange={(e) => valueSetter(Number(e.target.value))}
        aria-invalid={problem ? true : undefined}
        style={problem ? { outline: "2px solid #f44336" } : undefined}
      />
    </label>
    {problem && (
      <div
        role="alert"
        style={{ color: "#ff9a91", fontSize: "0.85rem", marginTop: "4px" }}
      >
        {problem}
      </div>
    )}
  </div>
);

interface CoordinatesInputProps {
  orientationParameters: OrientationParameters;
  setOrientationParameters: React.Dispatch<
    React.SetStateAction<OrientationParameters>
  >;
  disabled: boolean;
}

const CoordinatesInput: React.FC<CoordinatesInputProps> = ({
  orientationParameters,
  setOrientationParameters,
  disabled,
}) => {
  const { coordinates } = orientationParameters;
  const setLatitude = (latitude: number) =>
    setOrientationParameters({
      ...orientationParameters,
      coordinates: { ...coordinates, latitude },
    });
  const setLongitude = (longitude: number) =>
    setOrientationParameters({
      ...orientationParameters,
      coordinates: { ...coordinates, longitude },
    });
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "flex-start",
        alignItems: "baseline",
        marginBottom: "20px",
      }}
    >
      <label
        style={{
          marginRight: "20px",
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-start",
        }}
      >
        Latitude
        <input
          type="number"
          value={coordinates.latitude}
          min="-90"
          max="90"
          step="0.1"
          onChange={(e) => setLatitude(Number(e.target.value))}
          style={{ marginTop: "5px" }}
          disabled={disabled}
        />
      </label>
      <label
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-start",
        }}
      >
        Longitude
        <input
          type="number"
          value={coordinates.longitude}
          min="-180"
          max="180"
          step="0.1"
          onChange={(e) => setLongitude(Number(e.target.value))}
          style={{ marginTop: "5px" }}
          disabled={disabled}
        />
      </label>
    </div>
  );
};

type LocationType =
  | "North Pole"
  | "South Pole"
  | "Current Location"
  | "Custom Location";

const h1Style = {
  fontSize: "2.5rem",
  marginBottom: "10px",
};

const h2Style = {
  fontSize: "1.5rem",
  marginTop: "5px",
  marginBottom: "5px",
};

const h3Style = {
  fontSize: "1rem",
  marginTop: "5px",
  marginBottom: "5px",
};

interface ToggleAdvancedOptionsProps {
  showAdvancedOptions: boolean;
  setShowAdvancedOptions: React.Dispatch<React.SetStateAction<boolean>>;
}

const ToggleAdvancedOptions: React.FC<ToggleAdvancedOptionsProps> = ({
  showAdvancedOptions,
  setShowAdvancedOptions,
}) => (
  <button
    type="button"
    aria-expanded={showAdvancedOptions}
    style={{
      backgroundColor: "transparent",
      color: "white",
      padding: "10px 0",
      border: "none",
      cursor: "pointer",
      marginTop: "5px",
      marginBottom: "0px",
      display: "flex",
      alignItems: "center",
      fontSize: "1.25rem",
      fontWeight: 600,
      borderBottom: showAdvancedOptions ? "1px solid white" : "none",
      borderRadius: 0,
      width: "100%",
      textAlign: "left",
    }}
    onClick={() => setShowAdvancedOptions(!showAdvancedOptions)}
  >
    {showAdvancedOptions ? "Hide Advanced Options" : "Show Advanced Options"}
    <span
      aria-hidden="true"
      style={{
        marginLeft: "10px",
        transform: showAdvancedOptions ? "rotate(180deg)" : "rotate(0deg)",
        transition: "transform 0.3s",
      }}
    >
      ▼
    </span>
  </button>
);

const problemFor = (
  problems: DesignProblem[],
  field: DesignProblem["field"]
) => problems.find((problem) => problem.field === field)?.message;

const Design: React.FC<PatternProps> = ({
  setStitches,
  orientationParameters,
  setOrientationParameters,
}) => {
  const navigate = useNavigate();

  const [stitchesPerRow, setStitchesPerRow] = useState(defaultStitchesPerRow);
  const [numberOfRows, setNumberOfRows] = useState(defaultNumberOfRows);
  const [locationType, setLocationType] = useState<LocationType>("North Pole");
  const [decreaseMethod, setDecreaseMethod] =
    useState<DecreaseMethod>("Pyramidal");
  const [showAdvancedOptions, setShowAdvancedOptions] = useState(false);
  const [showProblems, setShowProblems] = useState(false);

  const problems = useMemo(
    () => validateDesign(stitchesPerRow, numberOfRows, decreaseMethod),
    [stitchesPerRow, numberOfRows, decreaseMethod]
  );

  const handleLocationChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedLocation = e.target.value;
    setLocationType(selectedLocation as LocationType);

    switch (selectedLocation) {
      case "North Pole":
        setOrientationParameters({
          ...orientationParameters,
          coordinates: northPole,
        });
        break;
      case "South Pole":
        setOrientationParameters({
          ...orientationParameters,
          coordinates: southPole,
        });
        break;
      case "Current Location":
        navigator.geolocation.getCurrentPosition((position) => {
          setOrientationParameters({
            ...orientationParameters,
            coordinates: {
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
            },
          });
        });
        break;
      case "Custom Location":
      default:
        break;
    }
  };

  const handleDestinationChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setOrientationParameters({
      ...orientationParameters,
      targetDestination: e.target.value as DestinationType,
    });
  };

  const handleViewAndColour = () => {
    if (problems.length > 0) {
      setShowProblems(true);
      // The pyramidal rule lives under advanced options, so open it to show
      // the user where the fix is.
      setShowAdvancedOptions(true);
      return;
    }
    setStitches(getStitches(stitchesPerRow, numberOfRows, decreaseMethod));
    navigate("/render");
  };

  return (
    <div style={{ textAlign: "left", padding: "20px" }}>
      <h1 style={h1Style}>Design</h1>
      <h2 style={h2Style}>Set Up Your Stitches</h2>
      <InputField
        label="Stitches per row"
        value={stitchesPerRow}
        valueSetter={setStitchesPerRow}
        problem={
          showProblems ? problemFor(problems, "stitchesPerRow") : undefined
        }
      />
      <InputField
        label="Number of rows before decreasing"
        value={numberOfRows}
        valueSetter={setNumberOfRows}
        problem={showProblems ? problemFor(problems, "numberOfRows") : undefined}
      />

      <div
        style={{
          overflow: "hidden",
          maxHeight: showAdvancedOptions ? "1000px" : "0",
          opacity: showAdvancedOptions ? 1 : 0,
          transition: "max-height 0.5s ease-in-out, opacity 0.5s ease-in-out",
        }}
      >
        <h2 style={h2Style}>Decrease Method</h2>
        <h3 style={h3Style}>Choose a Decrease Method</h3>
        <div style={{ marginBottom: "10px" }}>
          <select
            value={decreaseMethod}
            onChange={(e) =>
              setDecreaseMethod(e.target.value as DecreaseMethod)
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
        <CoordinatesInput
          orientationParameters={orientationParameters}
          setOrientationParameters={setOrientationParameters}
          disabled={locationType !== "Custom Location"}
        />
        <h3 style={h3Style}>Where Should This Point End Up?</h3>
        <div style={{ marginBottom: "10px" }}>
          <select
            value={orientationParameters.targetDestination}
            onChange={handleDestinationChange}
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
            checked={orientationParameters.displayNewZealand}
            onChange={(e) =>
              setOrientationParameters({
                ...orientationParameters,
                displayNewZealand: e.target.checked,
              })
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
        onClick={handleViewAndColour}
      >
        Knit and Dye
      </button>
    </div>
  );
};

export default Design;
