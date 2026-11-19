import React, { useMemo, useState } from "react";
import { Link, Navigate, useNavigate, useParams, useSearchParams } from "react-router-dom";
import type { SavedPattern as Pattern } from "../types/SavedPattern";
import { deletePattern, knittingParam, renamePattern } from "../helpers/pattern-storage";
import { useSavedPattern } from "../knitting/useSavedPattern";
import { useHatKnitting, type HatReading } from "../knitting/useHatKnitting";
import { hatPiece } from "../knitting/hat-knitting";
import { hatStitchNotes } from "../knitting/notes";
import { aboutMetres, woolNeeded } from "../knitting/wool";
import { positionOf, totals, whereYouAre } from "../reading/progress";
import { yarnFor } from "../reading/palette";
import Chart from "../ui/chart/Chart";
import { TimeFigures } from "../ui/components/KnittingTime";
import { useKnittingTime } from "../ui/useKnittingTime";
import { chartPath, percentKnitted, statsParam } from "../knitting/paths";
import ChartActions from "./ChartActions";
import ChartPrintSheet from "./ChartPrintSheet";
import YarnChoicesEditor from "./YarnChoices";
import WrittenInstructions from "./WrittenInstructions";
import RegionIndex from "./RegionIndex";
import FinishedBanner from "./FinishedBanner";
import PageLayout from "./ui/PageLayout";
import Button from "./ui/Button";
import Dialog from "./ui/Dialog";
import NameDialog from "./ui/NameDialog";
import { useYarns } from "../useYarns";
import "./KnitScreen.css";
import "./SavedPattern.css";

/**
 * A saved hat: how far it is knitted and how long that took, where the
 * knitting is on the chart, the wool it takes, and the way back to the
 * needles - which is the one thing in the bar along the foot.
 *
 * The chart itself, and the knitting, are a page of their own (KnitChart):
 * the chart there fills the screen, as it needs to on a phone.
 */
const SavedPattern: React.FC = () => {
  const { patternId } = useParams();
  const [params] = useSearchParams();
  const { pattern } = useSavedPattern(patternId);
  const navigate = useNavigate();

  if (!pattern) {
    return (
      <PageLayout title="Pattern not found">
        <p>
          This pattern is no longer saved in this browser. Saved patterns live
          only on the device that made them.
        </p>
        <Button variant="primary" onClick={() => navigate("/")}>
          Back to your hats
        </Button>
      </PageLayout>
    );
  }

  // Knitting happens on the chart's own page; an old link that asked for it here is sent there.
  if (params.get(knittingParam) === "1") return <Navigate to={chartPath(pattern.id, true)} replace />;

  return <HatPage pattern={pattern} />;
};

/** Each yarn: what it is called, how many stitches it knits, and about how much of it to have. */
const WoolTable: React.FC<{ reading: HatReading }> = ({ reading }) => {
  const wool = useMemo(() => woolNeeded(reading.stitches, reading.rounds), [reading.stitches, reading.rounds]);
  return (
    <ul className="wool-table">
      {wool.map(({ slot, stitches, metres }) => {
        const yarn = yarnFor(reading.palette, slot);
        return (
          <li key={slot}>
            <span className="wool-swatch" style={{ background: yarn.hex }} aria-hidden="true">
              {slot.length === 1 ? slot : ""}
            </span>
            <span className="wool-name">
              <strong>{yarn.name}</strong>
              <span className="quiet">{stitches.toLocaleString()} stitches</span>
            </span>
            <span className="wool-metres">{aboutMetres(metres)}</span>
          </li>
        );
      })}
    </ul>
  );
};

