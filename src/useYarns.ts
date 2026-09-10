import { useContext } from "react";
import { YarnContext, YarnContextValue } from "./yarn-context";

/** The knitter's yarn names and shades. See YarnProvider. */
export const useYarns = (): YarnContextValue => useContext(YarnContext);
