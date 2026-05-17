import React, { createContext, useContext, useMemo } from "react";
import { TaurusClient, TaurusClientConfig } from "@taurusswap/sdk";

const TaurusContext = createContext<TaurusClient | null>(null);

export interface TaurusProviderProps {
  config?: TaurusClientConfig;
  children: React.ReactNode;
}

export function TaurusProvider({ config, children }: TaurusProviderProps) {
  const client = useMemo(() => new TaurusClient(config), []);
  return <TaurusContext.Provider value={client}>{children}</TaurusContext.Provider>;
}

export function useTaurusClient(): TaurusClient {
  const client = useContext(TaurusContext);
  if (!client) throw new Error("useTaurusClient must be used inside <TaurusProvider>");
  return client;
}
