import React from "react";
import NumberField from "./ui/NumberField";

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
    <NumberField
      label={label}
      value={value}
      onChange={valueSetter}
      min={min}
      max={max}
      step={step}
      invalid={!!problem}
    />
    {hint && !problem && <div className="design-hint">{hint}</div>}
    {problem && (
      <div role="alert" className="design-problem">
        {problem}
      </div>
    )}
  </div>
);

export default InputField;
