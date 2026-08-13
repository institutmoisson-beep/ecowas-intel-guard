import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

type RegionContextValue = {
  region: string;
  setRegion: (value: string) => void;
};

const RegionContext = createContext<RegionContextValue>({ region: "ALL", setRegion: () => {} });

export function RegionProvider({ children }: { children: ReactNode }) {
  const [region, setRegion] = useState("ALL");

  useEffect(() => {
    const stored = window.localStorage.getItem("isis:region");
    if (stored) setRegion(stored);
  }, []);

  useEffect(() => {
    window.localStorage.setItem("isis:region", region);
  }, [region]);

  return <RegionContext.Provider value={{ region, setRegion }}>{children}</RegionContext.Provider>;
}

export function useRegion() {
  return useContext(RegionContext);
}

export function inRegion(region: string, country: string | null | undefined) {
  return region === "ALL" || country === region;
}
