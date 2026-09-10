import "./App.css";
import "./KnittingPattern.css";
import { HashRouter as Router, Route, Routes } from "react-router-dom";
import { useState } from "react";
import Home from "./components/Home";
import Design from "./components/Design";
import Render from "./components/Render";
import SavedRender from "./components/SavedRender";
import { Stitch } from "./types/Stitch";
import { YarnProvider } from "./YarnContext";
import Pattern from "./components/Pattern";
import SavedPattern from "./components/SavedPattern";

/**
 * The design itself lives in the URL (see helpers/design-url), so a design can
 * be shared as a link and survives a refresh. The only thing held here is the
 * dyed hat, which is expensive to produce and is handed from the render page to
 * the chart page.
 *
 * The route components all load eagerly; the weight is three.js and Rapier,
 * which sit behind the lazy boundary in ChainModel/HatCanvas.
 */
function App() {
  const [stitches, setStitches] = useState<Stitch[]>([]);

  return (
    <YarnProvider>
      <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/design" element={<Design />} />
        <Route
          path="/render"
          element={<Render stitches={stitches} setStitches={setStitches} />}
        />
        <Route path="/render/:patternId" element={<SavedRender />} />
        <Route path="/pattern" element={<Pattern stitches={stitches} />} />
        <Route path="/pattern/:patternId" element={<SavedPattern />} />
      </Routes>
      </Router>
    </YarnProvider>
  );
}

export default App;
