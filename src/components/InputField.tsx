import React from "react";

interface InputFieldProps {
  label: string;
  value: number;
  valueSetter: (value: number) => void;
  problem?: string;
  hint?: React.ReactNode;
  min?: number;
  max?: number;
  step?: number;
}

const InputField: React.FC<InputFieldProps> = ({
  label,
  value,
  valueSetter,
  problem,
  hint,
  min,
  max,
  step,
}) => (
  <div style={{ marginBottom: "15px" }}>
    <label>
      {label}
      <br />
      <input
        type="number"
        value={value === 0 ? "" : value}
        min={min}
        max={max}
        step={step}
        onChange={(e) => valueSetter(Number(e.target.value))}
        aria-invalid={problem ? true : undefined}
        style={problem ? { outline: "2px solid #f44336" } : undefined}
      />
    </label>
    {hint && !problem && (
      <div style={{ fontSize: "0.85rem", opacity: 0.7, marginTop: "4px" }}>
        {hint}
      </div>
    )}
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

export default InputField;
