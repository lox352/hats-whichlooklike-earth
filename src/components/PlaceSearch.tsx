import React, { useEffect, useId, useMemo, useRef, useState } from "react";
import { GlobalCoordinates } from "../types/GlobalCoordinates";
import { Place, searchPlaces } from "../helpers/place-search";

interface PlaceSearchProps {
  onPick: (coordinates: GlobalCoordinates, place: Place) => void;
}

const resultsStyle: React.CSSProperties = {
  listStyle: "none",
  margin: "4px 0 0",
  padding: 0,
  border: "1px solid #444",
  borderRadius: "4px",
  background: "#1a1a1a",
  maxWidth: "360px",
  overflow: "hidden",
};

/**
 * Find somewhere by name instead of typing coordinates.
 *
 * Searches the bundled gazetteer, so there is no network request and it works
 * offline. Implemented as a listbox with keyboard support, because picking
 * from a dropdown with the arrow keys is the normal way to use one of these.
 */
const PlaceSearch: React.FC<PlaceSearchProps> = ({ onPick }) => {
  const [query, setQuery] = useState("");
  const [highlighted, setHighlighted] = useState(0);
  const [open, setOpen] = useState(false);
  const listId = useId();
  const containerRef = useRef<HTMLDivElement>(null);

  const results = useMemo(() => searchPlaces(query), [query]);

  useEffect(() => setHighlighted(0), [query]);

  // Close when focus or a click goes elsewhere.
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [open]);

  const choose = (place: Place) => {
    onPick({ latitude: place.latitude, longitude: place.longitude }, place);
    setQuery(`${place.name}, ${place.region}`);
    setOpen(false);
  };

  const onKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setOpen(true);
      setHighlighted((current) =>
        results.length === 0 ? 0 : (current + 1) % results.length
      );
      return;
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      setHighlighted((current) =>
        results.length === 0
          ? 0
          : (current - 1 + results.length) % results.length
      );
      return;
    }
    if (event.key === "Enter") {
      const pick = results[highlighted];
      if (pick) {
        event.preventDefault();
        choose(pick);
      }
      return;
    }
    if (event.key === "Escape") {
      setOpen(false);
    }
  };

  const showResults = open && query.trim().length > 0;

  return (
    <div ref={containerRef} style={{ marginBottom: "15px", position: "relative" }}>
      <label style={{ display: "block" }}>
        Search for a place
        <br />
        <input
          type="text"
          value={query}
          placeholder="Wellington, Svalbard, Point Nemo..."
          role="combobox"
          aria-expanded={showResults}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={
            showResults && results[highlighted]
              ? `${listId}-${highlighted}`
              : undefined
          }
          onChange={(event) => {
            setQuery(event.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          style={{ marginTop: "5px", width: "320px", maxWidth: "100%" }}
        />
      </label>
      {showResults && (
        <ul id={listId} role="listbox" style={resultsStyle}>
          {results.length === 0 && (
            <li
              style={{ padding: "8px 10px", opacity: 0.7, fontSize: "0.9rem" }}
            >
              Nothing found. Try a city, country or ocean, or set the
              coordinates below.
            </li>
          )}
          {results.map((place, position) => (
            <li
              key={`${place.name}-${place.region}`}
              id={`${listId}-${position}`}
              role="option"
              aria-selected={position === highlighted}
              onMouseEnter={() => setHighlighted(position)}
              onMouseDown={(event) => {
                // Keep focus in the input so the blur handler does not fire
                // before the click registers.
                event.preventDefault();
                choose(place);
              }}
              style={{
                padding: "8px 10px",
                cursor: "pointer",
                background: position === highlighted ? "#2c3a6b" : "transparent",
                display: "flex",
                justifyContent: "space-between",
                gap: "12px",
                fontSize: "0.95rem",
              }}
            >
              <span>{place.name}</span>
              <span style={{ opacity: 0.65 }}>{place.region}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default PlaceSearch;
