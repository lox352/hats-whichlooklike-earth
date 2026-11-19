import React, { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { SavedPattern } from "../types/SavedPattern";
import {
  bareIdFor,
  deletePattern,
  listPatterns,
  patternsChangedEvent,
  renamePattern,
} from "../helpers/pattern-storage";
import { useHatKnitting } from "../knitting/useHatKnitting";
import { chartPath, patternPath, percentKnitted } from "../knitting/paths";
import { positionOf, totals, whereYouAre } from "../reading/progress";
import { useKnittingTime } from "../ui/useKnittingTime";
import { TimeLine } from "../ui/components/KnittingTime";
import MapThumb from "./MapThumb";
import PageLayout from "./ui/PageLayout";
import Button from "./ui/Button";
import Dialog from "./ui/Dialog";
import NameDialog from "./ui/NameDialog";
import { useReveal } from "../useReveal";
import "./Home.css";

const formatSavedAt = (savedAt: string) =>
  new Date(savedAt).toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

/** A section that rises into view the first time it is scrolled to. */
const RevealSection: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { ref, shown } = useReveal<HTMLElement>();
  return (
    <section ref={ref} className={`reveal${shown ? " reveal-shown" : ""}`}>
      {children}
    </section>
  );
};

const PatternCard: React.FC<{
  pattern: SavedPattern;
  onRename: () => void;
  onDelete: () => void;
}> = ({ pattern, onRename, onDelete }) => {
  const navigate = useNavigate();
  const { ref, shown } = useReveal<HTMLLIElement>();
  const reading = useHatKnitting(pattern.stitches);
  const position = positionOf(reading.stitches, pattern.progress, reading.index);
  const counts = totals(reading.index, pattern.progress);
  const time = useKnittingTime(pattern.id, reading.stitches, pattern.progress);
  const finished = position.finished;
  const started = counts.worked > 0;

  return (
    <li
      ref={ref}
      className={`pattern-card reveal${shown ? " reveal-shown" : ""}`}
    >
      {/* The map the hat is a picture of: a tap opens its page. */}
      <Link to={patternPath(pattern.id)} className="pattern-thumb" aria-label={`Open ${pattern.name ?? "this hat"}`}>
        <MapThumb hat={pattern.stitches} reading={reading} />
      </Link>
      <div className="pattern-card-head">
        <h3 className="pattern-name">
          <Link to={patternPath(pattern.id)}>{pattern.name ?? "Saved Pattern"}</Link>
        </h3>
        <div className="pattern-date">
          {finished
            ? "Finished"
            : started
              ? `${whereYouAre(position)} · ${percentKnitted(counts.worked, counts.percent)} knitted`
              : `Saved ${formatSavedAt(pattern.savedAt)}`}
        </div>
        <span className="pattern-track" aria-hidden="true">
          <span style={{ width: `${counts.percent}%` }} />
        </span>
        {time && <TimeLine time={time} finished={finished} className="pattern-time" />}
      </div>
      <div className="pattern-card-actions">
        {/* Straight into the knitting, rather than onto a page with another
            button on it saying the same thing. A finished hat is for looking
            at, so that one lands on its page. */}
        <Button
          variant="primary"
          onClick={() => navigate(finished ? patternPath(pattern.id) : chartPath(pattern.id, true))}
        >
          {finished ? "See it" : started ? "Keep knitting" : "Start knitting"}
        </Button>
        <Button variant="secondary" onClick={() => navigate(`/render/${bareIdFor(pattern.id)}`)}>
          See the hat
        </Button>
      </div>
      {/* Housekeeping, on its own line under the two things you came for. */}
      <div className="pattern-card-admin">
        <Button variant="quiet" onClick={onRename}>
          Rename
        </Button>
        <Button variant="quiet" onClick={onDelete}>
          Delete
        </Button>
      </div>
    </li>
  );
};

const Home: React.FC = () => {
  const navigate = useNavigate();
  // Lazy initialiser: reading localStorage on every render is wasted work.
  const [savedPatterns, setSavedPatterns] = useState<SavedPattern[]>(() =>
    listPatterns()
  );
  const [renaming, setRenaming] = useState<SavedPattern | null>(null);
  const [deleting, setDeleting] = useState<SavedPattern | null>(null);

  const refresh = useCallback(() => setSavedPatterns(listPatterns()), []);

  useEffect(() => {
    window.addEventListener(patternsChangedEvent, refresh);
    // `storage` fires when another tab writes, which the custom event misses.
    window.addEventListener("storage", refresh);

    return () => {
      window.removeEventListener(patternsChangedEvent, refresh);
      window.removeEventListener("storage", refresh);
    };
  }, [refresh]);

  return (
    <PageLayout
      title="Hats Which Look Like Earth"
      showTitle={false}
      aside={
        <span
          style={{
            fontSize: "var(--text-xs)",
            color: "var(--ink-faint)",
            letterSpacing: "0.09em",
            textTransform: "uppercase",
          }}
        >
          Knit the planet
        </span>
      }
    >
      {/* The masthead already carries the site name, so the hero is the pitch. */}
      <section className="hero">
        <div className="hero-graticule" aria-hidden="true" />
        <h1 className="hero-title">Knit the whole planet onto your head.</h1>
        <p className="hero-lede">
          Choose a point on Earth and how big your head is. The hat is knitted
          in a simulation, settles under its own weight, and every stitch takes
          the colour of whatever it lands on. You get a chart you can knit
          from.
        </p>
        <div className="hero-actions">
          <Button variant="primary" size="lg" onClick={() => navigate("/design")}>
            Begin
          </Button>
        </div>
      </section>

      <RevealSection>
        <h2 className="section-heading">Your hats</h2>
        {savedPatterns.length === 0 ? (
          <div className="empty-state">
            <p>
              Nothing saved yet. Patterns you save live in this browser, on this
              device, so they will be here when you come back, but they do not
              travel with you.
            </p>
          </div>
        ) : (
          <ul className="pattern-list">
            {savedPatterns.map((pattern) => (
              <PatternCard
                key={pattern.id}
                pattern={pattern}
                onRename={() => setRenaming(pattern)}
                onDelete={() => setDeleting(pattern)}
              />
            ))}
          </ul>
        )}
      </RevealSection>

      <NameDialog
        open={renaming !== null}
        title="Rename this pattern"
        initialValue={renaming?.name ?? "Saved Pattern"}
        onConfirm={(name) => {
          if (renaming) renamePattern(renaming.id, name);
          setRenaming(null);
        }}
        onCancel={() => setRenaming(null)}
      />

      <Dialog
        open={deleting !== null}
        title="Delete this pattern?"
        text={
          <>
            {deleting?.name ?? "This pattern"} will be gone for good. Saved
            patterns are only in this browser, so there is no copy elsewhere.
          </>
        }
        confirmLabel="Delete"
        confirmVariant="danger"
        onConfirm={() => {
          if (deleting) deletePattern(deleting.id);
          setDeleting(null);
        }}
        onCancel={() => setDeleting(null)}
      />
    </PageLayout>
  );
};

export default Home;
