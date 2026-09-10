import React, { lazy, Suspense } from "react";
import { Stitch } from "../types/Stitch";
import { OrientationParameters } from "../types/OrientationParameters";

/**
 * The 3D stage, loaded on demand.
 *
 * Everything heavy lives behind this one boundary: the chunk itself (three.js
 * and Rapier) and Rapier's WASM initialisation, which suspends separately once
 * the chunk has arrived. Both are confined to the canvas box so the page around
 * it — title, status line, buttons — renders immediately and never unmounts.
 *
 * The placeholder is exactly the same height as the canvas, so nothing on the
 * page moves when it swaps in.
 */
const ChainModel = lazy(() => import("./ChainModel"));

export const hatCanvasHeight = 430;

interface HatCanvasProps {
  stitches: Stitch[];
  setStitches?: React.Dispatch<React.SetStateAction<Stitch[]>>;
  orientationParameters?: OrientationParameters;
  simulationActive: boolean;
  setSimulationActive?: React.Dispatch<React.SetStateAction<boolean>>;
  onAnyStitchRendered?: () => void;
  onDyeingComplete?: () => void;
}

const HatCanvas: React.FC<HatCanvasProps> = (props) => (
  <div style={{ height: `${hatCanvasHeight}px` }}>
    <Suspense fallback={null}>
      <ChainModel {...props} />
    </Suspense>
  </div>
);

export default HatCanvas;
