import React, { useEffect, useRef, useState } from "react";

interface NumberFieldProps {
  value: number;
  onChange: (value: number) => void;
  label?: React.ReactNode;
  "aria-label"?: string;
  min?: number;
  max?: number;
  step?: number;
  width?: string;
  invalid?: boolean;
  id?: string;
}

/**
 * A number input you can actually edit.
 *
 * The obvious way to write one of these - render the number, and call
 * Number(event.target.value) on every keystroke - cannot be typed in. Clearing
 * the field gives an empty string, Number("") is 0, and the field snaps back
 * to "0"; replacing 57 with 60 then leaves you with "060", because the 0 you
 * could not delete is still sitting there.
 *
 * So the text being edited is kept as text, and only reported upwards when it
 * parses. An empty field stays empty while you are in it, and falls back to
 * the last good value when you leave.
 */
const NumberField: React.FC<NumberFieldProps> = ({
  value,
  onChange,
  label,
  min,
  max,
  step,
  width,
  invalid,
  id,
  "aria-label": ariaLabel,
}) => {
  const [draft, setDraft] = useState(String(value));
  const editing = useRef(false);

  // Follow the value from outside, but never yank the text out from under
  // someone who is mid-edit.
  useEffect(() => {
    if (editing.current) return;
    setDraft(String(value));
  }, [value]);

  const input = (
    <input
      id={id}
      type="number"
      inputMode="decimal"
      value={draft}
      min={min}
      max={max}
      step={step}
      aria-label={ariaLabel}
      aria-invalid={invalid ? true : undefined}
      className={invalid ? "design-invalid" : undefined}
      style={width ? { width } : undefined}
      onFocus={() => {
        editing.current = true;
      }}
      onChange={(event) => {
        const next = event.target.value;
        setDraft(next);
        // Report only what parses. An empty or half-typed value ("-", "1e")
        // leaves the last good number in place.
        if (next.trim() === "") return;
        const parsed = Number(next);
        if (Number.isFinite(parsed)) onChange(parsed);
      }}
      onBlur={() => {
        editing.current = false;
        const parsed = Number(draft);
        if (draft.trim() === "" || !Number.isFinite(parsed)) {
          setDraft(String(value));
          return;
        }
        setDraft(String(parsed));
      }}
    />
  );

  if (!label) return input;

  return (
    <label>
      <span className="design-field-label">{label}</span>
      {input}
    </label>
  );
};

export default NumberField;
