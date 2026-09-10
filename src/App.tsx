import "./App.css";
import { HashRouter as Router, Route, Routes } from "react-router-dom";
import { useState } from "react";
import Home from "./components/Home";
import Design from "./components/Design";
import Render from "./components/Render";
import SavedRender from "./components/SavedRender";
import { Stitch } from "./types/Stitch";
import Pattern from "./components/Pattern";
import SavedPattern from "./components/SavedPattern";
import { defaultOrientationParameters } from "./types/OrientationParameters";

/**
 * The route components are all cheap and load eagerly. The weight is three.js
 * and Rapier, which sit behind the lazy boundary inside ChainModel/HatCanvas so
 * that the pages using them still render their own chrome instantly.
 */
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
            <Render
              stitches={stitches}
              setStitches={setStitches}
              orientationParameters={orientationParameters}
            />
          }
        />
        <Route path="/render/:patternId" element={<SavedRender />} />
        <Route path="/pattern" element={<Pattern stitches={stitches} />} />
        <Route path="/pattern/:patternId" element={<SavedPattern />} />
      </Routes>
    </Router>
  );
}

export default App;
