import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Stitch } from "../types/Stitch";
import KnittingPattern from "../KnittingPattern";
import ChartActions from "./ChartActions";
import ChartPrintSheet from "./ChartPrintSheet";
import YarnChoicesEditor from "./YarnChoices";
import WrittenInstructions from "./WrittenInstructions";
import PageLayout from "./ui/PageLayout";
import Button from "./ui/Button";
import NameDialog from "./ui/NameDialog";
import { bareIdFor, createPattern } from "../helpers/pattern-storage";
import { designFromSearchParams } from "../helpers/design-url";
import { readDyedHat } from "../helpers/design-session";
import { useYarns } from "../useYarns";

interface PatternProps {
  stitches: Stitch[];
}

const Pattern: React.FC<PatternProps> = ({ stitches }) => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { yarns, setYarns } = useYarns();
  const design = useMemo(
    () => designFromSearchParams(searchParams),
    [searchParams]
  );

  const [naming, setNaming] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);

  /*
   * A reload loses the hat held in memory, but the tab still remembers the one
   * that was dyed for this design. Derived rather than held in state: the
   * design can change under us without the component remounting, and a stale
   * copy would chart the previous hat under the new design's URL.
   */
  const restored = useMemo(
    () => (stitches.length === 0 ? readDyedHat(design) : undefined),
    [stitches.length, design]
  );

  const charted = stitches.length > 0 ? stitches : restored ?? [];

  useEffect(() => {
    if (charted.length > 0) return;
    // Nothing to chart and nothing remembered: send them back to the design
    // they asked for rather than to an empty homepage.
    navigate(`/design?${searchParams.toString()}`, { replace: true });
  }, [charted.length, navigate, searchParams]);

  if (charted.length === 0) {
    return null;
  }

  const save = (name: string) => {
    setNaming(false);
    const { result, pattern } = createPattern(charted, name);
    if (!result.ok) {
      setProblem(
        "This browser is out of storage. Delete a pattern from the home page and try again."
      );
      return;
    }
    navigate(`/pattern/${bareIdFor(pattern.id)}`);
  };

  return (
    <PageLayout
      title="Your chart"
      step="pattern"
      lede="Save it to tick stitches off as you knit, or take it away as a file."
    >
      <div className="screen-only">
        <KnittingPattern stitches={charted} progress={0} />
      </div>
      <ChartPrintSheet stitches={charted} title="Hat Pattern" />
      <ChartActions stitches={charted} name="hat-pattern" />
      <YarnChoicesEditor yarns={yarns} setYarns={setYarns} />
      <WrittenInstructions stitches={charted} />

      <div className="render-actions screen-only">
        <Button variant="primary" size="lg" onClick={() => setNaming(true)}>
          Save this pattern
        </Button>
        <Button
          variant="quiet"
          onClick={() => navigate(`/design?${searchParams.toString()}`)}
        >
          Change the design
        </Button>
        {problem && (
          <span role="alert" style={{ color: "var(--danger)", fontSize: "var(--text-sm)" }}>
            {problem}
          </span>
        )}
      </div>

      <NameDialog
        open={naming}
        title="Name this pattern"
        text="So you can find it again on the home page."
        initialValue="My Earth hat"
        onConfirm={save}
        onCancel={() => setNaming(false)}
      />
    </PageLayout>
  );
};

export default Pattern;