const HatPage: React.FC<{ pattern: Pattern }> = ({ pattern }) => {
  const navigate = useNavigate();
  const { yarns, setYarns } = useYarns();
  const reading = useHatKnitting(pattern.stitches);
  const { knitting, stitches, rounds, index, layout, palette, names, whats } = reading;
  const position = positionOf(stitches, pattern.progress, index);
  const counts = totals(index, pattern.progress);
  const time = useKnittingTime(pattern.id, stitches, pattern.progress);
  const [renaming, setRenaming] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const name = pattern.name ?? "Saved Pattern";
  const finished = position.finished;
  const where = finished ? "Finished" : whereYouAre(position);
  const percent = finished ? "100%" : percentKnitted(counts.worked, counts.percent);

  return (
    <PageLayout
      title={name}
      step="pattern"
      lede={`Cast on ${index.rounds[0]?.length ?? 0}, and knitted ${index.totalRounds} rounds to the crown: ${counts.total.toLocaleString()} stitches in all.`}
      className="hat-page"
    >
      {finished && <FinishedBanner stitches={counts.total} />}

      <div className="hat-sections screen-only">
        <section className="hat-section hat-progress" aria-label="Your progress">
          <p className="hat-progress-figure">
            <em>{percent}</em>
            <span className="quiet">
              {counts.worked.toLocaleString()} of {counts.total.toLocaleString()} stitches
              {finished ? "" : ` · ${counts.remaining.toLocaleString()} to go`}
            </span>
            <span className="hat-track" aria-hidden="true">
              <span style={{ width: `${counts.percent}%` }} />
            </span>
          </p>
          {/* The chart where the knitting is, to say where that is; the whole of it is a tap away. */}
          <Link to={chartPath(pattern.id)} className="chart-window" aria-label="Look around the chart">
            <div className="chart-fills" {...{ inert: "" }}>
              <section className="chart-page">
                <Chart
                  stitches={stitches}
                  rounds={rounds}
                  layout={layout}
                  palette={palette}
                  progress={pattern.progress}
                  follow
                  labels={whats}
                  names={names}
                  stitchNotes={hatStitchNotes}
                  pieces={[hatPiece]}
                  kinds={knitting.roundKinds}
                  roundPieces={knitting.roundPieces}
                />
              </section>
            </div>
            <span className="chart-window-label">
              <strong>{where}</strong>
              <span className="quiet">Look around the chart</span>
            </span>
          </Link>
          {time ? (
            <>
              <dl className="hat-figures">
                <TimeFigures time={time} finished={finished} />
              </dl>
              <p className="hat-more">
                <Link to={`${chartPath(pattern.id)}?${statsParam}=1`}>See your time on the chart</Link>
              </p>
            </>
          ) : (
            <p className="quiet hat-more">
              Knit from the chart and it keeps time for you: how long the hat
              has taken, and once there is enough to go on, how long it has left.
            </p>
          )}
        </section>

        <section className="hat-section" aria-labelledby="wool-heading">
          <h2 id="wool-heading" className="hat-section-title">
            Wool
          </h2>
          <WoolTable reading={reading} />
          <p className="quiet hat-small">
            Estimated from the stitches for double knitting, with a tenth more
            for tails and tension: enough to buy by, not a promise.
          </p>
          <YarnChoicesEditor yarns={yarns} setYarns={setYarns} />
        </section>

        <section className="hat-section" aria-labelledby="more-heading">
          <h2 id="more-heading" className="hat-section-title">
            The pattern
          </h2>
          <RegionIndex stitches={pattern.stitches} />
          <WrittenInstructions stitches={pattern.stitches} />
          <ChartActions stitches={pattern.stitches} name={name} />
          <div className="hat-manage">
            <Button variant="quiet" onClick={() => navigate(`/render/${pattern.id.replace(/^pattern-/, "")}`)}>
              See the hat
            </Button>
            <Button variant="quiet" onClick={() => setRenaming(true)}>
              Rename
            </Button>
            <Button variant="quiet" onClick={() => setDeleting(true)}>
              Delete
            </Button>
          </div>
        </section>
      </div>

      <section className="stage-bar hat-bar screen-only" aria-label="Knit">
        <div className="stage-bar-text">
          <strong>{where}</strong>
          <span className="quiet">{percent} knitted</span>
        </div>
        <Button variant="primary" onClick={() => navigate(chartPath(pattern.id, !finished))}>
          {finished ? "See the chart" : counts.worked > 0 ? "Keep knitting" : "Start knitting"}
        </Button>
      </section>

      <ChartPrintSheet stitches={pattern.stitches} title={name} />

      <NameDialog
        open={renaming}
        title="Rename this pattern"
        initialValue={name}
        onConfirm={(next) => {
          renamePattern(pattern.id, next);
          setRenaming(false);
        }}
        onCancel={() => setRenaming(false)}
      />
      <Dialog
        open={deleting}
        title="Delete this pattern?"
        text={
          <>
            {name} will be gone for good, and the time it took with it. Saved
            patterns are only in this browser, so there is no copy elsewhere.
          </>
        }
        confirmLabel="Delete"
        confirmVariant="danger"
        onConfirm={() => {
          deletePattern(pattern.id);
          navigate("/");
        }}
        onCancel={() => setDeleting(false)}
      />
    </PageLayout>
  );
};

export default SavedPattern;
