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
  <div className="design-field">
    <label>
      <span className="design-field-label">{label}</span>
      <input
        type="number"
        value={value === 0 ? "" : value}
        min={min}
        max={max}
        step={step}
        onChange={(e) => valueSetter(Number(e.target.value))}
        aria-invalid={problem ? true : undefined}
        className={problem ? "design-invalid" : undefined}
      />
    </label>
    {hint && !problem && <div className="design-hint">{hint}</div>}
    {problem && (
      <div role="alert" className="design-problem">
        {problem}
      </div>
    )}
  </div>
);

export default InputField;
