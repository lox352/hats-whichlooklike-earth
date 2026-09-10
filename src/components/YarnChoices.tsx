import React, { useState } from "react";
import { RGB } from "../types/RGB";
import {
  clearYarns,
  cssColour,
  defaultYarns,
  earthColours,
  writeYarns,
  YarnChoices as Choices,
} from "../helpers/yarn-preference";

interface YarnChoicesProps {
  yarns: Choices;
  setYarns: (yarns: Choices) => void;
}

const hexOf = (colour: RGB) =>
  `#${colour.map((c) => c.toString(16).padStart(2, "0")).join("")}`;

const rgbOf = (hex: string): RGB => {
  const value = hex.replace("#", "");
  return [
    parseInt(value.slice(0, 2), 16) || 0,
    parseInt(value.slice(2, 4), 16) || 0,
    parseInt(value.slice(4, 6), 16) || 0,
  ];
};

/**
 * Name the yarns you are actually knitting with.
 *
 * This only changes how the pattern is shown and described, never how it is
 * generated: the earth's colours pick the stitches, and this decides what to
 * call them and what shade to draw them.
 */
const YarnChoices: React.FC<YarnChoicesProps> = ({ yarns, setYarns }) => {
  const [open, setOpen] = useState(false);

  const update = (key: string, changes: Partial<Choices[string]>) => {
    const next = { ...yarns, [key]: { ...yarns[key], ...changes } };
    setYarns(next);
    writeYarns(next);
  };

  const reset = () => {
    const defaults = defaultYarns();
    setYarns(defaults);
    clearYarns();
  };

  return (
    <div className="screen-only" style={{ marginTop: "14px" }}>
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
        style={{
          background: "none",
          border: "none",
          padding: 0,
          color: "#9fb6ff",
          cursor: "pointer",
          font: "inherit",
          fontSize: "0.9rem",
          textDecoration: "underline",
        }}
      >
        {open ? "Hide your yarns" : "Your yarns"}
      </button>

      {open && (
        <div
          style={{
            border: "1px solid #333",
            borderRadius: "6px",
            padding: "12px 14px",
            marginTop: "10px",
            maxWidth: "560px",
          }}
        >
          <p style={{ fontSize: "0.85rem", opacity: 0.7, margin: "0 0 12px" }}>
            Name the yarns you are using and set them to their real shades. This
            changes the chart and the key only; which stitches are land and
            which are sea is decided by the earth, not by this.
          </p>
          {earthColours.map(({ key, label }) => (
            <div
              key={key}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                marginBottom: "8px",
                flexWrap: "wrap",
              }}
            >
              <span
                style={{
                  width: "70px",
                  fontSize: "0.8rem",
                  opacity: 0.6,
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                }}
              >
                {label}
              </span>
              <input
                type="color"
                aria-label={`Colour for ${label}`}
                value={hexOf(yarns[key].colour)}
                onChange={(e) => update(key, { colour: rgbOf(e.target.value) })}
                style={{
                  width: "38px",
                  height: "30px",
                  padding: 0,
                  border: "1px solid #444",
                  borderRadius: "4px",
                  background: "none",
                }}
              />
              <input
                type="text"
                aria-label={`Name for ${label}`}
                value={yarns[key].name}
                maxLength={40}
                onChange={(e) => update(key, { name: e.target.value })}
                style={{ width: "180px", maxWidth: "50%" }}
              />
              <span
                aria-hidden="true"
                style={{
                  width: "18px",
                  height: "18px",
                  borderRadius: "3px",
                  border: "1px solid rgba(255,255,255,0.3)",
                  backgroundColor: cssColour(yarns[key].colour),
                }}
              />
            </div>
          ))}
          <button
            type="button"
            onClick={reset}
            style={{
              background: "none",
              border: "none",
              padding: 0,
              color: "#9fb6ff",
              cursor: "pointer",
              font: "inherit",
              fontSize: "0.85rem",
              textDecoration: "underline",
              marginTop: "4px",
            }}
          >
            Back to the earth's own colours
          </button>
        </div>
      )}
    </div>
  );
};

export default YarnChoices;
