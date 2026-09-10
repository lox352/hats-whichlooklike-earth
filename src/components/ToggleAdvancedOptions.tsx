import React from "react";

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
    className={`advanced-toggle${showAdvancedOptions ? " advanced-open" : ""}`}
    onClick={() => setShowAdvancedOptions(!showAdvancedOptions)}
  >
    {showAdvancedOptions ? "Fewer options" : "More options"}
    <span className="advanced-caret" aria-hidden="true">
      ▼
    </span>
  </button>
);

export default ToggleAdvancedOptions;
