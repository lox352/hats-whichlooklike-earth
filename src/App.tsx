import "./App.css";
import { HashRouter as Router, Route, Routes } from "react-router-dom";
import { lazy, Suspense, useState } from "react";
import Home from "./components/Home";
import Design from "./components/Design";
import { Stitch } from "./types/Stitch";
import Pattern from "./components/Pattern";
import SavedPattern from "./components/SavedPattern";
import { defaultOrientationParameters } from "./types/OrientationParameters";

/**
 * The two 3D routes pull in three.js and Rapier, whose WASM alone is ~1.9MB
 * inlined. Loading them lazily keeps that off the homepage, the design form and
 * the chart, none of which render anything in 3D.
 */
const Render = lazy(() => import("./components/Render"));
const SavedRender = lazy(() => import("./components/SavedRender"));

const LoadingHat: React.FC = () => (
  <p style={{ textAlign: "left", padding: "20px", fontStyle: "italic" }}>
    Warming up the knitting needles...
  </p>
);

function App() {
  const [stitches, setStitches] = useState<Stitch[]>([]);
  const [orientationParameters, setOrientationParameters] = useState(
    defaultOrientationParameters
  );

  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route
          path="/design"
          element={
            <Design
              setStitches={setStitches}
              orientationParameters={orientationParameters}
              setOrientationParameters={setOrientationParameters}
            />
          }
        />
        <Route
          path="/render"
          element={
            <Suspense fallback={<LoadingHat />}>
              <Render
                stitches={stitches}
                setStitches={setStitches}
                orientationParameters={orientationParameters}
              />
            </Suspense>
          }
        />
        <Route
          path="/render/:patternId"
          element={
            <Suspense fallback={<LoadingHat />}>
              <SavedRender />
            </Suspense>
          }
        />
        <Route path="/pattern" element={<Pattern stitches={stitches} />} />
        <Route path="/pattern/:patternId" element={<SavedPattern />} />
      </Routes>
    </Router>
  );
}

export default App;
