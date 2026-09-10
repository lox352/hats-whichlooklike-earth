import React, { useEffect, useId, useMemo, useRef, useState } from "react";
import { GlobalCoordinates } from "../types/GlobalCoordinates";
import { Place, searchPlaces } from "../helpers/place-search";

interface PlaceSearchProps {
  onPick: (coordinates: GlobalCoordinates, place: Place) => void;
}

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
    <div ref={containerRef} className="place-search">
      <label>
        <span className="design-field-label">Search for a place</span>
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
          className="place-input"
        />
      </label>
      {showResults && (
        <ul id={listId} role="listbox" className="place-results">
          {results.length === 0 && (
            <li className="place-empty">
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
              className={`place-option${
                position === highlighted ? " place-option-active" : ""
              }`}
            >
              <span>{place.name}</span>
              <span className="place-option-region">{place.region}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default PlaceSearch;
