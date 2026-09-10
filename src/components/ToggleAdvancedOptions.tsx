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

export default ToggleAdvancedOptions;
