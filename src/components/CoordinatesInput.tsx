import React from "react";
import { GlobalCoordinates } from "../types/GlobalCoordinates";

interface CoordinatesInputProps {
  coordinates: GlobalCoordinates;
  setCoordinates: (coordinates: GlobalCoordinates) => void;
  disabled?: boolean;
}

const CoordinatesInput: React.FC<CoordinatesInputProps> = ({
  coordinates,
  setCoordinates,
  disabled = false,
}) => (
  <div className="design-row">
    <label>
      <span className="design-field-label">Latitude</span>
      <input
        type="number"
        value={coordinates.latitude}
        min="-90"
        max="90"
        step="0.1"
        onChange={(e) =>
          setCoordinates({ ...coordinates, latitude: Number(e.target.value) })
        }
        disabled={disabled}
      />
    </label>
    <label>
      <span className="design-field-label">Longitude</span>
      <input
        type="number"
        value={coordinates.longitude}
        min="-180"
        max="180"
        step="0.1"
        onChange={(e) =>
          setCoordinates({ ...coordinates, longitude: Number(e.target.value) })
        }
        disabled={disabled}
      />
    </label>
  </div>
);

export default CoordinatesInput;
