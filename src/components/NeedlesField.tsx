import React from "react";
import { needleSizes } from "../helpers/brim";

/**
 * A needle size, chosen from the sizes needles are sold in. A size from a
 * link that is none of them is offered as it is, so it is never silently
 * changed.
 */
const NeedlesField: React.FC<{
  label: string;
  value: number;
  onChange: (millimetres: number) => void;
}> = ({ label, value, onChange }) => {
  const sizes = needleSizes.includes(value)
    ? needleSizes
    : [...needleSizes, value].sort((a, b) => a - b);
  return (
    <div className="design-field">
      <label>
        <span className="design-field-label">{label}</span>
        <select
          value={String(value)}
          onChange={(e) => onChange(Number(e.target.value))}
        >
          {sizes.map((size) => (
            <option key={size} value={String(size)}>
              {size}mm
            </option>
          ))}
        </select>
      </label>
    </div>
  );
};

export default NeedlesField;
