import { createContext } from "react";
import { defaultYarns, YarnChoices } from "./helpers/yarn-preference";

export interface YarnContextValue {
  yarns: YarnChoices;
  setYarns: (yarns: YarnChoices) => void;
}

export const YarnContext = createContext<YarnContextValue>({
  yarns: defaultYarns(),
  setYarns: () => {},
});
