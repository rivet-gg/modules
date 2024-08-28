import { createContext } from "react";

export const BannerContext = createContext<{
  banner: HTMLDivElement | null;
}>({ banner: null });
