import React, { useMemo, useState } from "react";
import { readYarns, YarnChoices } from "./helpers/yarn-preference";
import { YarnContext } from "./yarn-context";

/**
 * Holds the knitter's yarn names and shades.
 *
 * A context rather than props because the mapping is needed in three unrelated
 * places (the chart, the printed key, the knitting panel) and is not part of
 * the pattern data those components render.
 */
export const YarnProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [yarns, setYarns] = useState<YarnChoices>(() => readYarns());
  const value = useMemo(() => ({ yarns, setYarns }), [yarns]);
  return <YarnContext.Provider value={value}>{children}</YarnContext.Provider>;
};
