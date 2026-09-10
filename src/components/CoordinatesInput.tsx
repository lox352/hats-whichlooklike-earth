import React from "react";
import { GlobalCoordinates } from "../types/GlobalCoordinates";
import NumberField from "./ui/NumberField";

interface CoordinatesInputProps {
  coordinates: GlobalCoordinates;
  setCoordinates: (coordinates: GlobalCoordinates) => void;
  disabled?: boolean;
}

const CoordinatesInput: React.FC<CoordinatesInputProps> = ({
  coordinates,
  setCoordinates,
}) => (
  <div className="design-row">
    <NumberField
      label="Latitude"
      value={coordinates.latitude}
      onChange={(latitude) => setCoordinates({ ...coordinates, latitude })}
      min={-90}
      max={90}
      step={0.1}
    />
    <NumberField
      label="Longitude"
      value={coordinates.longitude}
      onChange={(longitude) => setCoordinates({ ...coordinates, longitude })}
      min={-180}
      max={180}
      step={0.1}
    />
  </div>
);

export default CoordinatesInput;
