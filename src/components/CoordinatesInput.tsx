import React from "react";
import { GlobalCoordinates } from "../types/GlobalCoordinates";

interface CoordinatesInputProps {
  coordinates: GlobalCoordinates;
  setCoordinates: (coordinates: GlobalCoordinates) => void;
  disabled: boolean;
}

const labelStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  alignItems: "flex-start",
  marginRight: "20px",
};

const CoordinatesInput: React.FC<CoordinatesInputProps> = ({
  coordinates,
  setCoordinates,
  disabled,
}) => (
  <div
    style={{
      display: "flex",
      justifyContent: "flex-start",
      alignItems: "baseline",
      marginBottom: "20px",
    }}
  >
    <label style={labelStyle}>
      Latitude
      <input
        type="number"
        value={coordinates.latitude}
        min="-90"
        max="90"
        step="0.1"
        onChange={(e) =>
          setCoordinates({ ...coordinates, latitude: Number(e.target.value) })
        }
        style={{ marginTop: "5px" }}
        disabled={disabled}
      />
    </label>
    <label style={{ ...labelStyle, marginRight: 0 }}>
      Longitude
      <input
        type="number"
        value={coordinates.longitude}
        min="-180"
        max="180"
        step="0.1"
        onChange={(e) =>
          setCoordinates({ ...coordinates, longitude: Number(e.target.value) })
        }
        style={{ marginTop: "5px" }}
        disabled={disabled}
      />
    </label>
  </div>
);

export default CoordinatesInput;
