import {
  type MutableRefObject,
  type ReactNode,
  createContext,
  useRef,
} from "react";

export const ModuleSearchContext =
  createContext<MutableRefObject<HTMLButtonElement | null> | null>(null);

export const ModuleSearchProvider = ({ children }: { children: ReactNode }) => {
  const ref = useRef<HTMLButtonElement | null>(null);

  return (
    <ModuleSearchContext.Provider value={ref}>
      {children}
    </ModuleSearchContext.Provider>
  );
};
